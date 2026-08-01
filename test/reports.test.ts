import { describe, it, expect, vi } from "vitest";
import {
  buildReportTitle,
  buildCountTrendLabel,
  buildStartupTrendLabel,
  buildTrustTrendLabel,
  buildPrivacyNotice,
  buildDocxCoverText,
  buildReportMetadata,
  buildSourceNarrative,
} from "../src/lib/reportBuilders";
import {
  describeCapitalConcentration,
  describeTrustTrajectory,
  describeStartupTrajectory,
  describeReproducibility,
  safePercentChange,
  concentrationBand,
} from "../src/lib/reportNarratives";
import type { FullReportOptions } from "../src/lib/exportReport";
import { deepCloneCausalLog } from "../src/engine/SimulationHistory";
import { AnalysisGenerator } from "../src/engine/AnalysisGenerator";
import type { SimulationState } from "../src/engine/types";

describe("§8 — narrativas condicionais (nunca categóricas)", () => {
  it("HHI crescente → relata aumento", () => {
    const t = describeCapitalConcentration(1000, 2000);
    expect(t).toContain("aumentou");
    expect(t).not.toContain("desconcentração");
  });

  it("HHI decrescente → relata diminuição", () => {
    const t = describeCapitalConcentration(2000, 1000);
    expect(t).toContain("diminuiu");
    expect(t).not.toContain("concentrou");
  });

  it("HHI estável → estabilidade aproximada", () => {
    const t = describeCapitalConcentration(1500, 1540);
    expect(t).toContain("aproximadamente estável");
  });

  it("valores ausentes → não informado (nunca inventado)", () => {
    expect(describeCapitalConcentration(undefined, 2000)).toContain("não informad");
    expect(describeTrustTrajectory([])).toContain("não informad");
    expect(describeStartupTrajectory(undefined, 10)).toContain("não informad");
  });

  it("confiança sempre acima do limiar → afirmado com mínimo real", () => {
    const t = describeTrustTrajectory([
      { socialTrust: 60 },
      { socialTrust: 55 },
      { socialTrust: 70 },
    ]);
    expect(t).toContain("acima do limiar de 50%");
    expect(t).toContain("mínimo de 55%");
  });

  it("confiança oscilando em torno do limiar → não afirma que ficou acima", () => {
    const t = describeTrustTrajectory([
      { socialTrust: 80 },
      { socialTrust: 30 },
      { socialTrust: 60 },
    ]);
    expect(t).toContain("oscilou");
    expect(t).not.toContain("permaneceu em toda a série acima");
  });

  it("confiança sempre abaixo → afirmado com máximo real", () => {
    const t = describeTrustTrajectory([
      { socialTrust: 20 },
      { socialTrust: 30 },
      { socialTrust: 25 },
    ]);
    expect(t).toContain("abaixo do limiar de 50%");
    expect(t).toContain("máximo de 30%");
  });

  it("startups: aumento, redução, estabilidade", () => {
    expect(describeStartupTrajectory(10, 14)).toContain("aumento");
    expect(describeStartupTrajectory(14, 8)).toContain("redução");
    expect(describeStartupTrajectory(8, 8)).toContain("mesma quantidade");
  });

  it("safePercentChange protege divisão por zero", () => {
    expect(safePercentChange(0, 100)).toBeNull();
    expect(safePercentChange(100, 150)).toBe(50);
  });

  it("concentrationBand usa referência indicativa não calibrada", () => {
    expect(concentrationBand(3000)).toContain("não calibrada");
    expect(concentrationBand(1800)).toContain("moderada");
    expect(concentrationBand(500)).toContain("baixa");
    expect(concentrationBand(undefined)).toBe("não informado");
  });

  it("describeReproducibility condicionada ao provedor", () => {
    expect(describeReproducibility({ strictlyReproducible: true })).toContain("determinístico");
    expect(describeReproducibility({ strictlyReproducible: false, decisionProvider: "external-http" })).toContain("não é estritamente reproduzível");
    expect(describeReproducibility({})).toContain("não declara");
  });
});

describe("§9.6 — relatório heurístico não contém conclusões categóricas", () => {
  function state(turn: number, hhi: number, trust: number, startups: number): SimulationState {
    return {
      turn,
      hhi,
      hhiCapital: hhi,
      hhiRevenue: hhi,
      hhiHighRiskProducts: 0,
      socialTrust: trust,
      activeStartups: startups,
      activeBigTechs: 3,
      avgRunway: 10,
      avgBurnRate: 1,
      avgCapital: 1000,
      finiteRunwayCompanyCount: 2,
      unlimitedRunwayCompanyCount: 1,
      cloudDrain: 0,
      totalStateReturns: 0,
      totalCopyrightFees: 0,
      systemicIncidentCount: 0,
      compliantProductsRatio: 1,
      totalProducts: 10,
      compliantProducts: 10,
      nonCompliantProducts: 0,
      compAICount: 4,
      substAICount: 3,
      genAICount: 3,
      stateFundsUsed: 0,
      reputationScore: 70,
      complementaryRatio: 0.3,
      stateFundBalance: 0,
      causalLog: [],
      companiesSnapshot: [],
      adoption: { adoptionComplementary: 0.4, adoptionSubstitutive: 0.3, adoptionGenerative: 0.3, substitutionRate: 0, adoptionVelocity: 0, compCount: 4, substCount: 3, genCount: 3, totalProducts: 10 },
      marketCreation: { turn: 0, totalCompanies: 4, innovatingCompanies: 1, highRiskCompanies: 1, avgProductsPerCompany: 1, diversityIndex: 1 },
    };
  }

  const historyCrescente = [
    state(0, 1000, 70, 15),
    state(1, 1500, 65, 14),
    state(2, 2000, 60, 13),
  ];

  it("não contém 'se confirmou', 'cumpre seu papel' nem causalidade categórica", async () => {
    vi.stubGlobal(
      "localStorage",
      { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    );
    try {
      const result = await AnalysisGenerator.generate(historyCrescente, [], { name: "teste" });
      const report = result?.fullReport ?? "";
      for (const banned of ["se confirmou", "cumpre seu papel", "demonstrou", "comprovou", "gerado com o uso de inteligência artificial generativa", "a regulação pode ser um motor", "o pl 2338 permitiu", "depende diretamente da previsibilidade jurídica", "punctuated", "Xorshift"]) {
        expect(report.toLowerCase()).not.toContain(banned);
      }
    } finally {
      vi.unstubAllGlobals();
    }
  });
});


describe("§18/§20.4 — builders puros de capa e metadados", () => {
  const base: FullReportOptions = {
    history: [],
    playbookName: "Cenário Teste",
    seed: 12345,
    executedTurns: 50,
    snapshotCount: 51,
    decisionMode: "heuristic",
    decisionProvider: "heuristic",
    strictlyReproducible: true,
    externalLLMUsed: false,
    softwareVersion: "1.0.0",
  };

  it("buildDocxCoverText: sem 'parecer', com disclaimer e metadados", () => {
    const cover = buildDocxCoverText(base);
    expect(cover.title).toBe("RELATÓRIO INTERPRETATIVO AUTOMATIZADO DA SIMULAÇÃO");
    expect(cover.title).not.toContain("PARECER");
    expect(cover.disclaimer).toContain("Não constitui parecer jurídico");
    const texto = cover.metadataLines.join("\n");
    expect(texto).toContain("Seed: 12345");
    expect(texto).toContain("Turnos executados: 50");
    expect(texto).toContain("Snapshots: 51");
    expect(texto).toContain("heurístico determinístico por seed");
  });

  it("buildDocxCoverText: seed ausente → n/d (nunca inventa 42)", () => {
    const cover = buildDocxCoverText({ ...base, seed: undefined });
    expect(cover.metadataLines.join("\n")).toContain("Seed: n/d");
    expect(cover.metadataLines.join("\n")).not.toContain("Seed: 42");
  });

  it("buildReportMetadata: fonte narrativa IA quando analysisText presente", () => {
    const m = buildReportMetadata({ ...base, aiGenerationSource: "ai", analysisText: "texto" });
    expect(m.sourceNarrative).toBe("ai");
    expect(m.strictlyReproducible).toBe(true);
  });

  it("buildSourceNarrative: texto heurístico preenchido continua heurístico (§3)", () => {
    const source = buildSourceNarrative({
      history: [],
      playbookName: "Teste",
      aiGenerationSource: "heuristic",
      analysisText: "relatório heurístico completo",
    });
    expect(source).toBe("heuristic");
  });

  it("buildSourceNarrative: relatório de IA é rotulado como IA (§3)", () => {
    const source = buildSourceNarrative({
      history: [],
      playbookName: "Teste",
      aiGenerationSource: "ai",
      fullReport: "texto extenso",
    });
    expect(source).toBe("ai");
  });

  it("buildSourceNarrative: sem analysisText → heurística", () => {
    expect(buildSourceNarrative(base)).toBe("heuristic");
  });
});

describe("§16 — deepCloneCausalLog com fallback sem structuredClone", () => {
  it("sem structuredClone o fallback recursivo isola objetos aninhados", () => {
    const original = globalThis.structuredClone;
    (globalThis as { structuredClone?: unknown }).structuredClone = undefined;
    try {
      const log = [
        {
          turn: 1,
          companyId: "c1",
          product: { companyId: "c1", riskLevel: "HIGH", compliant: true, aiType: "GENERATIVE", nested: { deep: [1, 2, { x: 3 }] } },
        },
        { turn: 2, note: "texto" },
      ];
      const copy = deepCloneCausalLog(log);
      // Mutações no original não afetam a cópia (objetos aninhados profundos).
      const origProduct = log[0].product as { compliant: boolean; nested: { deep: unknown[] } };
      origProduct.compliant = false;
      const origDeep = origProduct.nested.deep as { x: number }[];
      origDeep[2]!.x = 999;
      const copyProduct = copy[0].product as { compliant: boolean; nested: { deep: unknown[] } };
      expect(copyProduct.compliant).toBe(true);
      expect((copyProduct.nested.deep as { x: number }[])[2]!.x).toBe(3);
      expect(copy[1]).toEqual({ turn: 2, note: "texto" });
    } finally {
      (globalThis as { structuredClone?: unknown }).structuredClone = original;
    }
  });
});


describe("§14 — builders puros e enquadramento", () => {
  it("buildReportTitle nunca usa 'Impactos' causal e preserva o nome do simulador", () => {
    const t = buildReportTitle();
    expect(t).toContain("PL 2338/2023");
    expect(t).not.toMatch(/[Ii]mpactos? do PL/);
    expect(t).toMatch(/[Cc]enários regulatórios parametrizados/);
  });

  it("buildStartupTrendLabel: queda → 'Redução' (nunca 'Consolidação')", () => {
    expect(buildStartupTrendLabel(-1)).toBe("Redução");
    expect(buildStartupTrendLabel(-50)).toBe("Redução");
    expect(buildStartupTrendLabel(1)).toBe("Crescimento");
    expect(buildStartupTrendLabel(0)).toBe("Estabilidade");
    expect(buildStartupTrendLabel(-1)).not.toMatch(/[Cc]onsolid/);
  });

  it("rótulos de tendência acompanham o sinal do delta", () => {
    expect(buildCountTrendLabel(-1)).toBe("Redução");
    expect(buildCountTrendLabel(1)).toBe("Crescimento");
    expect(buildCountTrendLabel(0)).toBe("Estabilidade");
    expect(buildTrustTrendLabel(-1)).toBe("Queda");
    expect(buildTrustTrendLabel(1)).toBe("Alta");
    expect(buildTrustTrendLabel(0)).toBe("Estabilidade");
  });

  it("buildPrivacyNotice distingue modo local e modo externo", () => {
    const local = buildPrivacyNotice("local");
    expect(local).toContain("local");
    expect(local).not.toContain("enviados");
    const external = buildPrivacyNotice("external");
    expect(external).toContain("endpoint configurado");
    expect(external).toContain("política de privacidade");
  });

  it("DOCX: capa sem 'PARECER', com disclaimer e metadados de execução", () => {
    const cover = buildDocxCoverText({
      history: [],
      playbookName: "X",
      seed: undefined,
      executedTurns: 0,
      snapshotCount: 1,
      strictlyReproducible: true,
      decisionMode: "heuristic",
      decisionProvider: "heuristic",
    });
    expect(cover.title).not.toContain("PARECER");
    expect(cover.title).toContain("RELATÓRIO INTERPRETATIVO AUTOMATIZADO");
    expect(cover.disclaimer).toContain("Não constitui parecer jurídico");
    expect(cover.metadataLines.join("\n")).toContain("Seed: n/d");
    expect(cover.metadataLines.join("\n")).toContain("Turnos executados: 0");
  });

  it("heurístico com analysisText preenchido continua heurístico (§3.3)", () => {
    const source = buildSourceNarrative({
      history: [],
      playbookName: "Teste",
      aiGenerationSource: "heuristic",
      analysisText: "relatório heurístico completo",
    });
    expect(source).toBe("heuristic");
    const ai = buildSourceNarrative({
      history: [],
      playbookName: "Teste",
      aiGenerationSource: "ai",
    });
    expect(ai).toBe("ai");
    const ausente = buildSourceNarrative({ history: [], playbookName: "Teste" });
    expect(ausente).toBe("heuristic");
  });
});

describe("§10/§20.4 — LaTeX real sem narrativas universais", () => {
  function texState(turn: number, hhi: number, trust: number, startups: number): SimulationState {
    return {
      turn,
      hhi,
      hhiCapital: hhi,
      hhiRevenue: hhi,
      hhiHighRiskProducts: 1000,
      socialTrust: trust,
      activeStartups: startups,
      activeBigTechs: 2,
      avgRunway: 10,
      avgBurnRate: 1,
      avgCapital: 1000,
      finiteRunwayCompanyCount: 1,
      unlimitedRunwayCompanyCount: 1,
      cloudDrain: 100,
      totalStateReturns: 0,
      totalCopyrightFees: 0,
      systemicIncidentCount: 0,
      compliantProductsRatio: 0.8,
      totalProducts: 10,
      compliantProducts: 8,
      nonCompliantProducts: 2,
      compAICount: 4,
      substAICount: 3,
      genAICount: 3,
      stateFundsUsed: 0,
      reputationScore: 70,
      complementaryRatio: 0.3,
      stateFundBalance: 0,
      causalLog: [],
      companiesSnapshot: [],
      adoption: { adoptionComplementary: 0.4, adoptionSubstitutive: 0.3, adoptionGenerative: 0.3, substitutionRate: 0, adoptionVelocity: 0, compCount: 4, substCount: 3, genCount: 3, totalProducts: 10 },
      marketCreation: { turn, totalCompanies: startups + 2, innovatingCompanies: 1, highRiskCompanies: 1, avgProductsPerCompany: 1, diversityIndex: 1 },
    };
  }

  it("generateLatexReport: sem consolidou-se/concorrência monopolística/parecer; seed n/d", async () => {
    const { generateLatexReport } = await import("../src/lib/reportLatex");
    const hist: SimulationState[] = [
      texState(0, 1000, 70, 15),
      texState(1, 1500, 65, 12),
      texState(2, 2000, 60, 8),
    ];
    const tex = generateLatexReport({
      history: hist,
      playbookName: "Teste",
      params: { seed: undefined },
      strictlyReproducible: true,
      decisionProvider: "heuristic",
      decisionMode: "heuristic",
    });
    for (const banned of ["consolidou-se", "concorrência monopolística", "PARECER", "punctuated", "Xorshift", "42"]) {
      expect(tex).not.toContain(banned);
    }
    expect(tex).toContain("redução da base de startups");
    expect(tex).toContain("proxy de concentração de capital (HHI)");
    // Grava para compilação real com tectonic (validação §22/E2E).
    const fs = await import("node:fs");
    fs.mkdirSync("/tmp/texbuild-e2e2", { recursive: true });
    fs.writeFileSync("/tmp/texbuild-e2e2/relatorio.tex", tex);
  });
});
