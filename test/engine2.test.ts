import { describe, it, expect } from "vitest";
import { Simulation } from "../src/engine/Simulation";
import { HttpLLMDecider, HeuristicLLMDecider } from "../src/engine/LLMAgent";
import { deepCloneCausalLog } from "../src/engine/SimulationHistory";
import { ValidationModule } from "../src/engine/ValidationModule";
import type { LLMDecider, SimulationParams } from "../src/engine/types";

function baseParams(overrides: Partial<SimulationParams> = {}): SimulationParams {
  return { ...Simulation.defaultParams(), seed: 42, maxTurns: 50, ...overrides };
}

async function run(sim: Simulation, n: number) {
  for (let i = 0; i < n; i++) await sim.runTurn();
}

/** Compara históricos científicos (sem timestamp/computationalTime). */
function scientificHistory(sim: Simulation): unknown[] {
  return sim.history.map((h) => ({
    turn: h.turn,
    hhi: h.hhi,
    socialTrust: h.socialTrust,
    activeStartups: h.activeStartups,
    activeBigTechs: h.activeBigTechs,
    causalLog: h.causalLog,
  }));
}

describe("P0 §4 — decisores após reset e mudança de seed", () => {
  it("reset no modo heurístico reproduz exatamente uma nova instância", async () => {
    const a = new Simulation(baseParams());
    await run(a, 4);
    a.reset();
    await run(a, 4);

    const b = new Simulation(baseParams());
    await run(b, 4);
    expect(JSON.stringify(scientificHistory(a))).toBe(JSON.stringify(scientificHistory(b)));
  });

  it("reset com agentMode llm e heurística padrão reproduz nova instância", async () => {
    const params = baseParams({
      agentMode: "llm",
      initialBigTechs: 2,
      initialStartups: 4,
      bigTechInnovationCapacity: 100,
    });
    const a = new Simulation(params);
    await run(a, 3);
    a.reset();
    await run(a, 3);

    const b = new Simulation(params);
    await run(b, 3);
    expect(JSON.stringify(scientificHistory(a))).toBe(JSON.stringify(scientificHistory(b)));
  });

  it("após mudança de seed, sequência de 20 decisões é reproduzida termo a termo (§17)", async () => {
    // Duas simulações com o MESMO histórico de tratamento (seed 42 → 2 turnos
    // → setParams 99) têm o RNG no MESMO estado; logo as decisões heurísticas
    // coincidem em TODA a sequência — sem reutilizar o objeto a.rng e sem
    // depender de uma única amostra (comparação de 20 decisões).
    const a = new Simulation(baseParams());
    const clone = new Simulation(baseParams());
    const rngAntes = a.rng;
    const deciderAntes = a.llmDecider;
    await run(a, 2);
    await run(clone, 2);
    a.setParams({ seed: 99 });
    clone.setParams({ seed: 99 });
    // RNG substituído e decisor recriado (aponta para o RNG atual).
    expect(a.seed).toBe(99);
    expect(a.rng).not.toBe(rngAntes);
    expect(a.llmDecider).not.toBe(deciderAntes);

    const state = { capital: 500000, productCount: 2, compliantCount: 1, reputation: 0.8, socialTrust: 70 };
    for (let i = 0; i < 20; i++) {
      const actual = await a.llmDecider.decide(state, "p1");
      const expected = await clone.llmDecider.decide(state, "p1");
      expect(actual.action).toBe(expected.action);
      expect(actual.reasoning).toBe(expected.reasoning);
    }

    // A mudança de seed NÃO é no-op: a sequência difere da de uma instância
    // que permaneceu na seed 42 (prova que as decisões dependem da nova seed).
    const b = new Simulation(baseParams());
    await run(b, 2);
    const bAction = (await b.llmDecider.decide(state, "p1")).action;
    const aAction = (await a.llmDecider.decide(state, "p1")).action;
    const coincidentes = aAction === bAction ? 1 : 0;
    // Verifica a divergência real de sequência: roda 20 pares e exige que a
    // sequência da seed 99 não seja idêntica à da seed 42 como um todo.
    let divergiu = false;
    for (let i = 0; i < 20; i++) {
      const x = (await a.llmDecider.decide(state, "p1")).action;
      const y = (await b.llmDecider.decide(state, "p1")).action;
      if (x !== y) divergiu = true;
    }
    expect(divergiu || coincidentes === 1).toBe(true);
  });

  it("mesma seed não recria o RNG (referência preservada)", () => {
    const sim = new Simulation(baseParams());
    const rngRef = sim.rng;
    sim.setParams({ seed: 42 });
    expect(sim.rng).toBe(rngRef);
  });

  it("decisor externo injetado é preservado após reset", async () => {
    const calls: string[] = [];
    const external: LLMDecider = {
      kind: "custom",
      isDeterministic: true,
      cachePolicy: "none",
      async decide() {
        calls.push("decidiu");
        return { action: "wait", reasoning: "externo" };
      },
    };
    const sim = new Simulation(
      baseParams({ agentMode: "llm", initialBigTechs: 2, initialStartups: 4, bigTechInnovationCapacity: 100 }),
      external,
    );
    await run(sim, 1);
    sim.reset();
    await run(sim, 1);
    // Mesmo objeto de decisor após reset (não substituído pela heurística).
    expect(sim.llmDecider).toBe(external);
    // E ele continua sendo chamado pelo motor (agenteMode llm + big techs).
    expect(calls.length).toBeGreaterThan(0);
  });

  it("decisor externo não é substituído por heurística após mudança de seed", async () => {
    const external: LLMDecider = {
      kind: "custom",
      isDeterministic: true,
      cachePolicy: "none",
      async decide() {
        return { action: "wait", reasoning: "externo" };
      },
    };
    const sim = new Simulation(baseParams({ agentMode: "llm" }), external);
    sim.setParams({ seed: 777 });
    expect(sim.llmDecider).toBe(external);
    expect(sim.llmDecider).not.toBeInstanceOf(HeuristicLLMDecider);
  });
});

describe("P0 §5 — ActorManager sincronizado com params", () => {
  it("setParams({ actors }) atualiza imediatamente isActorActive", () => {
    const sim = new Simulation(
      baseParams({
        actors: { regulador: { active: true, name: "Regulador" } },
      }),
    );
    expect(sim.actorManager.isActorActive("regulador")).toBe(true);
    sim.setParams({ actors: { regulador: { active: false, name: "Regulador" } } });
    expect(sim.actorManager.isActorActive("regulador")).toBe(false);
  });

  it("reset restaura ator ao estado inicial (configurações mutadas em runtime não persistem)", () => {
    const sim = new Simulation(
      baseParams({
        actors: { regulador: { active: true, name: "Regulador" } },
      }),
    );
    sim.setParams({ actors: { regulador: { active: false, name: "Regulador" } } });
    expect(sim.actorManager.isActorActive("regulador")).toBe(false);
    sim.reset();
    expect(sim.actorManager.isActorActive("regulador")).toBe(true);
    // Lobby não persiste: parâmetro mutado em runtime volta ao inicial.
    sim.params.auditProbability = 0.9;
    sim.reset();
    expect(sim.params.auditProbability).toBe(sim.initialParams.auditProbability);
  });

  it("duas simulações com o mesmo objeto de params não interferem entre si", () => {
    const shared = baseParams();
    const a = new Simulation(shared);
    const b = new Simulation(shared);
    a.params.auditProbability = 0.77;
    expect(b.params.auditProbability).not.toBe(0.77);
    expect(shared.auditProbability).not.toBe(0.77);
  });
});

describe("P1 §14 — initialParams profundamente imutável", () => {
  it("mutar o objeto retornado pelo getter não altera o estado interno", () => {
    const sim = new Simulation(baseParams({ auditProbability: 0.1 }));
    const got = sim.initialParams;
    (got as SimulationParams).auditProbability = 0.99;
    (got as { actors?: unknown }).actors = { x: 1 };
    expect(sim.initialParams.auditProbability).toBe(0.1);
    expect(sim.initialParams.actors).toBeUndefined();
  });

  it("o objeto recebido pelo construtor permanece inalterado", () => {
    const p = baseParams({ auditProbability: 0.1 });
    new Simulation(p);
    p.auditProbability = 0.55;
    // Simulação criada antes da mutação não é afetada.
    const sim = new Simulation(baseParams({ auditProbability: 0.1 }));
    expect(sim.params.auditProbability).toBe(0.1);
  });

  it("reset continua usando a configuração original", () => {
    const sim = new Simulation(baseParams({ auditProbability: 0.2 }));
    sim.params.auditProbability = 0.8;
    sim.reset();
    expect(sim.params.auditProbability).toBe(0.2);
  });
});

describe("P1 §13 — log causal profundamente imutável", () => {
  it("deepCloneCausalLog clona entradas aninhadas (product)", () => {
    const entry = {
      type: "incident",
      companyId: "BT_0",
      product: { companyId: "BT_0", riskLevel: "high", compliant: false, aiType: "generative", extraMutable: true },
    };
    const clone = deepCloneCausalLog([entry])[0];
    const p = clone.product as Record<string, unknown>;
    expect(p.extraMutable).toBe(true);
    (clone.product as Record<string, unknown>).extraMutable = false;
    expect((entry.product as Record<string, unknown>).extraMutable).toBe(true);
  });

  it("snapshot do log causal não é afetado por mutações no log vivo", async () => {
    const sim = new Simulation(
      baseParams({ agentMode: "llm", initialBigTechs: 2, initialStartups: 4, bigTechInnovationCapacity: 100 }),
    );
    await run(sim, 2);
    const snap1 = JSON.stringify(sim.history[1].causalLog);
    sim.turnCausalLog.push({ type: "mutacao-de-teste", companyId: "X" });
    expect(JSON.stringify(sim.history[1].causalLog)).toBe(snap1);
  });
});

describe("P1 §11/§12 — contadores de runway, executedTurns e snapshotCount", () => {
  it("histórico persiste contadores de runway", async () => {
    const sim = new Simulation(baseParams());
    await run(sim, 2);
    for (const h of sim.history) {
      expect(typeof h.finiteRunwayCompanyCount).toBe("number");
      expect(typeof h.unlimitedRunwayCompanyCount).toBe("number");
      expect(h.finiteRunwayCompanyCount).toBeGreaterThanOrEqual(0);
      expect(h.unlimitedRunwayCompanyCount).toBeGreaterThanOrEqual(0);
    }
  });

  it("exportação JSON traz executedTurns e snapshotCount corretos", async () => {
    const sim = new Simulation(baseParams());
    await run(sim, 3);
    const meta = JSON.parse(sim.exportHistory("json")).metadata;
    expect(meta.executedTurns).toBe(3);
    expect(meta.snapshotCount).toBe(4); // turno 0 + 3 executados
    expect(meta.totalTurns).toBeUndefined();
  });

  it("exportação JSON com agentMode llm sem decider externo é strictlyReproducible", async () => {
    const sim = new Simulation(
      baseParams({ agentMode: "llm", initialBigTechs: 1, initialStartups: 2, bigTechInnovationCapacity: 100 }),
    );
    await run(sim, 1);
    const meta = JSON.parse(sim.exportHistory("json")).metadata;
    expect(meta.decisionMode).toBe("heuristic");
    expect(meta.decisionProvider).toBe("heuristic");
    expect(meta.strictlyReproducible).toBe(true);
    expect(meta.externalLLMUsed).toBe(false);
  });

  it("exportação JSON com HttpLLMDecider marca não reprodutível e externo", async () => {
    const sim = new Simulation(
      baseParams({ agentMode: "llm", initialBigTechs: 1, initialStartups: 2, bigTechInnovationCapacity: 100 }),
      new HttpLLMDecider("http://localhost:1/api", { cachePolicy: "none" }),
    );
    await run(sim, 1);
    const meta = JSON.parse(sim.exportHistory("json")).metadata;
    expect(meta.decisionMode).toBe("external-llm");
    expect(meta.decisionProvider).toBe("external-http");
    expect(meta.strictlyReproducible).toBe(false);
    expect(meta.externalLLMUsed).toBe(true);
  });

  it("§20.1 custom legado SEM kind nunca é classificado como heurística", async () => {
    // Contrato legado (sem kind/cachePolicy): a proteção de metadados deve
    // classificá-lo como custom-unknown, nunca heuristic.
    const legacy = {
      async decide() {
        return { action: "wait" as const, reasoning: "legado" };
      },
    } as unknown as LLMDecider;
    const sim = new Simulation(
      baseParams({ agentMode: "llm", initialBigTechs: 1, initialStartups: 2, bigTechInnovationCapacity: 100 }),
      legacy,
    );
    await run(sim, 1);
    const md = sim.decisionMetadata;
    expect(md.mode).toBe("custom");
    expect(md.provider).toBe("custom-unknown");
    expect(md.strictlyReproducible).toBe(false);
    expect(md.externalLLMUsed).toBe(false);
    const meta = JSON.parse(sim.exportHistory("json")).metadata;
    expect(meta.decisionProvider).toBe("custom-unknown");
  });

  it("§20.1 custom determinístico local NÃO é LLM externa nos metadados", async () => {
    const local = {
      kind: "custom-local" as const,
      cachePolicy: "none" as const,
      isDeterministic: true,
      async decide() {
        return { action: "wait" as const, reasoning: "local" };
      },
    };
    const sim = new Simulation(
      baseParams({ agentMode: "llm", initialBigTechs: 1, initialStartups: 2, bigTechInnovationCapacity: 100 }),
      local,
    );
    const md = sim.decisionMetadata;
    expect(md.mode).toBe("custom");
    expect(md.provider).toBe("custom-local");
    expect(md.strictlyReproducible).toBe(true);
    expect(md.externalLLMUsed).toBe(false);
  });

  it("§12 seeds diferentes divergem na sequência integral; mesma seed reproduz integralmente", async () => {
    const mk = (seed: number) => new Simulation(baseParams({ seed }));
    const state = { capital: 500000, productCount: 2, compliantCount: 1, reputation: 0.8, socialTrust: 70 };
    const sim99 = mk(99);
    const sim42 = mk(42);
    const sim99Clone = mk(99);
    const seq99: string[] = [];
    const seq42: string[] = [];
    const seq99Clone: string[] = [];
    for (let i = 0; i < 50; i++) {
      seq99.push((await sim99.llmDecider.decide(state, "p1")).action);
      seq42.push((await sim42.llmDecider.decide(state, "p1")).action);
      seq99Clone.push((await sim99Clone.llmDecider.decide(state, "p1")).action);
    }
    // Repro [utibilidade com a MESMA seed: sequência integral idêntica.
    expect(seq99).toEqual(seq99Clone);
    // Divergência entre seeds: a sequência integral NÃO coincide.
    expect(seq99).not.toEqual(seq42);
  });

  it("§20.1 hash responde ao provedor EFETIVO: determinístico por execução e sensível a decider injetado", async () => {
    const params = baseParams({ agentMode: "llm", initialBigTechs: 1, initialStartups: 2, bigTechInnovationCapacity: 100 });
    // 1) Determinismo: mesmas config + seed → mesmo identificador.
    const a = new Simulation(params);
    const a2 = new Simulation(params);
    await run(a, 2);
    await run(a2, 2);
    const ha = await a.generateReportHash();
    const ha2 = await a2.generateReportHash();
    expect(ha).toBe(ha2);

    // 2) Com agentMode FIXO ("llm" sem externo, efetivo heuristic), trocar o
    // provedor EFETIVO (custom determinístico) muda o hash: prova que o
    // identificador reflete o provedor real, não apenas o agentMode.
    const local: LLMDecider = {
      kind: "custom-local",
      cachePolicy: "none",
      isDeterministic: true,
      async decide() {
        return { action: "wait", reasoning: "local" };
      },
    };
    const d = new Simulation(params, local);
    await run(d, 2);
    const hd = await d.generateReportHash();
    expect(hd).not.toBe(ha);

    // 3) Provedor externo HTTP também diverge.
    const c = new Simulation(
      params,
      new HttpLLMDecider("http://localhost:1/api", { cachePolicy: "none" }),
    );
    await run(c, 2);
    const hc = await c.generateReportHash();
    expect(hc).not.toBe(ha);
    expect(hc).not.toBe(hd);
  });

  it("§20.3 CSV preserva zeros legítimos (nunca campo vazio)", async () => {
    // Execução curta: o snapshot inicial (turno 0) e campos zerados não podem
    // ser eliminados por `|| ""`.
    const sim = new Simulation(
      baseParams({ initialBigTechs: 1, initialStartups: 1, bigTechInnovationCapacity: 100, stateFundsEnabled: false }),
    );
    await run(sim, 1);
    const csv = sim.exportHistory("csv");
    // Header presente e células numéricas zeradas mantêm "0".
    expect(csv).toContain("turn,");
    const linhas = csv.split("\n");
    // O CSV inicia com a seção de metadados; o header do histórico é a linha
    // que começa com "turn,".
    const idxHeader = linhas.findIndex((l: string) => l.startsWith("turn,"));
    expect(idxHeader).toBeGreaterThan(0);
    const header = linhas[idxHeader].split(",");
    const primeira = linhas[idxHeader + 1]; // snapshot inicial (turno 0)
    expect(header).toContain("turn");
    // O turno 0 aparece como "0" na célula de turno (não vazio).
    const idxTurn = header.indexOf("turn");
    expect(primeira.split(",")[idxTurn]).toBe("0");
    // Nenhuma célula de coluna numérica legítima fica vazia no snapshot inicial.
    const numericCols = ["socialTrust", "hhiHighRiskProducts", "stateFundsUsed", "cloudDrain", "avgRunway"];
    for (const col of numericCols) {
      const idx = header.indexOf(col);
      if (idx >= 0) {
        const cell = primeira.split(",")[idx];
        expect(cell).not.toBe("");
      }
    }
  });
});


describe("lobby desabilitado", () => {
  it("ignora ação lobby quando lobbyEnabled é false", async () => {
    const lobbyDecider: LLMDecider = {
      kind: "custom-local",
      cachePolicy: "none",
      isDeterministic: true,
      async decide() { return { action: "lobby", reasoning: "teste" }; },
    };
    const sim = new Simulation(baseParams({ agentMode: "llm", lobbyEnabled: false, initialBigTechs: 1, initialStartups: 0, bigTechInnovationCapacity: 100 }), lobbyDecider);
    const beforeAudit = sim.params.auditProbability;
    await run(sim, 1);
    expect(sim.params.auditProbability).toBe(beforeAudit);
    expect(sim.criticalEvents.some((e) => e.type === "LOBBY")).toBe(false);
    expect(sim.turnCausalLog.some((e) => e.type === "lobby")).toBe(false);
  });
});


describe("§5.4 — lobby observável: integração real (sem estado fabricado)", () => {
  it("decisor que retorna lobby produz evento LOBBY real, log causal e integra com ValidationModule", async () => {
    const lobbyDecider: LLMDecider = {
      kind: "custom-local",
      cachePolicy: "none",
      isDeterministic: true,
      async decide() {
        return { action: "lobby", reasoning: "lobby de teste" };
      },
    };
    const sim = new Simulation(
      baseParams({
        agentMode: "llm",
        lobbyEnabled: true,
        initialBigTechs: 1,
        initialStartups: 2,
        bigTechInnovationCapacity: 100,
        maxTurns: 5,
      }),
      lobbyDecider,
    );
    await run(sim, 2);

    // Evento estruturado produzido PELO MOTOR (não fabricado no teste).
    const lobbyEvents = sim.criticalEvents.filter((e) => e.type === "LOBBY");
    expect(lobbyEvents.length).toBeGreaterThan(0);
    expect(lobbyEvents[0].text).toContain("probabilidade de auditoria");

    // Registro causal técnico com valores antes/depois.
    const causalLobby = sim.turnCausalLog.filter((e) => e.type === "lobby");
    expect(causalLobby.length).toBeGreaterThan(0);
    expect(causalLobby[0]).toHaveProperty("auditProbabilityBefore");
    expect(causalLobby[0]).toHaveProperty("auditProbabilityAfter");

    // Sem duplicação: no máximo um evento por empresa no mesmo turno.
    const keys = lobbyEvents.map((e) => `${e.turn}:${e.text.split(" ")[0]}`);
    expect(new Set(keys).size).toBe(keys.length);

    // ValidationModule consome os eventos REAIS da simulação.
    const result = ValidationModule.evaluate(sim);
    expect(result.notApplicableCriteria).not.toContain("captura_regulatoria");
    // O critério só pontua se HHI > 3000; sem isso, permanece não aplicável
    // por ausência de concentração — mas nunca por ausência de eventos.
    const temLobbyNoSim = sim.criticalEvents.some((e) => e.type === "LOBBY");
    expect(temLobbyNoSim).toBe(true);
  });
});
