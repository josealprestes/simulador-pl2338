import { describe, it, expect } from "vitest";
import { Simulation } from "../src/engine/Simulation";
import type { SimulationParams, SimulationState } from "../src/engine/types";

/** Executa N turnos em uma simulação. */
async function runTurns(sim: Simulation, turns: number): Promise<void> {
  for (let i = 0; i < turns; i++) {
    await sim.runTurn();
  }
}

/** Extrai apenas os campos científicos do histórico (sem timestamps). */
function scientificHistory(sim: Simulation): unknown[] {
  return sim.history.map((h: SimulationState) => {
    const { timestamp: _ts, ...rest } = h;
    return rest;
  });
}

function baseParams(overrides: Partial<SimulationParams> = {}): SimulationParams {
  return { ...Simulation.defaultParams(), seed: 42, maxTurns: 50, ...overrides };
}

describe("determinismo por seed", () => {
  it("mesma seed produz históricos idênticos", async () => {
    const a = new Simulation(baseParams());
    const b = new Simulation(baseParams());
    await runTurns(a, 15);
    await runTurns(b, 15);
    expect(JSON.stringify(scientificHistory(a))).toBe(
      JSON.stringify(scientificHistory(b)),
    );
  });

  it("seed diferente produz ao menos uma divergência", async () => {
    const a = new Simulation(baseParams({ seed: 1 }));
    const b = new Simulation(baseParams({ seed: 2 }));
    await runTurns(a, 15);
    await runTurns(b, 15);
    expect(JSON.stringify(scientificHistory(a))).not.toBe(
      JSON.stringify(scientificHistory(b)),
    );
  });

  it("duas execuções heurísticas completas são determinísticas", async () => {
    const params: SimulationParams = baseParams({ agentMode: "llm" });
    const a = new Simulation(params);
    const b = new Simulation(params);
    await runTurns(a, 10);
    await runTurns(b, 10);
    expect(JSON.stringify(scientificHistory(a))).toBe(
      JSON.stringify(scientificHistory(b)),
    );
  });
});

describe("reset equivalente a nova instância", () => {
  it("reset + re-execução reproduz o resultado inicial", async () => {
    const params = baseParams();
    const sim = new Simulation(params);
    await runTurns(sim, 12);
    const antes = JSON.stringify(scientificHistory(sim));

    sim.reset();
    await runTurns(sim, 12);
    const depois = JSON.stringify(scientificHistory(sim));

    expect(depois).toBe(antes);
  });

  it("reset restaura o estado regulatório (auditProbability e custo de conformidade)", async () => {
    const params = baseParams({ auditProbability: 0.1, complianceCostHighRisk: 20000 });
    const sim = new Simulation(params);
    // Simula efeito de lobby no estado de runtime.
    sim.params.auditProbability = 0.5;
    sim.params.complianceCostHighRisk = 1000;
    sim.reset();
    expect(sim.params.auditProbability).toBe(0.1);
    expect(sim.params.complianceCostHighRisk).toBe(20000);
    expect(sim.initialParams.auditProbability).toBe(0.1);
  });

  it("reset limpa lastCloudDrain, caches e acumuladores", async () => {
    const sim = new Simulation(baseParams());
    await runTurns(sim, 5);
    sim.lastCloudDrain = 999;
    sim.cumulativeCloudDrain = 12345;
    sim.turnCausalLog.push({
      type: "test",
      companyId: "X",
      action: "wait",
      reasoning: "r",
    } as never);
    sim.reset();
    expect(sim.lastCloudDrain).toBe(0);
    expect(sim.cumulativeCloudDrain).toBe(0);
    expect(sim.turnCausalLog).toEqual([]);
  });
});

describe("parâmetros iniciais imutáveis", () => {
  it("o objeto passado ao construtor não é modificado", async () => {
    const original: SimulationParams = baseParams({ initialStartups: 7 });
    const snapshot = JSON.stringify(original);
    const sim = new Simulation(original);
    await runTurns(sim, 5);
    // Lobby/estado de runtime nunca tocam o objeto do chamador.
    expect(JSON.stringify(original)).toBe(snapshot);
    expect(sim.initialParams.initialStartups).toBe(7);
    expect(sim.initialParams).not.toBe(original);
    expect(sim.params).not.toBe(original);
  });

  it("duas simulações criadas com o mesmo objeto não interferem entre si", async () => {
    const shared = baseParams({ initialStartups: 6, seed: 7 });
    const a = new Simulation(shared);
    const b = new Simulation(shared);
    a.params.auditProbability = 0.9;
    expect(b.params.auditProbability).toBe(0.1);
  });
});

describe("alteração de seed em setParams", () => {
  it("nova seed atualiza a sequência e a segunda comparação não fica falsa", async () => {
    const sim = new Simulation(baseParams({ titularEnabled: true, titularCount: 5 }));
    const rngRef = sim.rng;
    sim.setParams({ seed: 999 });
    expect(sim.seed).toBe(999);
    // A seed mudou: o RNG foi substituído.
    expect(sim.rng).not.toBe(rngRef);
    const rngAposMudanca = sim.rng;
    // Mesma seed não reinicializa: o RNG permanece o mesmo objeto.
    sim.setParams({ seed: 999 });
    expect(sim.rng).toBe(rngAposMudanca);
  });
});

describe("escala da confiança nos relatórios", () => {
  it("socialTrust permanece em 0-100 no histórico", async () => {
    const sim = new Simulation(baseParams());
    await runTurns(sim, 10);
    for (const h of sim.history) {
      expect(h.socialTrust).toBeGreaterThanOrEqual(0);
      expect(h.socialTrust).toBeLessThanOrEqual(100);
    }
  });
});
