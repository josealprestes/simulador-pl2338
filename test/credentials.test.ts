import { describe, it, expect, beforeEach } from "vitest";
import {
  getAIProviderConfig,
  saveAIProviderConfig,
  migrateLegacyApiKey,
  clearApiKey,
  hasApiKey,
} from "../src/lib/aiConfigStorage";

/** Storage em memória para simular localStorage/sessionStorage. */
class MemoryStorage {
  private data = new Map<string, string>();
  getItem(key: string): string | null {
    return this.data.has(key) ? this.data.get(key)! : null;
  }
  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
  removeItem(key: string): void {
    this.data.delete(key);
  }
  clear(): void {
    this.data.clear();
  }
}

function installStorage(): { ls: MemoryStorage; ss: MemoryStorage } {
  const ls = new MemoryStorage();
  const ss = new MemoryStorage();
  (globalThis as Record<string, unknown>).localStorage = ls;
  (globalThis as Record<string, unknown>).sessionStorage = ss;
  return { ls, ss };
}

describe("segurança de credenciais", () => {
  beforeEach(() => {
    installStorage();
  });

  it("salvar configuração não grava apiKey no localStorage", () => {
    const { ls, ss } = installStorage();
    saveAIProviderConfig(
      { providerId: "custom", endpoint: "https://api.example.com/v1", model: "m1" },
      "sk-secreta-123",
    );
    const raw = ls.getItem("aiProviderConfig")!;
    expect(raw).not.toContain("sk-secreta-123");
    expect(raw).not.toContain("apiKey");
    // A chave fica no sessionStorage da sessão.
    expect(ss.getItem("aiProviderApiKey")).toBe("sk-secreta-123");
  });

  it("leitura devolve a chave do sessionStorage", () => {
    const { ls, ss } = installStorage();
    ls.setItem("aiProviderConfig", JSON.stringify({ providerId: "ollama", endpoint: "http://localhost:11434", model: "x" }));
    ss.setItem("aiProviderApiKey", "chave-da-sessao");
    const config = getAIProviderConfig();
    expect(config?.apiKey).toBe("chave-da-sessao");
    expect(config?.providerId).toBe("ollama");
  });

  it("configuração não sensível continua persistente sem chave", () => {
    const { ls } = installStorage();
    saveAIProviderConfig({ providerId: "ollama", endpoint: "http://localhost:11434", model: "llama3" });
    expect(ls.getItem("aiProviderConfig")).toContain("ollama");
    expect(getAIProviderConfig()?.apiKey).toBe("");
  });

  it("migração move chave antiga do localStorage e remove a cópia residual", () => {
    const { ls, ss } = installStorage();
    ls.setItem("aiProviderConfig", JSON.stringify({ providerId: "custom", endpoint: "e", model: "m", apiKey: "chave-antiga" }));
    migrateLegacyApiKey();
    expect(ls.getItem("aiProviderConfig")).not.toContain("chave-antiga");
    expect(ls.getItem("aiProviderConfig")).not.toContain("apiKey");
    expect(ss.getItem("aiProviderApiKey")).toBe("chave-antiga");
  });

  it("remoção de credencial funciona", () => {
    const { ss } = installStorage();
    ss.setItem("aiProviderApiKey", "x");
    expect(hasApiKey()).toBe(true);
    clearApiKey();
    expect(hasApiKey()).toBe(false);
    expect(ss.getItem("aiProviderApiKey")).toBeNull();
  });

  it("Ollama local continua funcionando sem chave", () => {
    const { ls } = installStorage();
    ls.setItem("aiProviderConfig", JSON.stringify({ providerId: "ollama", endpoint: "http://localhost:11434", model: "llama3" }));
    const config = getAIProviderConfig();
    expect(config?.apiKey).toBe("");
    expect(config?.endpoint).toContain("localhost");
  });
});
