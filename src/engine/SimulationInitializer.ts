import { RNG } from "./RNG";
import { Company } from "./Company";
import { Titular, calculateSocialTrustFromTitulares } from "./Titular";
import { ActorManager } from "./ActorManager";
import type { SimulationParams, TurnCausalEntry } from "./types";

export interface SimulationInitializerConfig {
  params: SimulationParams;
  rng: RNG;
  companies: Company[];
  titulares: Titular[];
  socialTrust: number;
  turn: number;
  events: string[];
  criticalEvents: CriticalEvent[];
  computationalTime: number;
  history: import("./types").SimulationState[];
  cumulativeCloudDrain: number;
  totalStateReturns: number;
  totalCopyrightFees: number;
  systemicIncidentCount: number;
  turnCausalLog: Array<TurnCausalEntry>;
  lastCloudDrain: number;
}

export interface CriticalEvent {
  turn: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: string;
  description: string;
  companiesAffected: string[];
}

export class SimulationInitializer {
  private simulation: any;
  private actorManager: ActorManager;

  constructor(simulation: any) {
    this.simulation = simulation;
    this.actorManager = new ActorManager(this.simulation.params);
  }

  /**
   * Reinicia a simulação para o estado inicial
   */
  reset(): void {
    this.simulation.rng = new RNG(this.simulation.seed);
    this.simulation.actorState = this.initializeActorState();
    this.simulation.companies = [];
    this.simulation.titulares = [];
    this.simulation.socialTrust = 100;
    this.simulation.turn = 0;
    // O evento de reset é apenas informativo de UI; o histórico científico
    // (history, métricas) é equivalente ao de uma nova instância.
    this.simulation.events = ["🔄 Simulação Resetada ao Turno 0"];
    this.simulation.criticalEvents = [];
    this.simulation.computationalTime = 0;
    this.simulation.history = [];
    this.simulation.turnCausalLog = [];
    this.simulation.cumulativeCloudDrain = 0;
    this.simulation.wallClockStartTime = Date.now();
    this.simulation.totalStateReturns = 0;
    this.simulation.totalCopyrightFees = 0;
    this.simulation.systemicIncidentCount = 0;
    this.simulation.lastCloudDrain = 0;
    this.simulation._preTurnSocialTrust = 100;
    this.simulation.llmOrchestrator?.clearCache();
    this.simulation.simulationHistory?.reset();
    this.initializeMarket();
    this.initializeTitulares();
  }

  /**
   * Inicializa a população de agentes titulares
   * Issue #97: Modelar titulares de dados como agentes autônomos (LGPD Art. 17)
   */
  initializeTitulares(): void {
    const titularEnabled = this.simulation.params.titularEnabled ?? false;
    if (!titularEnabled) return;

    const titularCount = Math.min(
      this.simulation.params.titularCount ?? 200,
      500, // Limite máximo para não degradar performance
    );

    for (let i = 0; i < titularCount; i++) {
      // Usar RNG para dar variação inicial, mas manter alta confiança inicial
      // trustLevel é inicializado com 1.0 por default, mas pode ser reduzido
      this.simulation.titulares.push(
        new Titular(i, this.simulation.rng, {
          boycottThreshold: this.simulation.params.boycottThreshold ?? 0.3,
          // trustLevel inicial é 1.0 por default, mas podemos adicionar variação sutil
          initialTrustLevel: 0.8 + this.simulation.rng.next() * 0.2, // 0.8 to 1.0
        }),
      );
    }

    // Atualizar socialTrust inicial com base nos titulares
    this.simulation.socialTrust = this.calculateSocialTrustFromTitulares(this.simulation.titulares);
  }

  /**
   * Inicializa o estado do ator (venture capital, state fund, etc.)
   */
  initializeActorState(): Record<string, any> {
    const actorState = {
      ventureCapital: {
        remainingPool: this.actorManager.getVentureCapitalPool(),
      },
      stateFund: {
        remainingBudget: this.actorManager.getStateFundBudget(),
      },
    };
    this.simulation.actorState = actorState;
    return actorState;
  }

  /**
   * Inicializa o mercado com empresas startups e big techs
   */
  initializeMarket(): void {
    const numBigTechs = Number.isFinite(this.simulation.params.initialBigTechs)
      ? this.simulation.params.initialBigTechs
      : 2;
    const numStartups = Number.isFinite(this.simulation.params.initialStartups)
      ? this.simulation.params.initialStartups
      : 20;

    // Programação defensiva: garantir que companies é um array
    if (!Array.isArray(this.simulation.companies)) {
      this.simulation.companies = [];
    }

    for (let i = 0; i < numBigTechs; i++) {
      this.simulation.companies.push(
        new Company(`BT_${i}`, "BIG_TECH", this.simulation.rng, this.simulation.params),
      );
    }
    for (let i = 0; i < numStartups; i++) {
      this.simulation.companies.push(
        new Company(`ST_${i}`, "STARTUP", this.simulation.rng, this.simulation.params),
      );
    }
    this.simulation.recordHistory();
  }

  /**
   * Calcula a confiança social a partir dos titulares
   */
  private calculateSocialTrustFromTitulares(titulares: Titular[]): number {
    return calculateSocialTrustFromTitulares(titulares);
  }
}