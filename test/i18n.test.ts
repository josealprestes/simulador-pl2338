import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import pt from "../src/locales/pt-BR/common.js";
import en from "../src/locales/en/common.js";

/** Achata o objeto de traduções em chaves "a.b.c". */
function flattenKeys(obj: Record<string, unknown>, prefix = ""): Set<string> {
  const out = new Set<string>();
  for (const [k, v] of Object.entries(obj)) {
    const p = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      for (const sub of flattenKeys(v as Record<string, unknown>, p)) out.add(sub);
    } else {
      out.add(p);
    }
  }
  return out;
}

function walk(dir: string, acc: string[] = []): string[] {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p, acc);
    else if (/\.(ts|tsx)$/.test(f) && !p.includes("/test/")) acc.push(p);
  }
  return acc;
}

function keyValue(obj: unknown, path: string): unknown {
  let node: unknown = obj;
  for (const part of path.split(".")) {
    if (node && typeof node === "object" && part in (node as Record<string, unknown>)) {
      node = (node as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return node;
}

/** Termos neutros (nomes próprios/termos internacionais) podem ser idênticos. */
const NEUTRAL_RE = /^[A-Za-z0-9©®™À-ÿÇç ()\-–—.,:;%…]*$/;

describe("§8.4 — paridade estrutural de traduções (pt-BR ↔ en)", () => {
  const ptKeys = flattenKeys(pt as Record<string, unknown>);
  const enKeys = flattenKeys(en as Record<string, unknown>);

  it("todas as chaves de pt-BR existem em en (paridade estrutural)", () => {
    const missing = [...ptKeys].filter((k) => !enKeys.has(k));
    expect(missing).toEqual([]);
  });

  it("todas as chaves de en existem em pt-BR (sem chaves órfãs)", () => {
    const missing = [...enKeys].filter((k) => !ptKeys.has(k));
    expect(missing).toEqual([]);
  });

  it("toda chave usada via t(\"...\") existe nos dois idiomas", () => {
    const code = walk("src").map((f) => readFileSync(f, "utf8")).join("\n");
    const used = new Set(
      [...code.matchAll(/\bt\("([A-Za-z][A-Za-z0-9_.-]*)"\s*[,)]/g)].map((m) => m[1]),
    );
    const missingPt = [...used].filter((k) => !ptKeys.has(k));
    const missingEn = [...used].filter((k) => !enKeys.has(k));
    expect(missingPt).toEqual([]);
    expect(missingEn).toEqual([]);
  });

  it("chaves ativas da UI não permanecem com texto pt (exceto termos neutros)", () => {
    const activePrefixes = [
      "nav.", "common.", "home.", "setup.", "config.", "simulation.", "result.",
      "report.", "aiConfig.", "dialog.", "dashboard.", "stats.", "comparison.",
      "charts.", "history.", "errors.", "hero_subtitle", "app_title",
    ];
    for (const k of ptKeys) {
      if (!activePrefixes.some((p) => k.startsWith(p))) continue;
      const enVal = keyValue(en, k);
      const ptVal = keyValue(pt, k);
      if (typeof enVal !== "string" || typeof ptVal !== "string") continue;
      if (enVal === ptVal) {
        // Idênticos só são aceitáveis para termos neutros (ex.: "API Key").
        expect(NEUTRAL_RE.test(ptVal) ? `neutro:${k}` : `pt-herdada:${k}`).toBe(
          `neutro:${k}`,
        );
      }
    }
  });
});
