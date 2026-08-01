import { HeuristicLLMDecider } from "./LLMAgent";
import type { LLMDecider, LLMDecision } from "./types";

export interface LLMOrchestratorConfig {
  maxCacheSize?: number;
  defaultProvider?: string;
}

interface CacheEntry {
  decision: LLMDecision;
  timestamp: number;
}

/**
 * Orchestrador de chamadas a LLMs.
 * Centraliza provedores, gerencia cache e reduz acoplamento.
 */
export class LLMOrchestrator {
  private providers: Map<string, LLMDecider> = new Map();
  private decisionCache: Map<string, CacheEntry> = new Map();
  private maxCacheSize: number;
  private defaultProviderName: string;

  constructor(config: LLMOrchestratorConfig = {}) {
    this.maxCacheSize = config.maxCacheSize || 50;
    this.defaultProviderName = config.defaultProvider || "heuristic";

    this.registerProvider("heuristic", new HeuristicLLMDecider());
  }

  /**
   * Registra um provedor de LLM
   */
  registerProvider(name: string, decider: LLMDecider): void {
    this.providers.set(name, decider);
  }

  /**
   * Obtém um provedor registrado
   */
  getProvider(name?: string): LLMDecider | undefined {
    return this.providers.get(name || this.defaultProviderName);
  }

  /**
   * Lista provedores disponíveis
   */
  listProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Decide usando o provedor registrado.
   *
   * Política de cache: o cache só é usado quando o PROVEDOR declarar
   * `cachePolicy: "state"` (idempotência declarada). Heurística e HTTP
   * externo usam "none" por padrão, evitando correlação artificial entre
   * empresas ou turnos com estado semelhante. Quando cacheado, a chave
   * inclui companyId e turno para nunca misturar decisões independentes.
   */
  async decide(
    state: Record<string, unknown>,
    playbookId: string,
    providerName: string,
    decisionContext?: { companyId?: string; turn?: number },
  ): Promise<LLMDecision> {
    const provider = this.getProvider(providerName);
    if (!provider) {
      return { action: "wait", reasoning: "No LLM provider available." };
    }

    const useCache = provider.cachePolicy === "state";
    const cacheKey = useCache
      ? this.buildCacheKey(state, playbookId, providerName, decisionContext)
      : "";

    if (useCache) {
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;
    }

    const decision = await provider.decide(state, playbookId, decisionContext);
    if (useCache) this.addToCache(cacheKey, decision);
    return decision;
  }

  /**
   * Limpa o cache de decisões
   */
  clearCache(): void {
    this.decisionCache.clear();
  }

  /**
   * Define o tamanho máximo do cache
   */
  setMaxCacheSize(size: number): void {
    this.maxCacheSize = Math.max(1, size);
  }

  /**
   * Constrói chave única para cache.
   * Inclui companyId e turno quando fornecidos: duas empresas com estado
   * semelhante no mesmo turno (ou a mesma empresa em turnos diferentes)
   * nunca compartilham a mesma entrada de cache.
   */
  private buildCacheKey(
    state: Record<string, unknown>,
    playbookId: string,
    providerName?: string,
    decisionContext?: { companyId?: string; turn?: number },
  ): string {
    const stateHash = this.fastHash(JSON.stringify(state));
    const scope = decisionContext
      ? `${decisionContext.companyId ?? "?"}:${decisionContext.turn ?? "?"}`
      : "no-scope";
    return `${providerName || this.defaultProviderName}:${playbookId}:${scope}:${stateHash}`;
  }

  /**
   * Recupera decisão do cache se disponível
   */
  private getFromCache(key: string): LLMDecision | undefined {
    const entry = this.decisionCache.get(key);
    if (entry) {
      return entry.decision;
    }
    return undefined;
  }

  /**
   * Adiciona decisão ao cache
   */
  private addToCache(key: string, decision: LLMDecision): void {
    if (this.decisionCache.size >= this.maxCacheSize) {
      const firstKey = this.decisionCache.keys().next().value;
      if (firstKey) this.decisionCache.delete(firstKey);
    }

    this.decisionCache.set(key, {
      decision,
      timestamp: Date.now(),
    });
  }

  /**
   * Hash rápido para chave de cache (não criptográfico)
   */
  private fastHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }
}