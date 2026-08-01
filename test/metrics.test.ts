import { describe, it, expect } from "vitest";
import { Simulation } from "../src/engine/Simulation";
import { MetricsEngine } from "../src/engine/MetricsEngine";
import { AdoptionCurveEngine } from "../src/engine/AdoptionCurveEngine";
import { assertFiniteValues, findNonFiniteValues } from "../src/lib/finiteValues";
import type { SimulationParams } from "../src/engine/types";

function baseParams(overrides: Partial<SimulationParams> = {}): SimulationParams {
  return { ...Simulation.defaultParams(), seed: 42, maxTurns: 50, ...overrides };
}

function fakeCompany(overrides: Record<string, unknown> = {}) {
  return {
    id: "C0",
    type: "STARTUP",
    capital: 100,
    revenueLastTurn: 50,
    burnRate: 10,
    runway: 10,
    products: [],
    complianceMaturity: 0,
    reputationScore: 1,
    subsidyReceived: 0,
    governmentContracts: 0,
    insuranceMultiplier: 1,
    fixedCost: 0,
    ...overrides,
  } as never;
}

describe("HHI semanticamente correto", () => {
  it("HHI de capital e receita divergem em cenário construído", () => {
    const companies = [
      fakeCompany({ id: "A", capital: 600, revenueLastTurn: 200 }),
      fakeCompany({ id: "B", capital: 400, revenueLastTurn: 800 }),
    ];
    const hhiCapital = MetricsEngine.calculateHHI(companies, "capital");
    const hhiRevenue = MetricsEngine.calculateHHI(companies, "revenueLastTurn");
    expect(hhiCapital).toBe(5200);
    expect(hhiRevenue).toBe(6800);
    expect(hhiCapital).not.toBe(hhiRevenue);
  });

  it("HHI de receita retorna zero quando não há receita", () => {
    const companies = [
      fakeCompany({ id: "A", revenueLastTurn: 0 }),
      fakeCompany({ id: "B", revenueLastTurn: 0 }),
    ];
    expect(MetricsEngine.calculateHHI(companies, "revenueLastTurn")).toBe(0);
  });

  it("cache não retorna métricas obsoletas após mutação (sem cache por identidade)", () => {
    const companies = [
      fakeCompany({ id: "A", capital: 100 }),
      fakeCompany({ id: "B", capital: 100 }),
    ];
    const h1 = MetricsEngine.calculateHHI(companies, "capital");
    // Muta o estado e recalcula: o valor deve mudar (sem cache stale).
    (companies[0] as { capital: number }).capital = 9900;
    const h2 = MetricsEngine.calculateHHI(companies, "capital");
    expect(h1).not.toBe(h2);
    expect(h2).toBeGreaterThan(h1);
  });

  it("HHI de capital e receita são independentes com o mesmo array", () => {
    const companies = [
      fakeCompany({ id: "A", capital: 800, revenueLastTurn: 600 }),
      fakeCompany({ id: "B", capital: 200, revenueLastTurn: 400 }),
    ];
    const hhiCapital = MetricsEngine.calculateHHI(companies, "capital");
    const hhiRevenue = MetricsEngine.calculateHHI(companies, "revenueLastTurn");
    expect(hhiCapital).toBe(6800);
    expect(hhiRevenue).toBe(5200);
  });
});

describe("média de runway (apenas finitas)", () => {
  it("todas finitas: média correta", () => {
    const companies = [
      fakeCompany({ runway: 10 }),
      fakeCompany({ runway: 20 }),
      fakeCompany({ runway: 30 }),
    ];
    const avg = MetricsEngine.calculateAverages(companies);
    expect(avg.avgRunway).toBe(20);
    expect(avg.finiteRunwayCompanyCount).toBe(3);
    expect(avg.unlimitedRunwayCompanyCount).toBe(0);
  });

  it("mistura de finitas e infinitas: infinitas não reduzem a média", () => {
    const companies = [
      fakeCompany({ runway: 10 }),
      fakeCompany({ runway: 20 }),
      fakeCompany({ runway: Infinity }),
      fakeCompany({ runway: Infinity }),
    ];
    const avg = MetricsEngine.calculateAverages(companies);
    expect(avg.avgRunway).toBe(15);
    expect(avg.finiteRunwayCompanyCount).toBe(2);
    expect(avg.unlimitedRunwayCompanyCount).toBe(2);
  });

  it("todas infinitas: média zero, sem NaN/Infinity", () => {
    const companies = [
      fakeCompany({ runway: Infinity }),
      fakeCompany({ runway: Infinity }),
    ];
    const avg = MetricsEngine.calculateAverages(companies);
    expect(avg.avgRunway).toBe(0);
    expect(Number.isFinite(avg.avgRunway)).toBe(true);
    expect(avg.finiteRunwayCompanyCount).toBe(0);
    expect(avg.unlimitedRunwayCompanyCount).toBe(2);
  });

  it("nenhuma empresa: zeros", () => {
    const avg = MetricsEngine.calculateAverages([]);
    expect(avg).toEqual({
      avgCapital: 0,
      avgRunway: 0,
      avgBurnRate: 0,
      finiteRunwayCompanyCount: 0,
      unlimitedRunwayCompanyCount: 0,
    });
  });
});

describe("curvas de adoção sem produtos", () => {
  it("mercado sempre vazio retorna snapshot zero", () => {
    const snap = AdoptionCurveEngine.computeAdoptionSnapshot([], undefined);
    expect(snap.adoptionComplementary).toBe(0);
    expect(snap.adoptionSubstitutive).toBe(0);
    expect(snap.adoptionGenerative).toBe(0);
    expect(snap.substitutionRate).toBe(0);
    expect(snap.adoptionVelocity).toBe(0);
    expect(snap.totalProducts).toBe(0);
  });

  it("mercado com produtos depois vazio: EMA não conserva proporções antigas", () => {
    const comProdutos = [
      fakeCompany({
        products: [{ aiType: "COMPLEMENTARY", riskLevel: "HIGH", compliant: true }],
      }),
    ];
    const anterior = AdoptionCurveEngine.computeAdoptionSnapshot(comProdutos, undefined);
    expect(anterior.adoptionComplementary).toBe(1);

    const vazio = AdoptionCurveEngine.computeAdoptionSnapshot([], anterior);
    expect(vazio.adoptionComplementary).toBe(0);
    expect(vazio.adoptionSubstitutive).toBe(0);
    expect(vazio.adoptionGenerative).toBe(0);
  });

  it("soma das proporções = 1 quando há produtos", () => {
    const companies = [
      fakeCompany({
        products: [
          { aiType: "COMPLEMENTARY", riskLevel: "HIGH", compliant: true },
          { aiType: "SUBSTITUTIVE", riskLevel: "HIGH", compliant: false },
        ],
      }),
      fakeCompany({
        products: [{ aiType: "GENERATIVE", riskLevel: "HIGH", compliant: true }],
      }),
    ];
    const snap = AdoptionCurveEngine.computeAdoptionSnapshot(companies, undefined);
    const soma =
      snap.adoptionComplementary + snap.adoptionSubstitutive + snap.adoptionGenerative;
    // Arredondamento de parseFloat(toFixed(4)) tolera 0.0001.
    expect(soma).toBeCloseTo(1, 3);
  });
});

describe("snapshots históricos imutáveis", () => {
  it("mutar o estado atual não altera snapshots gravados", async () => {
    const sim = new Simulation(baseParams({ initialStartups: 5, initialBigTechs: 1 }));
    await sim.runTurn();
    const snapshotGravado = JSON.stringify(sim.history[0].companiesSnapshot);
    // Muta o estado atual.
    sim.companies[0].capital += 50000;
    expect(JSON.stringify(sim.history[0].companiesSnapshot)).toBe(snapshotGravado);
  });
});

describe("exportação e metadados", () => {
  it("JSON válido com metadados completos e sem valores não finitos", async () => {
    const sim = new Simulation(baseParams());
    await sim.runTurn();
    const json = sim.exportHistory("json");
    const parsed = JSON.parse(json);
    expect(parsed.metadata.softwareVersion).toBeDefined();
    expect(parsed.metadata.schemaVersion).toBe("1.0.0");
    expect(parsed.metadata.decisionMode).toBe("heuristic");
    expect(parsed.metadata.strictlyReproducible).toBe(true);
    expect(parsed.metadata.initialParams).toBeDefined();
    expect(parsed.metadata.finalRegulatoryState).toBeDefined();
    expect(parsed.history.length).toBeGreaterThan(0);
    // Sanitização: sem NaN/Infinity em lugar nenhum.
    expect(findNonFiniteValues(parsed)).toEqual([]);
  });

  it("CSV sem NaN ou Infinity", async () => {
    const sim = new Simulation(baseParams());
    await sim.runTurn();
    const csv = sim.exportHistory("csv");
    expect(csv).not.toContain("NaN");
    expect(csv).not.toContain("Infinity");
    expect(csv).toContain("softwareVersion");
    expect(csv).toContain("schemaVersion");
  });

  it("sanitização central detecta e aborta valores não finitos", () => {
    expect(findNonFiniteValues({ a: 1, b: { c: NaN } })).toEqual(["root.b.c"]);
    expect(() => assertFiniteValues({ h: Infinity })).toThrow(/não finito/);
    expect(() => assertFiniteValues({ ok: 1 })).not.toThrow();
  });
});
