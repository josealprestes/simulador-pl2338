import { MetricsEngine } from "./MetricsEngine";
import { AdoptionCurveEngine } from "./AdoptionCurveEngine";
import { assertFiniteValues } from "../lib/finiteValues";
import { APP_VERSION } from "../config/version";
import type { SimulationParams, SimulationState, TurnCausalEntry, CriticalEvent, AdoptionCurveSnapshot } from "./types";
import type { Company } from "./Company";
import type { Titular } from "./Titular";

/** Versão do schema de exportação, independente da versão do software. */
const SCHEMA_VERSION = "1.0.0";

/**
 * Snapshot profundo do log causal.
 *
 * structuredClone preserva tipos e quebra todas as referências com o estado
 * corrente. Fallback por schema (sem JSON genérico, que perderia tipos):
 * as entradas conhecidas são planas; apenas `product` é um objeto aninhado
 * e é clonado campo a campo com os campos estáveis.
 */
export function deepCloneCausalLog<T extends TurnCausalEntry[]>(entries: T): T {
  if (typeof structuredClone === "function") {
    try {
      return structuredClone(entries) as T;
    } catch {
      // ambiente sem suporte: clone recursivo seguro abaixo
    }
  }
  return entries.map((e) => cloneSafe(e)) as T;
}

/**
 * Clone recursivo para dados puros (JSON-safe). Preserva primitivos e arrays;
 * quebra TODAS as referências aninhadas, sem depender de schema de entrada.
 * TurnCausalEntry é JSON-safe por construção (produtos, strings e números).
 */
function cloneSafe<T>(value: T): T {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((item) => cloneSafe(item)) as unknown as T;
  const out: Record<string, unknown> = {};
  const src = value as Record<string, unknown>;
  for (const key of Object.keys(src)) {
    out[key] = cloneSafe(src[key]);
  }
  return out as T;
}

export interface SimulationHistoryContext {
  companies: Company[];
  titulares: Titular[];
  turn: number;
  socialTrust: number;
  history: SimulationState[];
  actorState: Record<string, any>;
  totalStateReturns: number;
  cumulativeCloudDrain: number;
  totalCopyrightFees: number;
  systemicIncidentCount: number;
  turnCausalLog: Array<TurnCausalEntry>;
  seed: number;
  params: SimulationParams;
  initialParams: SimulationParams;
  criticalEvents: CriticalEvent[];
  playbook?: any;
  wallClockStartTime: number | null;
  /** Metadados do provedor EFETIVO de decisão (não o modo desejado). */
  decisionMetadata: {
    mode: string;
    provider: string;
    strictlyReproducible: boolean;
    externalLLMUsed: boolean;
  };
}

/**
 * Gerencia o histórico e exportação de dados da simulação
 */
export class SimulationHistory {
  private ctx: SimulationHistoryContext;
  private lastAdoptionSnapshot: AdoptionCurveSnapshot | null = null;

  constructor(ctx: SimulationHistoryContext) {
    this.ctx = ctx;
  }

  /**
   * Reinicia o estado interno do histórico para uma nova execução limpa
   */
  reset(): void {
    this.lastAdoptionSnapshot = null;
  }

  /**
   * Registra o estado atual no histórico
   */
  recordHistory(): void {
    const activeCompanies = this.ctx.companies.filter((c) => !c.bankrupt);
    const startups = activeCompanies.filter((c) => c.type === "STARTUP");
    const bigTechs = activeCompanies.filter((c) => c.type === "BIG_TECH");

    const hhiCapitalProxy = MetricsEngine.calculateHHI(
      activeCompanies,
      "capital",
    );
    const hhiRevenueProxy = MetricsEngine.calculateHHI(
      activeCompanies,
      "revenueLastTurn",
    );
    const hhiHighRiskProducts = MetricsEngine.calculateProductHHI(
      activeCompanies,
      "HIGH",
    );
    const complementaryRatio =
      MetricsEngine.calculateComplementaryRatio(activeCompanies);
    const averages = MetricsEngine.calculateAverages(activeCompanies);
    const totalProducts = activeCompanies.reduce(
      (acc, c) => acc + (c.products || []).length,
      0,
    );
    const compliantProducts = activeCompanies.reduce(
      (acc, c) =>
        acc + (c.products || []).filter((p) => p && p.compliant).length,
      0,
    );
    const nonCompliantProducts = totalProducts - compliantProducts;

    const compAICount = activeCompanies.reduce(
      (acc, c) => acc + c.products.filter(p => p.aiType === "COMPLEMENTARY").length, 0
    );
    const substAICount = activeCompanies.reduce(
      (acc, c) => acc + c.products.filter(p => p.aiType === "SUBSTITUTIVE").length, 0
    );
    const genAICount = activeCompanies.reduce(
      (acc, c) => acc + c.products.filter(p => p.aiType === "GENERATIVE").length, 0
    );

    const stateFundsUsed = this.isActorActive("stateFund")
      ? ((this.ctx.params.actors?.stateFund as any)?.budget ?? 0) -
        this.ctx.actorState.stateFund.remainingBudget
      : 0;

    const avgReputationScore =
      activeCompanies.length > 0
        ? parseFloat(
            (
              activeCompanies.reduce((acc, c) => acc + c.reputationScore, 0) /
              activeCompanies.length
            ).toFixed(2),
          )
        : 0;

    const adoption = AdoptionCurveEngine.computeAdoptionSnapshot(
      this.ctx.companies,
      this.lastAdoptionSnapshot ?? undefined,
    );
    this.lastAdoptionSnapshot = adoption;

    const marketCreation = AdoptionCurveEngine.computeMarketCreationSnapshot(
      this.ctx.companies,
      this.ctx.turn,
    );

    const compliantProductsRatio =
      totalProducts > 0
        ? parseFloat((compliantProducts / totalProducts).toFixed(3))
        : 1;

    const baseState: SimulationState = {
      turn: this.ctx.turn,
      activeStartups: startups.length,
      activeBigTechs: bigTechs.length,
      socialTrust: Math.max(0, this.ctx.socialTrust),
      reputationScore: avgReputationScore,
      // hhi é alias legado de hhiCapital (proxy de concentração de capital).
      hhi: hhiCapitalProxy,
      hhiCapital: hhiCapitalProxy,
      hhiRevenue: hhiRevenueProxy,
      hhiHighRiskProducts,
      complementaryRatio,
      totalProducts,
      compliantProducts,
      compliantProductsRatio,
      nonCompliantProducts,
      compAICount,
      substAICount,
      genAICount,
      stateFundsUsed,
      stateFundBalance: this.ctx.actorState.stateFund?.remainingBudget || 0,
      totalStateReturns: this.ctx.totalStateReturns,
      avgCapital: averages.avgCapital,
      avgRunway: averages.avgRunway,
      avgBurnRate: averages.avgBurnRate,
      finiteRunwayCompanyCount: averages.finiteRunwayCompanyCount,
      unlimitedRunwayCompanyCount: averages.unlimitedRunwayCompanyCount,
      cloudDrain: this.ctx.cumulativeCloudDrain || 0,
      totalCopyrightFees: this.ctx.totalCopyrightFees || 0,
      systemicIncidentCount: this.ctx.systemicIncidentCount || 0,
      // Snapshot profundo: entradas do log causal nunca compartilham objetos
      // mutáveis com o estado corrente (structuredClone com fallback seguro).
      causalLog: deepCloneCausalLog(this.ctx.turnCausalLog),
      adoption,
      marketCreation,
      // Snapshot das empresas neste turno (não o estado final na exportação)
      companiesSnapshot: this.ctx.companies.map((c) => ({
        id: c.id,
        type: c.type,
        capital: c.capital,
        productsCount: c.products.length,
        complianceLevel: c.complianceMaturity,
        incidentCount: c.incidentCount,
        revenue: c.revenueLastTurn,
        reputationScore: c.reputationScore,
        bankrupt: c.bankrupt,
        inSandbox: c.inSandbox,
      })),
    };

    // Calculate custom metrics if playbook defines them
    const customMetrics = this.ctx.playbook?.calculateCustom 
      ? this.ctx.playbook.calculateCustom(this.ctx.params, this.ctx.turn, baseState)
      : {};

    this.ctx.history.push({
      ...baseState,
      ...customMetrics,
    });
  }

  /**
   * Exporta o histórico no formato especificado.
   *
   * Metadados completos de reprodutibilidade: versão do software (fonte
   * única), versão do schema (independente), seed, modo de decisão e
   * parâmetros iniciais vs estado regulatório final. Valores não finitos
   * abortam a exportação com erro explícito (nunca são mascarados).
   */
  exportHistory(format = "json", playbookId = "", seedValue = this.ctx.seed): string {
    // Metadados do provedor EFETIVO: agentMode ("llm") sem decider externo
    // continua usando heurística semeada, e os metadados refletem isso.
    const dm = this.ctx.decisionMetadata;
    const metadata = {
      softwareVersion: APP_VERSION,
      schemaVersion: SCHEMA_VERSION,
      playbookId,
      seed: seedValue,
      executedTurns: this.ctx.turn,
      snapshotCount: this.ctx.history.length,
      decisionMode: dm.mode,
      decisionProvider: dm.provider,
      strictlyReproducible: dm.strictlyReproducible,
      externalLLMUsed: dm.externalLLMUsed,
      startedAt: this.ctx.wallClockStartTime
        ? new Date(this.ctx.wallClockStartTime).toISOString()
        : null,
      exportedAt: new Date().toISOString(),
      totalCompanies: this.ctx.companies.length,
      initialParams: this.ctx.initialParams,
      finalRegulatoryState: this.ctx.params,
    };

    if (format === "json") {
      const exportObject = {
        metadata,
        params: this.ctx.params,
        history: this.ctx.history.map((h) => ({
            turn: h.turn,
            timestamp: h.timestamp,
            metrics: {
              activeStartups: h.activeStartups,
              activeBigTechs: h.activeBigTechs,
              socialTrust: h.socialTrust,
              hhi: h.hhi,
              hhiCapital: h.hhiCapital,
              hhiRevenue: h.hhiRevenue,
              hhiHighRiskProducts: h.hhiHighRiskProducts,
              compliantProductsRatio: h.compliantProductsRatio,
              stateFundsUsed: h.stateFundsUsed,
              stateFundBalance: h.stateFundBalance || 0,
              avgCapital: h.avgCapital,
              avgRunway: h.avgRunway,
              avgBurnRate: h.avgBurnRate,
              finiteRunwayCompanyCount: h.finiteRunwayCompanyCount,
              unlimitedRunwayCompanyCount: h.unlimitedRunwayCompanyCount,
              cloudDrain: h.cloudDrain || 0,
            },
            adoption: h.adoption,
            marketCreation: h.marketCreation,
            companies: h.companiesSnapshot || [],
          })),
      };
      // Nunca exportar valores não finitos silenciosamente.
      assertFiniteValues(exportObject, "histórico JSON");
      return JSON.stringify(exportObject, null, 2);
    }

    // Nunca exportar valores não finitos silenciosamente (também no CSV).
    assertFiniteValues(
      { params: this.ctx.params, history: this.ctx.history },
      "histórico CSV",
    );

    const csvRows: Array<Array<string | number>> = [];
    csvRows.push(["Metadata", "Value"]);
    csvRows.push(["softwareVersion", metadata.softwareVersion]);
    csvRows.push(["schemaVersion", metadata.schemaVersion]);
    csvRows.push(["playbookId", metadata.playbookId]);
    csvRows.push(["seed", metadata.seed]);
    csvRows.push(["executedTurns", String(metadata.executedTurns)]);
    csvRows.push(["snapshotCount", String(metadata.snapshotCount)]);
    csvRows.push(["decisionMode", metadata.decisionMode]);
    csvRows.push(["decisionProvider", metadata.decisionProvider]);
    csvRows.push(["externalLLMUsed", String(metadata.externalLLMUsed)]);
    csvRows.push(["strictlyReproducible", String(metadata.strictlyReproducible)]);
    csvRows.push(["exportedAt", metadata.exportedAt]);
    csvRows.push([]);

    const csvHeader = [
      "turn",
      "timestamp",
      "activeStartups",
      "activeBigTechs",
      "socialTrust",
      "hhiCapital",
      "hhiRevenue",
      "hhiHighRiskProducts",
      "compliantProductsRatio",
      "stateFundsUsed",
      "stateFundBalance",
      "avgCapital",
      "avgRunway",
      "avgBurnRate",
      "finiteRunwayCompanyCount",
      "unlimitedRunwayCompanyCount",
      "cloudDrain",
      "adoptionComplementary",
      "adoptionSubstitutive",
      "adoptionGenerative",
      "substitutionRate",
      "adoptionVelocity",
      "diversityIndex",
      "innovatingCompanies",
      "avgProductsPerCompany",
    ];
    csvRows.push(csvHeader);

    this.ctx.history.forEach((h: any) => {
      csvRows.push([
        h.turn ?? "",
        h.timestamp ?? "",
        h.activeStartups ?? "",
        h.activeBigTechs ?? "",
        h.socialTrust ?? "",
        h.hhiCapital ?? "",
        h.hhiRevenue ?? "",
        h.hhiHighRiskProducts ?? "",
        h.compliantProductsRatio ?? "",
        h.stateFundsUsed ?? "",
        h.stateFundBalance ?? "",
        h.avgCapital ?? "",
        h.avgRunway ?? "",
        h.avgBurnRate ?? "",
        h.finiteRunwayCompanyCount ?? "",
        h.unlimitedRunwayCompanyCount ?? "",
        h.cloudDrain ?? "",
        h.adoption?.adoptionComplementary ?? "",
        h.adoption?.adoptionSubstitutive ?? "",
        h.adoption?.adoptionGenerative ?? "",
        h.adoption?.substitutionRate ?? "",
        h.adoption?.adoptionVelocity ?? "",
        h.marketCreation?.diversityIndex ?? "",
        h.marketCreation?.innovatingCompanies ?? "",
        h.marketCreation?.avgProductsPerCompany ?? "",
      ]);
    });

    return csvRows
      .map((row) =>
        row
          .map((field: string | number) => {
            if (field === null || field === undefined) return "";
            if (
              typeof field === "string" &&
              (field.includes(",") ||
                field.includes('"') ||
                field.includes("\n"))
            ) {
              return `"${field.replace(/"/g, '""')}"`;
            }
            return String(field);
          })
          .join(","),
      )
      .join("\n");
  }

  /**
   * Generates a deterministic SHA-256 technical identifier.
   */
  async generateReportHash(): Promise<string> {
    const lastHist = this.ctx.history[this.ctx.history.length - 1] || {};
    // O hash científico distingue: configuração inicial, estado final, seed e
    // modo de decisão. Timestamps reais ficam fora (prejudicariam a
    // comparação determinística).
    const payload = JSON.stringify({
      seed: this.ctx.seed,
      turn: this.ctx.turn,
      executedTurns: this.ctx.turn,
      snapshotCount: this.ctx.history.length,
      initialParams: this.ctx.initialParams,
      params: this.ctx.params,
      // Provedor EFETIVO de decisão (nunca o agentMode desejado).
      decisionMetadata: {
        mode: this.ctx.decisionMetadata.mode,
        provider: this.ctx.decisionMetadata.provider,
        strictlyReproducible: this.ctx.decisionMetadata.strictlyReproducible,
        externalLLMUsed: this.ctx.decisionMetadata.externalLLMUsed,
      },
      finalState: {
        activeStartups: lastHist.activeStartups,
        activeBigTechs: lastHist.activeBigTechs,
        hhi: lastHist.hhi,
        hhiHighRiskProducts: lastHist.hhiHighRiskProducts,
        socialTrust: lastHist.socialTrust,
        avgRunway: lastHist.avgRunway,
        avgBurnRate: lastHist.avgBurnRate,
        finiteRunwayCompanyCount: lastHist.finiteRunwayCompanyCount,
        unlimitedRunwayCompanyCount: lastHist.unlimitedRunwayCompanyCount,
        cloudDrain: lastHist.cloudDrain,
      },
      criticalEvents: this.ctx.criticalEvents.map((e) => ({
        turn: e.turn,
        type: e.type,
      })),
      historyLength: this.ctx.history.length,
    });

    try {
      if (typeof crypto !== "undefined" && crypto.subtle) {
        const encoder = new TextEncoder();
        const data = encoder.encode(payload);
        const hashBuffer = await crypto.subtle.digest("SHA-256", data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
        return `SIM-${hashHex.slice(0, 16).toUpperCase()}`;
      } else {
        // Fallback insecure hash for local HTTP development
        let hash = 0;
        for (let i = 0; i < payload.length; i++) {
          const char = payload.charCodeAt(i);
          hash = (hash << 5) - hash + char;
          hash = hash & hash;
        }
        return `SIM-LCL-${Math.abs(hash).toString(16).toUpperCase()}`;
      }
    } catch {
      return `SIM-ERR-${Date.now().toString(16).toUpperCase()}`;
    }
  }

  private isActorActive(name: string): boolean {
    const actor = this.ctx.params.actors?.[name];
    if (actor === true) return true;
    if (!actor || actor.active === false) return false;
    return true;
  }
}