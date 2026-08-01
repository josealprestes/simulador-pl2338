import { describe, it, expect, vi, beforeEach } from "vitest";
import { isBigTechAction } from "../src/engine/types";
import { HttpLLMDecider, HeuristicLLMDecider } from "../src/engine/LLMAgent";
import { RNG } from "../src/engine/RNG";
import { Simulation } from "../src/engine/Simulation";
import { LLMOrchestrator } from "../src/engine/LLMOrchestrator";
import type { LLMDecider, LLMDecision, SimulationParams } from "../src/engine/types";

function baseParams(overrides: Partial<SimulationParams> = {}): SimulationParams {
  return { ...Simulation.defaultParams(), seed: 42, maxTurns: 50, ...overrides };
}

describe("isBigTechAction (validação runtime)", () => {
  it('aceita "rd", "compliance", "lobby" e "wait"', () => {
    expect(isBigTechAction("rd")).toBe(true);
    expect(isBigTechAction("compliance")).toBe(true);
    expect(isBigTechAction("lobby")).toBe(true);
    expect(isBigTechAction("wait")).toBe(true);
  });

  it('rejeita "invest", null, objeto e string vazia', () => {
    expect(isBigTechAction("invest")).toBe(false);
    expect(isBigTechAction(null)).toBe(false);
    expect(isBigTechAction({ action: "rd" })).toBe(false);
    expect(isBigTechAction("")).toBe(false);
    expect(isBigTechAction(undefined)).toBe(false);
  });
});

describe("HttpLLMDecider com fallback seguro", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("ação inválida do provedor resulta em wait com registro causal", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ action: "invest", reasoning: "n" }),
      }),
    );
    const decider = new HttpLLMDecider("http://fake");
    const decision = await decider.decide({}, "p1");
    expect(decision.action).toBe("wait");
    expect(decision.fallbackReason).toContain("invest");
    expect(decision.fallbackReason).toContain("http://fake");
  });

  it("resposta sem action e JSON malformado caem em wait", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ reasoning: "sem ação" }),
      }),
    );
    const decider = new HttpLLMDecider("http://fake");
    const d1 = await decider.decide({}, "p1");
    expect(d1.action).toBe("wait");
    expect(d1.fallbackReason).toBeDefined();

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => {
          throw new Error("Unexpected token");
        },
      }),
    );
    const d2 = await decider.decide({}, "p1");
    expect(d2.action).toBe("wait");
    expect(d2.fallbackReason).toBeDefined();
  });

  it("erro de rede não interrompe com wait (fallback seguro)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network down")),
    );
    const decider = new HttpLLMDecider("http://fake");
    const decision = await decider.decide({}, "p1");
    expect(decision.action).toBe("wait");
    expect(decision.fallbackReason).toContain("network down");
  });

  it("timeout REAL: promise pendente aborta via AbortController e cai em wait (§7)", async () => {
    vi.useFakeTimers();
    try {
      // Provedor que nunca resolve: a promise só é rejeitada quando o
      // AbortController da implementação dispara o abort.
      const fetchMock = vi.fn(
        (_url: string, init?: { signal?: AbortSignal }) =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () => {
              reject(new DOMException("Aborted", "AbortError"));
            });
          }),
      );
      vi.stubGlobal("fetch", fetchMock);
      const decider = new HttpLLMDecider("http://fake", { timeoutMs: 500 });

      const pending = decider.decide({}, "p1");
      let settled = false;
      pending.then(() => (settled = true)).catch(() => (settled = true));

      await vi.advanceTimersByTimeAsync(499);
      expect(settled).toBe(false); // ainda pendente antes do limite

      await vi.advanceTimersByTimeAsync(10); // cruza o limite de 500 ms
      const decision = await pending;
      expect(settled).toBe(true);
      expect(decision.action).toBe("wait");
      expect(decision.fallbackReason).toContain("timeout de 500 ms");
      // O signal foi realmente usado (fetch recebeu AbortController).
      expect(fetchMock).toHaveBeenCalledWith(
        "http://fake",
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
      // Timer limpo no finally: nenhum timer pendente.
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
      vi.unstubAllGlobals();
    }
  });

  it("ação válida é processada normalmente", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ action: "lobby", reasoning: "ok" }),
      }),
    );
    const decider = new HttpLLMDecider("http://fake");
    const decision = await decider.decide({}, "p1");
    expect(decision.action).toBe("lobby");
    expect(decision.fallbackReason).toBeUndefined();
  });
});

describe("HeuristicLLMDecider determinístico", () => {
  it("mesmo RNG produz a mesma sequência de ações", async () => {
    const a = new HeuristicLLMDecider(new RNG(7));
    const b = new HeuristicLLMDecider(new RNG(7));
    for (let i = 0; i < 20; i++) {
      const da = await a.decide();
      const db = await b.decide();
      expect(da.action).toBe(db.action);
    }
  });

  it("RNGs com seeds diferentes divergem em algum ponto", async () => {
    const a = new HeuristicLLMDecider(new RNG(1));
    const b = new HeuristicLLMDecider(new RNG(2));
    let divergiu = false;
    for (let i = 0; i < 50 && !divergiu; i++) {
      const da = await a.decide();
      const db = await b.decide();
      if (da.action !== db.action) divergiu = true;
    }
    expect(divergiu).toBe(true);
  });

  it("sem RNG injetado usa seed fixa documentada (determinístico)", async () => {
    const a = new HeuristicLLMDecider();
    const b = new HeuristicLLMDecider();
    const da = await a.decide();
    const db = await b.decide();
    expect(da.action).toBe(db.action);
  });
});

describe("roteamento do provedor customizado", () => {
  it("com agentMode llm, o decider injetado é consultado e o fallback entra no log causal", async () => {
    const calls: Array<{ state: unknown; playbook: string | undefined }> = [];
    const fakeDecider: LLMDecider = {
      kind: "custom-local",
      cachePolicy: "none",
      async decide(state, playbookId) {
        calls.push({ state, playbook: playbookId });
        return { action: "wait", reasoning: "fake" } satisfies LLMDecision;
      },
    };
    const sim = new Simulation(
      baseParams({ agentMode: "llm", initialBigTechs: 2, initialStartups: 4, bigTechInnovationCapacity: 100 }),
      fakeDecider,
    );
    await sim.runTurn();
    await sim.runTurn();
    expect(calls.length).toBeGreaterThan(0);
    // O log causal registra a decisão com provedor custom.
    expect(sim.turnCausalLog.some((e) => e.type === "llmDecision")).toBe(true);
  });
});

describe("P0 §7 — política de cache do LLMOrchestrator", () => {
  it("provedor sem cache declarado (padrão none) é chamado em todas as decisões", async () => {
    let calls = 0;
    const decider: LLMDecider = {
      kind: "custom-local",
      cachePolicy: "none",
      isDeterministic: true,
      async decide() {
        calls++;
        return { action: "wait", reasoning: "x" };
      },
    };
    const orch = new LLMOrchestrator();
    orch.registerProvider("custom", decider);
    const state = { capital: 500000, productCount: 2, compliantCount: 1, reputation: 0.8, socialTrust: 70 };
    await orch.decide(state, "p1", "custom", { companyId: "BT_0", turn: 1 });
    await orch.decide(state, "p1", "custom", { companyId: "BT_0", turn: 1 });
    expect(calls).toBe(2);
  });

  it("provedor com cachePolicy state reutiliza a mesma decisão para o mesmo escopo", async () => {
    let calls = 0;
    const decider: LLMDecider = {
      kind: "custom-local",
      isDeterministic: true,
      cachePolicy: "state",
      async decide() {
        calls++;
        return { action: "rd", reasoning: "cacheada" };
      },
    };
    const orch = new LLMOrchestrator();
    orch.registerProvider("custom", decider);
    const state = { capital: 500000, productCount: 2, compliantCount: 1, reputation: 0.8, socialTrust: 70 };
    await orch.decide(state, "p1", "custom", { companyId: "BT_0", turn: 1 });
    await orch.decide(state, "p1", "custom", { companyId: "BT_0", turn: 1 });
    expect(calls).toBe(1);
  });

  it("cache state NÃO mistura decisões de empresas ou turnos diferentes", async () => {
    let calls = 0;
    const decider: LLMDecider = {
      kind: "custom-local",
      isDeterministic: true,
      cachePolicy: "state",
      async decide() {
        calls++;
        return { action: "rd", reasoning: "independente" };
      },
    };
    const orch = new LLMOrchestrator();
    orch.registerProvider("custom", decider);
    const state = { capital: 500000, productCount: 2, compliantCount: 1, reputation: 0.8, socialTrust: 70 };
    await orch.decide(state, "p1", "custom", { companyId: "BT_0", turn: 1 });
    await orch.decide(state, "p1", "custom", { companyId: "BT_1", turn: 1 });
    await orch.decide(state, "p1", "custom", { companyId: "BT_0", turn: 2 });
    expect(calls).toBe(3);
  });

  it("clearCache invalida entradas em cache state", async () => {
    let calls = 0;
    const decider: LLMDecider = {
      kind: "custom-local",
      isDeterministic: true,
      cachePolicy: "state",
      async decide() {
        calls++;
        return { action: "rd", reasoning: "x" };
      },
    };
    const orch = new LLMOrchestrator();
    orch.registerProvider("custom", decider);
    const state = { capital: 500000, productCount: 2, compliantCount: 1, reputation: 0.8, socialTrust: 70 };
    await orch.decide(state, "p1", "custom", { companyId: "BT_0", turn: 1 });
    orch.clearCache();
    await orch.decide(state, "p1", "custom", { companyId: "BT_0", turn: 1 });
    expect(calls).toBe(2);
  });

  it("reset da simulação recria o orquestrador (cache limpo por construção)", async () => {
    let calls = 0;
    const decider: LLMDecider = {
      kind: "custom-local",
      isDeterministic: true,
      cachePolicy: "state",
      async decide() {
        calls++;
        return { action: "wait", reasoning: "x" };
      },
    };
    const sim = new Simulation(
      baseParams({ agentMode: "llm", initialBigTechs: 2, initialStartups: 4, bigTechInnovationCapacity: 100 }),
      decider,
    );
    await sim.runTurn();
    await sim.runTurn();
    const aposT1 = calls;
    sim.reset();
    await sim.runTurn();
    expect(calls).toBeGreaterThan(aposT1);
  });
});
