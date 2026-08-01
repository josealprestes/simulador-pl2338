import { describe, it, expect } from "vitest";
import { ValidationModule } from "../src/engine/ValidationModule";
import type { SimulationState } from "../src/engine/types";

function state(): SimulationState {
  return {
    turn: 50,
    hhi: 2000,
    hhiCapital: 2000,
    hhiRevenue: 1500,
    hhiHighRiskProducts: 1000,
    socialTrust: 70,
    activeStartups: 10,
    activeBigTechs: 3,
    avgRunway: 10,
    avgBurnRate: 1,
    avgCapital: 1000,
    finiteRunwayCompanyCount: 2,
    unlimitedRunwayCompanyCount: 1,
    cloudDrain: 0,
    totalStateReturns: 500,
    totalCopyrightFees: 0,
    systemicIncidentCount: 0,
    compliantProductsRatio: 1,
    totalProducts: 10,
    compliantProducts: 10,
    nonCompliantProducts: 0,
    compAICount: 4,
    substAICount: 3,
    genAICount: 3,
    reputationScore: 70,
    complementaryRatio: 0.3,
    stateFundBalance: 0,
    stateFundsUsed: 0,
    causalLog: [],
    companiesSnapshot: [],
    adoption: {
      adoptionComplementary: 0.4,
      adoptionSubstitutive: 0.3,
      adoptionGenerative: 0.3,
      substitutionRate: 0,
      adoptionVelocity: 0,
      compCount: 4,
      substCount: 3,
      genCount: 3,
      totalProducts: 10,
    },
    marketCreation: {
      turn: 50,
      totalCompanies: 13,
      innovatingCompanies: 1,
      highRiskCompanies: 1,
      avgProductsPerCompany: 1,
      diversityIndex: 1,
    },
  };
}

function fakeSimulation(overrides: Record<string, unknown> = {}) {
  return {
    history: [state()],
    turn: 50,
    params: {
      initialStartups: 20,
      complianceCostHighRisk: 30000,
      lobbyEnabled: false,
      reputationEnabled: false,
      stateRoyaltyEnabled: false,
      actors: {},
    },
    companies: [],
    criticalEvents: [],
    ...overrides,
  };
}

describe("§15 — ValidationModule com índice de coerência normalizado", () => {
  it("mecanismos desativados → critérios correspondentes não aplicáveis", () => {
    const r = ValidationModule.evaluate(fakeSimulation());
    expect(r.applicableCriteria).not.toContain("captura_regulatoria");
    expect(r.applicableCriteria).not.toContain("reputacao");
    expect(r.applicableCriteria).not.toContain("retorno_social");
    expect(r.applicableCriteria).not.toContain("open_source");
    // companies vazias → sem produtos de alto risco → critério não avaliável.
    expect(r.notApplicableCriteria).toContain("hhi_alto_risco");
    expect(r.notApplicableCriteria).toContain("hhi_capital_compliance");
    // 20+10+10 = 40 (mortalidade, confiança, nuvem; compliance abaixo do limiar)
    expect(r.applicableScore).toBe(40);
  });

  it("todos os mecanismos ativos + produtos de alto risco → critérios aplicáveis e índice 0-100", () => {
    const r = ValidationModule.evaluate(
      fakeSimulation({
        params: {
          initialStartups: 20,
          complianceCostHighRisk: 60000,
          lobbyEnabled: true,
          reputationEnabled: true,
          stateRoyaltyEnabled: true,
          actors: { openSource: { releaseCycle: 30 } },
        },
        companies: [
          { capital: 100, reputationScore: 0.8, products: [{ riskLevel: "HIGH" }, { riskLevel: "MINIMAL" }] },
          { capital: 200, reputationScore: 0.7, products: [{ riskLevel: "HIGH" }] },
          { capital: 300, reputationScore: 0.6, products: [{ riskLevel: "HIGH" }] },
        ],
        criticalEvents: [{ type: "LOBBY", turn: 10 }],
        history: [{ ...state(), hhiCapital: 3500, hhi: 3500 }],
      }),
    );
    expect(r.applicableScore).toBe(110);
    expect(r.applicableCriteria).toContain("captura_regulatoria");
    expect(r.applicableCriteria).toContain("reputacao");
    expect(r.applicableCriteria).toContain("retorno_social");
    expect(r.applicableCriteria).toContain("open_source");
    expect(r.applicableCriteria).toContain("hhi_alto_risco");
    expect(r.coherenceIndex).toBeGreaterThanOrEqual(0);
    expect(r.coherenceIndex).toBeLessThanOrEqual(100);
    expect(r.earnedScore).toBeLessThanOrEqual(r.applicableScore);
  });

  it("índice é comparável entre execuções com a mesma quantidade de critérios aplicáveis", () => {
    const a = ValidationModule.evaluate(fakeSimulation());
    const b = ValidationModule.evaluate(fakeSimulation({ history: [{ ...state(), activeStartups: 5 }] }));
    // Ambas sem mecanismos opcionais: mesmos critérios, índices comparáveis.
    expect(a.applicableCriteria).toEqual(b.applicableCriteria);
    expect(a.coherenceIndex).toBeGreaterThanOrEqual(0);
    expect(b.coherenceIndex).toBeGreaterThanOrEqual(0);
  });

  it("terminologia do HHI: proxy de concentração de capital, não 'mercado'", () => {
    const r = ValidationModule.evaluate(
      fakeSimulation({ params: { initialStartups: 20, complianceCostHighRisk: 60000 } }),
    );
    const texto = r.findings.join(" ");
    expect(texto).not.toContain("Concentração de mercado observada");
    expect(texto).not.toContain("poder de mercado");
  });

  it("simulação sem histórico → índice 0 e sem divisão por zero", () => {
    const r = ValidationModule.evaluate({ history: [], params: {}, turn: 0, companies: [] });
    expect(r.coherenceIndex).toBe(0);
    expect(r.applicableScore).toBe(0);
  });

  it("zero produtos de alto risco → critério NÃO AVALIÁVEL, sem falsa diversidade", () => {
    const r = ValidationModule.evaluate(fakeSimulation());
    const texto = r.findings.join(" ");
    expect(r.notApplicableCriteria).toContain("hhi_alto_risco");
    expect(texto).toContain("Critério não avaliável: não houve produtos de alto risco");
    expect(texto).not.toContain("Distribuição saudável");
    // Nenhum ponto é atribuído ao critério não avaliável.
    expect(r.earnedScore).toBe(0);
  });

  it("lobby habilitado SEM eventos de lobby → não equivale a captura", () => {
    const r = ValidationModule.evaluate(
      fakeSimulation({
        params: {
          initialStartups: 20,
          complianceCostHighRisk: 30000,
          lobbyEnabled: true,
          reputationEnabled: false,
          stateRoyaltyEnabled: false,
          actors: {},
        },
        history: [{ ...state(), hhiCapital: 3500, hhi: 3500 }],
        criticalEvents: [],
      }),
    );
    expect(r.applicableCriteria).not.toContain("captura_regulatoria");
    expect(r.notApplicableCriteria).toContain("captura_regulatoria");
    const texto = r.findings.join(" ");
    expect(texto).toContain("sem o conjunto de sinais completo");
    expect(texto).not.toContain("sugere risco de captura");
  });

  it("§9.1 zero startups iniciais → mortalidade NÃO avaliável (sem startup fictícia)", () => {
    const r = ValidationModule.evaluate(
      fakeSimulation({
        params: { initialStartups: 0, complianceCostHighRisk: 30000, lobbyEnabled: false, reputationEnabled: false, stateRoyaltyEnabled: false, actors: {} },
      }),
    );
    expect(r.notApplicableCriteria).toContain("mortalidade_startups");
    const c = r.criteria.find((x) => x.id === "mortalidade_startups");
    expect(c?.status).toBe("not_applicable");
    const texto = r.findings.join(" ");
    expect(texto).toContain("não há taxa artificial de mortalidade");
  });

  it("§9.2 custo de conformidade baixo → hhi_capital_compliance NÃO aplicável", () => {
    const r = ValidationModule.evaluate(
      fakeSimulation({
        params: { initialStartups: 20, complianceCostHighRisk: 10000, lobbyEnabled: false, reputationEnabled: false, stateRoyaltyEnabled: false, actors: {} },
        history: [{ ...state(), hhiCapital: 3500, hhi: 3500 }],
      }),
    );
    expect(r.notApplicableCriteria).toContain("hhi_capital_compliance");
    const c = r.criteria.find((x) => x.id === "hhi_capital_compliance");
    expect(c?.status).toBe("not_applicable");
  });

  it("§9.4 matriz criteria presente com status/weight/finding para todos os critérios", () => {
    const r = ValidationModule.evaluate(fakeSimulation());
    expect(r.criteria.length).toBeGreaterThan(0);
    for (const c of r.criteria) {
      expect(["matched", "not_matched", "not_applicable"]).toContain(c.status);
      expect(c.weight).toBeGreaterThan(0);
      expect(c.finding.length).toBeGreaterThan(0);
    }
    expect(r.applicableCriteria).toEqual(r.criteria.filter((x) => x.status !== "not_applicable").map((x) => x.id));
  });

  it("linguagem sem causalidade: nenhuma frase afirma que mecanismo 'causou' o resultado", () => {
    const r = ValidationModule.evaluate(
      fakeSimulation({
        params: {
          initialStartups: 20,
          complianceCostHighRisk: 60000,
          lobbyEnabled: true,
          reputationEnabled: true,
          stateRoyaltyEnabled: true,
          actors: { openSource: { releaseCycle: 30 } },
        },
        companies: [
          { capital: 100, reputationScore: 0.8, products: [{ riskLevel: "HIGH" }] },
          { capital: 200, reputationScore: 0.7, products: [{ riskLevel: "HIGH" }] },
          { capital: 300, reputationScore: 0.6, products: [{ riskLevel: "HIGH" }] },
        ],
        criticalEvents: [{ type: "LOBBY", turn: 10 }],
        history: [{ ...state(), socialTrust: 90, totalStateReturns: 100 }],
      }),
    );
    const texto = r.findings.join(" ");
    expect(texto).not.toContain("preservou a confiança");
    expect(texto).not.toContain("contribuiu para a resiliência");
    expect(texto).not.toContain("O mercado pune desvios");
    expect(texto).not.toContain("socializou com sucesso");
    expect(texto).toContain("compatível com a hipótese");
  });
});
