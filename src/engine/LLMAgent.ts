import { BigTechAction, isBigTechAction } from "./types";
import { RNG } from "./RNG";
import type { CachePolicy, DecisionProviderKind, LLMDecider, LLMDecision } from "./types";

/**
 * HttpLLMDecider: PoC for adaptative decision making in Big Techs.
 * Uses an external LLM to choose the best strategic action each turn.
 *
 * Segurança: qualquer ação retornada pelo provedor é validada em runtime
 * com `isBigTechAction`. Ações inválidas caem em `wait` com registro causal
 * (valor recebido + motivo), nunca em cast cego.
 */
export class HttpLLMDecider implements LLMDecider {
	private apiUrl: string;
	private timeoutMs: number;
	/** Identidade real do provedor: chamada HTTP externa (não determinística). */
	readonly kind: DecisionProviderKind = "external-http";
	readonly isDeterministic = false;
	/** Política de cache declarada; padrão "none" (nunca cachear por padrão). */
	readonly cachePolicy: CachePolicy;

	constructor(
		apiUrl: string = "/api/llm-decide",
		options?: { cachePolicy?: CachePolicy; timeoutMs?: number },
	) {
		this.apiUrl = apiUrl;
		this.cachePolicy = options?.cachePolicy ?? "none";
		this.timeoutMs = options?.timeoutMs ?? 10_000;
	}

	/**
	 * Decides which action to take based on the current state.
	 * Timeout real via AbortController: uma chamada que nunca resolve aborta
	 * após `timeoutMs` e cai em `wait` com registro causal, sem bloquear o turno.
	 */
	async decide(state: Record<string, unknown>, playbookId?: string): Promise<LLMDecision> {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
		try {
			const response = await fetch(this.apiUrl, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ state, playbookId }),
				signal: controller.signal,
			});

			if (!response.ok) throw new Error("LLM Decision API failed");

			const data = await response.json();
			const rawAction = data?.action;

			if (!isBigTechAction(rawAction)) {
				return {
					action: "wait",
					reasoning: "Ação inválida retornada pelo provedor; fallback seguro para wait.",
					fallbackReason: `Valor recebido: ${JSON.stringify(rawAction)}; provedor: ${this.apiUrl}; motivo: ação não pertence a BigTechAction.`,
				};
			}

			return {
				action: rawAction,
				reasoning: data.reasoning || "No reasoning provided.",
			};
		} catch (error) {
			const timedOut = controller.signal.aborted;
			return {
				action: "wait",
				reasoning: timedOut
					? `Timeout de ${this.timeoutMs} ms; fallback seguro para wait.`
					: "Error communicating with LLM.",
				fallbackReason: `Provedor: ${this.apiUrl}; motivo: ${
					timedOut ? `timeout de ${this.timeoutMs} ms (AbortController)` : error instanceof Error ? error.message : String(error)
				}.`,
			};
		} finally {
			clearTimeout(timeout);
		}
	}
}

/**
 * HeuristicLLMDecider: fallback determinístico para testes e UI preview.
 * Usa o RNG injetado (derivado da seed da simulação) em vez de Math.random(),
 * garantindo reprodutibilidade por seed.
 */
export class HeuristicLLMDecider implements LLMDecider {
	private rng: RNG;
	/** Identidade real: decisor interno semeado (determinístico). */
	readonly kind: DecisionProviderKind = "heuristic";
	readonly isDeterministic = true;
	/** Heurística nunca usa cache: cada decisão consome o RNG da simulação. */
	readonly cachePolicy: CachePolicy = "none";

	constructor(rng?: RNG) {
		// Seed fixa documentada quando nenhum RNG é injetado (uso isolado).
		this.rng = rng ?? new RNG(42);
	}

	async decide(): Promise<LLMDecision> {
		const actions: BigTechAction[] = ["rd", "compliance", "lobby", "wait"];
		const idx = this.rng.nextInt(0, actions.length - 1);
		return {
			action: actions[idx],
			reasoning:
				"Decisão simulada (Heurística) baseada em probabilidade uniforme determinística.",
		};
	}
}
