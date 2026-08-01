/**
 * Definitive Types for the Simulation Engine
 */

export type CompanyType = "STARTUP" | "BIG_TECH";
export type RiskLevel = "MINIMAL" | "HIGH";
export type AIType = "COMPLEMENTARY" | "SUBSTITUTIVE" | "GENERATIVE";

export interface ActorConfig {
  active?: boolean;
  capitalPool?: number;
  budget?: number;
  [key: string]: unknown;
}

export type ActorsMap = Record<string, boolean | ActorConfig>;

export interface SimulationParams {
	initialStartups: number;
	initialBigTechs: number;
	startupInitialCapital: number;
	bigTechInitialCapital: number;
	startupInnovationCapacity: number;
	bigTechInnovationCapacity: number;
	complianceCostHighRisk: number;
	auditProbability: number;
	fineSeverity: number;
	sandboxCapacity: number;
	lgpdIncidentChance: number;
	socialSensibility: number;
	maxTurns: number;
	seed?: number;
	agentMode?: "heuristic" | "llm";
	substitutiveEnabled?: boolean;
	generativeEnabled?: boolean;
	substitutiveRevenueMultiplier?: number;
	complementaryRevenueMultiplier?: number;
	generativeRevenueMultiplier?: number;
	generativeInfraCostMultiplier?: number;
	copyrightFeeRate?: number;
	systemicRiskChance?: number;
	highRiskProductRevenue?: number;
	minimalRiskProductRevenue?: number;
	infraCostPerProduct?: number;
	procurementProbability?: number;
	procurementValue?: number;
	learningRecoveryRate?: number;
	maxGovContracts?: number;
	reservedProcurementQuota?: number;
	govContractValue?: number;
	handFormulaEnabled?: boolean;
	negligenceMultiplier?: number;
	reoffenderMultiplier?: number;
	proportionalFinesEnabled?: boolean;
	insurancePremium?: number;
	insuranceCoverage?: number;
	reputationEnabled?: boolean;
	reputationPenaltyPerIncident?: number;
	reputationRecoveryRate?: number;
	reputationRevenueImpact?: number;
	trustRevenueFloor?: number;
	lobbyEnabled?: boolean;
	lobbyCapitalThreshold?: number;
	lobbySuccessRate?: number;
	lobbyAuditReduction?: number;
	lobbyCompliancePenalty?: number;
	complianceCostCap?: number;
	playbookId?: string;
	highRiskInnovationCost?: number;
	minimalRiskInnovationCost?: number;
	generativeInnovationCost?: number;
	sandboxComplianceMultiplier?: number;
	automationErosionRate?: number;
	substitutiveImpactFactor?: number;
	generativeImpactFactor?: number;
	titularEnabled?: boolean;
	titularCount?: number;
	boycottThreshold?: number;
	titularImpactRate?: number;
	titularTrustReduction?: number;
	titularRecoveryRate?: number;
	boycottRevenuePenalty?: number;
	stateFundComplementaryBonus?: number;
	stateRoyaltyEnabled?: boolean;
	stateRoyaltyRate?: number;
	stateRoyaltyMinRevenue?: number;
	innovationHHIThresholds?: number[];
	innovationHHIModifiers?: number[];
	bigTechFixedCost?: number;
	startupFixedCost?: number;
	bigTechComplianceThreshold?: number;
	startupComplianceThreshold?: number;
	bigTechHighRiskThreshold?: number;
	startupHighRiskThreshold?: number;
	generativeThreshold?: number;
	auditCost?: number;
	actors?: ActorsMap;
	[key: string]: any;
}

export interface Product {
	companyId: string;
	riskLevel: RiskLevel;
	compliant: boolean;
	aiType: AIType;
	revenue: number;
	incidentCount: number;
	lastIncidentTurn: number | null;
}

export interface Company {
	id: string;
	type: CompanyType;
	capital: number;
	innovationCapacity: number;
	riskAppetite: number;
	products: Product[];
	bankrupt: boolean;
	inSandbox: boolean;
	complianceSpend: number;
	revenueLastTurn: number;
	turnExpenses: number;
	burnRate: number;
	runway: number;
	complianceMaturity: number;
	reputationScore: number;
	subsidyReceived: number;
	governmentContracts: number;
	insuranceMultiplier: number;
	fixedCost: number;
}

export interface SimulationState {
	turn: number;
	companies?: Company[];
	socialTrust: number;
	/**
	 * Legado: proxy de concentração de capital (HHI). Mantido como alias de
	 * hhiCapital para compatibilidade. Prefira hhiCapital/hhiRevenue/
	 * hhiHighRiskProducts, que identificam a base da métrica.
	 */
	hhi: number;
	hhiCapital: number;
	hhiRevenue: number;
	cloudDrain: number;
	totalProducts: number;
	compliantProducts: number;
	reputationScore: number;
	complementaryRatio: number;
	nonCompliantProducts: number;
	stateFundsUsed: number;
	totalCopyrightFees: number;
	systemicIncidentCount: number;
	compAICount: number;
	substAICount: number;
	genAICount: number;
	totalStateReturns: number;
	causalLog: ReadonlyArray<Record<string, unknown>>;

	adoption: AdoptionCurveSnapshot;
	marketCreation: MarketCreationSnapshot;

	timestamp?: number;
	activeStartups: number;
	activeBigTechs: number;
	hhiHighRiskProducts: number;
	compliantProductsRatio?: number;
	stateFundBalance: number;
	avgCapital: number;
	avgRunway: number;
	avgBurnRate: number;
	/** Empresas ativas com runway finito (base da média). */
	finiteRunwayCompanyCount: number;
	/** Empresas ativas com runway infinito (excluídas da média). */
	unlimitedRunwayCompanyCount: number;
	fullReport?: string;
	[key: string]: any;
}


export interface CriticalEvent {
	turn: number;
	type:
		| "CRASH"
		| "TRUST_DROP"
		| "MONOPOLY"
		| "INNOVATION_SPIKE"
		| "NEGLIGENCE"
		| "LOBBY"
		| "BIG_TECH_FAILURE"
		| string;
	text: string;
}

export interface BatchRunResult {
  iteration: number;
  seed: number;
  finalTurn: number;
  activeStartups: number;
  activeBigTechs: number;
  socialTrust: number;
  hhi: number;
  cloudDrain: number;
  compliantProducts: number;
  totalProducts: number;
  avgCapital: number;
}

export interface OATResult {
  parameter: string;
  value: number | string | boolean;
  avgStartups: number;
  avgBigTechs: number;
  avgTrust: number;
  avgHHI: number;
  avgComplianceRatio: number;
}

export type BigTechAction = "rd" | "compliance" | "lobby" | "wait";

/**
 * Identidade real do provedor de decisão, para metadados de reprodutibilidade.
 * Não confundir com agentMode (modo desejado) nem com o nome de registro.
 */
export type DecisionProviderKind =
  | "heuristic" // decisor interno semeado (determinístico)
  | "external-http" // chamada HTTP a provedor externo (não determinístico)
  | "custom" // decisor injetado pelo chamador (determinismo declarado pelo decisor)
  | "custom-local" // decisor customizado que executa localmente
  | "custom-external" // decisor customizado que chama recurso externo
  | "custom-unknown"; // decisor customizado sem identidade declarada

/**
 * Política de cache do provedor.
 * - "none": nunca cachear (padrão; evita correlação artificial entre decisões);
 * - "state": cachear por estado, exigindo companyId e turno na chave
 *   (somente quando o provedor declarar a operação idempotente).
 */
export type CachePolicy = "none" | "state";

/** Contexto de uma decisão estratégica (reprodutibilidade do cache por estado). */
export interface DecisionContext {
  companyId?: string;
  turn?: number;
}

/** Contrato ÚNICO de decisor. `kind` e `cachePolicy` são obrigatórios para
 *  eliminar inferências ambíguas sobre o provedor efetivo. */
export interface LLMDecider {
  decide(
    state: Record<string, unknown>,
    playbookId?: string,
    context?: DecisionContext,
  ): Promise<LLMDecision>;
  /** Identidade do provedor para metadados. */
  kind: DecisionProviderKind;
  /** Política de cache declarada. */
  cachePolicy: CachePolicy;
  /** Declaração explícita de determinismo (custom). Padrão: undefined (desconhecido). */
  isDeterministic?: boolean;
}

/**
 * Valida em runtime se um valor é uma BigTechAction válida.
 * Nunca substitua esta checagem por cast TypeScript (`as BigTechAction`).
 */
export function isBigTechAction(value: unknown): value is BigTechAction {
  return value === "rd" || value === "compliance" || value === "lobby" || value === "wait";
}

export interface LLMDecision {
	action: BigTechAction;
	reasoning: string;
	/** Registro causal quando a decisão passou por fallback de segurança. */
	fallbackReason?: string;
}

export interface AdoptionCurveSnapshot {
  adoptionComplementary: number;
  adoptionSubstitutive: number;
  adoptionGenerative: number;
  substitutionRate: number;
  adoptionVelocity: number;
  compCount: number;
  substCount: number;
  genCount: number;
  totalProducts: number;
}

export interface MarketCreationSnapshot {
  turn: number;
  totalCompanies: number;
  innovatingCompanies: number;
  highRiskCompanies: number;
  avgProductsPerCompany: number;
  diversityIndex: number;
}

export type TurnCausalEntry = Record<string, unknown>;
