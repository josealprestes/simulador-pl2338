import { CapitalFlowEngine } from "./CapitalFlowEngine";
import { InfrastructureEngine } from "./InfrastructureEngine";
import { LearningEngine } from "./LearningEngine";
import { HeuristicLLMDecider } from "./LLMAgent";
import { MetricsEngine } from "./MetricsEngine";
import { OpenSourceEngine } from "./OpenSourceEngine";
import { ProcurementEngine } from "./ProcurementEngine";
import { RNG } from "./RNG";
import {
	calculateBoycottPenalty,
	calculateSocialTrustFromTitulares,
	Titular,
} from "./Titular";
import {
	AIType,
	SimulationParams,
	CriticalEvent,
	LLMDecider,
	TurnCausalEntry,
} from "./types";
import { Company, Product } from "./Company";
import { SimulationInitializer } from "./SimulationInitializer";
import { ActorManager } from "./ActorManager";
import { SimulationHistory } from "./SimulationHistory";
import { LLMOrchestrator } from "./LLMOrchestrator";
export class Simulation {
 	params: SimulationParams;
 	seed: number;
 	rng: RNG;
 	actorState: Record<string, any> = {};
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
 	lastCloudDrain: number = 0;
 	_preTurnSocialTrust: number = 100;
 	// Inicializados com defaults e imediatamente substituídos por
 	// configureDecisionProviders() no construtor (satisfaz definite assignment).
 	llmDecider: LLMDecider = new HeuristicLLMDecider();
 	llmOrchestrator: LLMOrchestrator = new LLMOrchestrator();
 	actorManager: ActorManager;
 	simulationHistory: SimulationHistory;
 	playbook?: any;
 	wallClockStartTime: number | null = null;
 	/** Configuração original da simulação (imutável em runtime). */
 	private readonly _initialParams: SimulationParams;

 	/**
 	 * Acesso à configuração original via CÓPIA profunda: quem recebe este
 	 * objeto não pode mutar o estado interno da simulação. O reset continua
 	 * usando a configuração original íntegra.
 	 */
 	get initialParams(): SimulationParams {
 		if (typeof structuredClone === "function") {
 			return structuredClone(this._initialParams);
 		}
 		// Fallback: params são JSON-safe (números, strings, booleanos, arrays).
 		return JSON.parse(JSON.stringify(this._initialParams)) as SimulationParams;
 	}
 	/** Decisor externo genuinamente injetado pelo chamador (se houver). */
 	private readonly _externalDecider: LLMDecider | null;
 	private readonly externalDeciderInjected: boolean;
	/** Empresas que já geraram evento de lobby no turno corrente (anti-duplicação). */
	private lobbyLoggedThisTurn = new Set<string>();

 	/**
 	 * Metadados do provedor EFETIVO de decisão.
 	 * Refletem o decisor realmente usado, não o modo desejado (agentMode).
 	 */
 	get decisionMetadata(): {
 		mode: string;
 		provider: string;
 		strictlyReproducible: boolean;
 		externalLLMUsed: boolean;
 	} {
 		const d = this.llmDecider;
 		const isDet = d?.isDeterministic;
 		if (d?.kind === "external-http") {
 			return {
 				mode: "external-llm",
 				provider: "external-http",
 				strictlyReproducible: false,
 				externalLLMUsed: true,
 			};
 		}
 		if (
 			d?.kind === "custom" ||
 			d?.kind === "custom-local" ||
 			d?.kind === "custom-external" ||
 			d?.kind === "custom-unknown"
 		) {
 			// Decisor customizado: não presume LLM externa nem não determinismo.
 			// Apenas custom-external declara consumo externo; um custom local
 			// aleatório é não determinístico sem ser LLM externa.
 			return {
 				mode: "custom",
 				provider: d.kind,
 				strictlyReproducible: isDet === true,
 				externalLLMUsed: d.kind === "custom-external",
 			};
 		}
 		// Decisor injetado sem identidade declarada (contrato legado): nunca
 		// classificar como heurística.
 		if (this.externalDeciderInjected && !d?.kind) {
 			return {
 				mode: "custom",
 				provider: "custom-unknown",
 				strictlyReproducible: false,
 				externalLLMUsed: false,
 			};
 		}
 		return {
 			mode: "heuristic",
 			provider: "heuristic",
 			strictlyReproducible: true,
 			externalLLMUsed: false,
 		};
 		}

 	/**
 	 * Centraliza a criação e o registro dos provedores de decisão.
 	 *
 	 * Regras:
 	 * 1. o provedor "heuristic" é SEMPRE recriado com o RNG atual da simulação
 	 *    (reset e mudança de seed substituem o RNG, então o decisor antigo,
 	 *    ligado ao RNG anterior, é descartado);
 	 * 2. um decisor externo GENUINAMENTE injetado é preservado e registrado
 	 *    como "custom";
 	 * 3. sem decisor externo, o padrão é o HeuristicLLMDecider ligado ao RNG
 	 *    atual, também registrado como "custom" (compatibilidade com agentMode
 	 *    "llm", que consulta o provedor "custom");
 	 * 4. o orquestrador é recriado (limpa cache e provedores obsoletos).
 	 */
 	private configureDecisionProviders(): void {
 		this.llmOrchestrator = new LLMOrchestrator();
 		this.llmOrchestrator.registerProvider(
 			"heuristic",
 			new HeuristicLLMDecider(this.rng),
 		);
 		if (this.externalDeciderInjected && this._externalDecider) {
 			this.llmDecider = this._externalDecider;
 		} else {
 			this.llmDecider = new HeuristicLLMDecider(this.rng);
 		}
 		this.llmOrchestrator.registerProvider("custom", this.llmDecider);
 	}

 	constructor(initialParams: SimulationParams, llmDecider?: LLMDecider, playbook?: any) {
 		this._initialParams = Simulation.deepCloneParams(initialParams || Simulation.defaultParams());
 		this.params = Simulation.deepCloneParams(this.initialParams);
 		this.seed = Number.isFinite(this.params.seed) ? (this.params.seed as number) : 12345;
 		this.rng = new RNG(this.seed);
 		this._externalDecider = llmDecider ?? null;
 		this.externalDeciderInjected = llmDecider != null;
 		this.actorManager = new ActorManager(this.params);

 		// Inicializa usando o SimulationInitializer
 		const initializer = new SimulationInitializer(this);
 		initializer.initializeActorState();
		
 		this.companies = [];
 		this.titulares = [];
 		this.socialTrust = 100;
 		this.turn = 0;
 		this.wallClockStartTime = Date.now();
 		this.events = [];
 		this.criticalEvents = [];
 		this.computationalTime = 0;
 		this.history = [];
 		this.cumulativeCloudDrain = 0;
 		this.totalStateReturns = 0;
 		this.totalCopyrightFees = 0;
 		this.systemicIncidentCount = 0;
 		this.turnCausalLog = [];
 		this.simulationHistory = new SimulationHistory(this);
 		// Centraliza a criação e o registro de provedores de decisão
 		// (construtor, reset e mudança de seed/modo usam o mesmo caminho).
 		this.configureDecisionProviders();

 		// Usa o initializer para inicializar o mercado e titulares
 		initializer.initializeMarket();
 		initializer.initializeTitulares();
	}

	/**
	 * Deep clone seguro da configuração (params são dados puros).
	 * Garante que o objeto recebido pelo chamador nunca seja mutado.
	 */
	static deepCloneParams(params: SimulationParams): SimulationParams {
		return JSON.parse(JSON.stringify(params)) as SimulationParams;
	}

	/** Parâmetros padrão usados quando nenhuma configuração é fornecida. */
	static defaultParams(): SimulationParams {
		return {
			initialStartups: 20,
			initialBigTechs: 2,
			complianceCostHighRisk: 20000,
			auditProbability: 0.1,
			fineSeverity: 100000,
			sandboxCapacity: 5,
			lgpdIncidentChance: 0.15,
			socialSensibility: 10,
			generativeEnabled: false,
			generativeRevenueMultiplier: 1.8,
			generativeInfraCostMultiplier: 2.5,
			copyrightFeeRate: 0,
			systemicRiskChance: 0.05,
			generativeInnovationCost: 50000,
			generativeImpactFactor: 5.0,
			maxGovContracts: 10,
			reservedProcurementQuota: 0.3,
			maxTurns: 50,
			startupInitialCapital: 50000,
			bigTechInitialCapital: 500000,
			startupInnovationCapacity: 15,
			bigTechInnovationCapacity: 5,
		};
	}

	reset() {
		// Restaura os parâmetros de runtime para o estado inicial (lobby etc. são descartados).
		this.params = Simulation.deepCloneParams(this.initialParams);
		// ActorManager nunca opera com o objeto de parâmetros obsoleto.
		this.actorManager.setParams(this.params);
		const initializer = new SimulationInitializer(this);
		initializer.reset();
		// Provedores de decisão recriados com o RNG atual (pós-reset).
		this.configureDecisionProviders();
	}

	/**
	 * Define novos parâmetros para a simulação
	 */
	initializeTitulares() {
		const titularEnabled = this.params.titularEnabled ?? false;
		if (!titularEnabled) return;

		const titularCount = Math.min(
			this.params.titularCount ?? 200,
			500, // Limite máximo para não degradar performance
		);

		for (let i = 0; i < titularCount; i++) {
			// Usar RNG para dar variação inicial, mas manter alta confiança inicial
			// trustLevel é inicializado com 1.0 por default, mas pode ser reduzido
			this.titulares.push(
				new Titular(i, this.rng, {
					boycottThreshold: this.params.boycottThreshold ?? 0.3,
					// trustLevel inicial é 1.0 por default, mas podemos adicionar variação sutil
					initialTrustLevel: 0.8 + this.rng.next() * 0.2, // 0.8 to 1.0
				}),
			);
		}

		// Atualizar socialTrust inicial com base nos titulares
		this.socialTrust = calculateSocialTrustFromTitulares(this.titulares);
	}

	getActorConfig(name: string): Record<string, any> | null {
		return this.actorManager.getActorConfig(name);
	}

	isActorActive(name: string): boolean {
		return this.actorManager.isActorActive(name);
	}

	initializeMarket() {
		const numBigTechs = Number.isFinite(this.params.initialBigTechs)
			? this.params.initialBigTechs
			: 2;
		const numStartups = Number.isFinite(this.params.initialStartups)
			? this.params.initialStartups
			: 20;

		// Programação defensiva: garantir que companies é um array
		if (!Array.isArray(this.companies)) {
			this.companies = [];
		}

		for (let i = 0; i < numBigTechs; i++) {
			this.companies.push(
				new Company(`BT_${i}`, "BIG_TECH", this.rng, this.params),
			);
		}
		for (let i = 0; i < numStartups; i++) {
			this.companies.push(
				new Company(`ST_${i}`, "STARTUP", this.rng, this.params),
			);
		}
		this.simulationHistory.recordHistory();
	}

	setParams(newParams: Partial<SimulationParams>) {
		const previousActors = this.params.actors;
		const previousTitularEnabled = this.params.titularEnabled;
		const previousTitularCount = this.params.titularCount;
		const previousBoycottThreshold = this.params.boycottThreshold;
		const previousSeed = this.seed;
		const previousAgentMode = this.params.agentMode;

		this.params = { ...this.params, ...newParams } as SimulationParams;
		const seedChanged =
			Number.isFinite(newParams.seed) && newParams.seed !== previousSeed;
		if (seedChanged) {
			this.seed = newParams.seed as number;
			this.rng = new RNG(this.seed);
		}
	if (newParams.actors && newParams.actors !== previousActors) {
		const initializer = new SimulationInitializer(this);
		this.actorState = initializer.initializeActorState();
	}

	// Issue #97: Reinicializar titulares se parâmetros relacionados mudarem
	if (
		newParams.titularEnabled !== previousTitularEnabled ||
		newParams.titularCount !== previousTitularCount ||
		newParams.boycottThreshold !== previousBoycottThreshold ||
		seedChanged
	) {
		const initializer = new SimulationInitializer(this);
		this.titulares = [];
		initializer.initializeTitulares();
	}

	// ActorManager sincronizado com o objeto de parâmetros atual.
	this.actorManager.setParams(this.params);

	// Mudança de seed ou de modo de decisão: provedores recriados com o RNG atual.
	const agentModeChanged =
		newParams.agentMode !== undefined && newParams.agentMode !== previousAgentMode;
	if (seedChanged || agentModeChanged) {
		this.configureDecisionProviders();
	}
	}

	/**
	 * Executa um turno da simulação.
	 */
	async runTurn() {
		const startCpu = performance.now();

		// 1. Turn state reset logic
		const ctx = this._resetTurnState();

		// 2. Procurement + VC processing
		this._processFunding(ctx);

		// 3. Open source + infrastructure
		this._processInfrastructure(ctx);

		// 4. Company loop (fixed costs, R&D, revenue)
		await this._processCompanies(ctx);

		// 5. Social trust calculation
		this._updateSocialTrust(ctx);

		// 6. History recording
		this._recordTurn(ctx);

		const endCpu = performance.now();
		this.computationalTime = Date.now() - this.wallClockStartTime!;
	}

	/**
	 * Executa todos os turnos até o final da simulação.
	 */
	async runToEnd() {
		const maxTurns = this.params.maxTurns ?? 50;
		while (this.turn < maxTurns) {
			await this.runTurn();
		}
	}

	private _resetTurnState() {
		this.lobbyLoggedThisTurn.clear();
		if (this.socialTrust <= 0) this.socialTrust = 0;

		this.turnCausalLog = [];

		// Issue #541: Save pre-turn trust for per-turn drop capping
		this._preTurnSocialTrust = this.socialTrust;

		const currentHHI = MetricsEngine.calculateHHI(
			this.companies.filter((c) => !c.bankrupt),
			"capital",
		);
		const innovationHHIModifier = MetricsEngine.getInnovationModifier(
			currentHHI,
			this.params.innovationHHIThresholds,
			this.params.innovationHHIModifiers,
		);

		this.companies.forEach((c) => {
			// Feedback innovationCapacity based on current market concentration (HHI)
			const baseCapacity =
				c.type === "BIG_TECH"
					? (this.params.bigTechInnovationCapacity ?? 5)
					: (this.params.startupInnovationCapacity ?? 15);
			c.innovationCapacity = baseCapacity * innovationHHIModifier;

			c.turnExpenses = 0;
			c.revenueLastTurn = 0;
			c.governmentContracts = 0;
			c.complianceSpend = 0; // Reset a cada turno para Fórmula de Hand
		});

		return {
			turnEvents: [] as string[],
			startupBankruptciesThisTurn: 0,
			bigTechBankruptciesThisTurn: 0,
			incidentsThisTurn: 0,
			turnHadIncident: false,
			sandboxCount: this.companies.filter((c) => c.inSandbox && !c.bankrupt).length,
			companiesWithIncidents: new Set<string>(),
			innovationCostMultiplier: 1.0,
		};
	}

	private _processFunding(ctx: any) {
		const procurementEvents = ProcurementEngine.processProcurement(
			this.companies,
			this.params,
			this.rng,
		);
		ctx.turnEvents.push(...procurementEvents);

		const vcConfig = this.actorManager.getActorConfig("ventureCapital");
		if (vcConfig) {
			const vcResult = CapitalFlowEngine.processVC(
				this.companies,
				this.params,
				this.socialTrust,
				this.rng,
				vcConfig,
				this.actorState.ventureCapital,
			);
			ctx.turnEvents.push(...vcResult.events);
			this.turnCausalLog.push(...vcResult.causalLog);
		}

		const stateConfig = this.actorManager.getActorConfig("stateFund");
		if (stateConfig) {
			const stateResult = CapitalFlowEngine.processState(
				this.companies,
				this.params,
				stateConfig,
				this.actorState.stateFund,
			);
			ctx.turnEvents.push(...stateResult.events);
			this.turnCausalLog.push(...stateResult.causalLog);
		}
	}

	private _processInfrastructure(ctx: any) {
		const openSourceConfig = this.actorManager.getActorConfig("openSource");
		if (openSourceConfig) {
			const osResult = OpenSourceEngine.processOpenSource(
				this.turn,
				openSourceConfig,
			);
			if (osResult.launched) {
				ctx.innovationCostMultiplier = osResult.costMultiplier;
				ctx.turnEvents.push(
					`🌐 OPEN SOURCE: Novo modelo lançado! Custo de P&D reduzido.`,
				);
			}
		}

		const infrastructureConfig = this.actorManager.getActorConfig("infrastructure");
		if (infrastructureConfig) {
			const cloudResult = InfrastructureEngine.processCloudRent(
				this.companies,
				infrastructureConfig,
			);
			this.lastCloudDrain = cloudResult.totalDrain;
			this.cumulativeCloudDrain += cloudResult.totalDrain;
		} else {
			this.lastCloudDrain = 0;
		}
	}

	private async _processCompanies(ctx: any) {
		// Acemoglu: Erosão da confiança social por automação substitutiva
		this._processAutomationErosion();

		const titularEnabled = this.params.titularEnabled ?? false;

		// Main operational loop
		for (const c of this.companies.filter((c) => !c.bankrupt)) {
			this._processFixedCostsAndInsurance(c);
			this._processAudit(c, ctx);
			this._processRevenue(c, titularEnabled, ctx);
			await this._processStrategicDecisions(c, ctx);
			this._processIncidents(c, titularEnabled, ctx);
			this._processMaturityAndReputation(c, ctx);
			this._processBurnRateAndBankruptcy(c, ctx);
		}
	}

	private _processAutomationErosion() {
		const activeSubstitutiveCount = this.companies
			.filter((c) => !c.bankrupt)
			.reduce(
				(acc, c) =>
					acc + c.products.filter((p) => p.aiType === "SUBSTITUTIVE").length,
				0,
			);
		if (activeSubstitutiveCount > 0) {
			const erosion =
				activeSubstitutiveCount * (this.params.automationErosionRate ?? 0);
			const previousTrust = this.socialTrust;
			this.socialTrust = Math.max(0, this.socialTrust - erosion);
			if (Math.abs(previousTrust - this.socialTrust) > 5) {
				this.turnCausalLog.push({
					type: "trustShift",
					delta: Math.round(previousTrust - this.socialTrust),
					cause: "automation_erosion",
				});
			}
		}
	}

	private _processFixedCostsAndInsurance(c: Company) {
		const insurancePremium =
			c.products
				.filter((p) => p.riskLevel === "HIGH")
				.reduce((acc) => acc + (this.params.insurancePremium ?? 500), 0) *
			(c.insuranceMultiplier ?? 1.0);

		if (insurancePremium > 0) {
			c.capital -= insurancePremium;
			c.turnExpenses += insurancePremium;
		}

		// Use the company's individual fixedCost (set in constructor with normal dispersion)
		let fixedCosts = c.fixedCost;

		const substitutiveCount = c.products.filter(
			(p) => p.aiType === "SUBSTITUTIVE",
		).length;
		const reductionFactor = Math.max(0.4, 1 - substitutiveCount * 0.08);
		fixedCosts *= reductionFactor;

		const generativeCount = c.products.filter(
			(p) => p.aiType === "GENERATIVE",
		).length;
		if (generativeCount > 0) {
			const genInfraCost =
				generativeCount *
				(this.params.infraCostPerProduct ?? 2000) *
				(this.params.generativeInfraCostMultiplier ?? 2.5);
			fixedCosts += genInfraCost;

			const copyrightFee =
				c.revenueLastTurn * (this.params.copyrightFeeRate ?? 0.03);
			if (copyrightFee > 0) {
				c.capital -= copyrightFee;
				c.turnExpenses += copyrightFee;
				this.totalCopyrightFees += copyrightFee;
			}
		}

		c.capital -= fixedCosts;
		c.turnExpenses += fixedCosts;
	}

	private _processAudit(c: Company, ctx: any) {
		const hasHighRiskProducts = (c.products || []).some(
			(p) => p.riskLevel === "HIGH",
		);
		const isAudited =
			hasHighRiskProducts &&
			this.rng.next() < (this.params.auditProbability ?? 0.1);

		if (!isAudited) return;

		const auditCost = this.params.auditCost ?? 2000;
		if (c.capital >= auditCost) {
			c.capital -= auditCost;
			c.turnExpenses += auditCost;
			ctx.turnEvents.push(
				`⚖️ AUDITORIA: ${c.id} auditada (Custo: R$${auditCost}).`,
			);

			const nonCompliantHighRisk = c.products.filter(
				(p) => p.riskLevel === "HIGH" && !p.compliant,
			);
			if (nonCompliantHighRisk.length > 0) {
				c.capital -= this.params.fineSeverity;
				c.turnExpenses += this.params.fineSeverity;
				ctx.turnEvents.push(
					`⚖️ AUDITORIA: ${c.id} reprovada e multada por não conformidade.`,
				);

				const complianceThreshold =
					c.type === "BIG_TECH"
						? (this.params.bigTechComplianceThreshold ?? 1)
						: (this.params.startupComplianceThreshold ?? 0.8);

				if (
					c.capital > (this.params.complianceCostHighRisk ?? 20000) &&
					c.riskAppetite < complianceThreshold
				) {
					nonCompliantHighRisk[0].compliant = true;
					c.capital -= this.params.complianceCostHighRisk ?? 20000;
					c.turnExpenses += this.params.complianceCostHighRisk ?? 20000;
					ctx.turnEvents.push(
						`🛠️ ${c.id} decidiu se adequar após a multa da auditoria.`,
					);
				}
			}
		} else {
			const penalty = auditCost * 5;
			c.capital -= penalty;
			c.turnExpenses += penalty;
			ctx.turnEvents.push(
				`⚖️ AUDITORIA: ${c.id} multada por falha no custeio da auditoria.`,
			);
		}
	}

	private _processRevenue(c: Company, titularEnabled: boolean, ctx: any) {
		const reputationRevenueImpact =
			this.params.reputationRevenueImpact ?? 0.3;
		const reputationImpact = this.params.reputationEnabled
			? 1 + (c.reputationScore - 0.5) * reputationRevenueImpact
			: 0.5 + c.reputationScore * 0.5;

		const revenueMultiplier = Math.max(
			this.params.trustRevenueFloor ?? 0,
			this.socialTrust / 100,
		);
		const totalProductRevenue = c.products.reduce(
			(acc, p) => acc + p.revenue * revenueMultiplier * reputationImpact,
			0,
		);

		let boycottPenalty = 0;
		if (titularEnabled && this.titulares.length > 0) {
			boycottPenalty = calculateBoycottPenalty(
				this.titulares,
				c.id,
				this.params.boycottRevenuePenalty ?? 500,
			);
		}

		const netRevenue = Math.max(0, totalProductRevenue - boycottPenalty);
		c.revenueLastTurn += netRevenue;
		c.capital += netRevenue;

		if (boycottPenalty > 0) {
			ctx.turnEvents.push(
				`🚫 BOICOTE: ${c.id} perdeu R$${Math.round(boycottPenalty)} em receita por boicote de titulares.`,
			);
		}
	}

	private async _processStrategicDecisions(c: Company, ctx: any) {
		if (
			c.type === "STARTUP" &&
			!c.inSandbox &&
			ctx.sandboxCount < this.params.sandboxCapacity
		) {
			if (this.rng.next() > 0.5) {
				c.inSandbox = true;
				ctx.sandboxCount++;
			}
		}

		if (c.capital <= 10000 || this.rng.next() >= c.innovationCapacity / 100) {
			return;
		}

		let chosenAction: string = "rd";

		if (this.params.agentMode === "llm" && c.type === "BIG_TECH") {
			const decision = await this.llmOrchestrator.decide(
				{
					capital: c.capital,
					productCount: c.products.length,
					compliantCount: c.products.filter((p) => p.compliant).length,
					reputation: c.reputationScore,
					socialTrust: this.socialTrust,
				},
				(this.params.playbookId ?? "") as string,
				"custom",
				// Contexto da decisão: impede que o cache (quando habilitado)
				// misture decisões de empresas ou turnos diferentes.
				{ companyId: c.id, turn: this.turn },
			);
			chosenAction = decision.action;

			this.turnCausalLog.push({
				type: "llmDecision",
				companyId: c.id,
				action: chosenAction,
				reasoning: decision.reasoning,
				...(decision.fallbackReason
					? { fallbackReason: decision.fallbackReason }
					: {}),
			});
		}

		if (chosenAction === "rd") {
			this._processInnovation(c, ctx);
		} else if (chosenAction === "compliance") {
			this._processComplianceDecision(c, ctx);
		} else if (chosenAction === "lobby" && this.params.lobbyEnabled) {
			this._processLobby(c, ctx);
		}
	}

	private _processInnovation(c: Company, ctx: any) {
		const highRiskThreshold =
			c.type === "BIG_TECH"
				? (this.params.bigTechHighRiskThreshold ?? 0)
				: (this.params.startupHighRiskThreshold ?? 0.4);
		const wantsHighRisk = c.riskAppetite > highRiskThreshold;
		const aiTypeRoll = this.rng.next();

		if (wantsHighRisk) {
			let aiType: AIType = "COMPLEMENTARY";
			if (this.params.substitutiveEnabled) {
				if (this.params.generativeEnabled && aiTypeRoll < 0.2 && c.capital > 100000) {
					aiType = "GENERATIVE";
				} else if (aiTypeRoll < 0.5) {
					aiType = "SUBSTITUTIVE";
				}
			}

			let costOfCompliance = this.params.complianceCostHighRisk;
			if (c.inSandbox)
				costOfCompliance *= this.params.sandboxComplianceMultiplier ?? 0.2;

			const baseInnovationCost =
				aiType === "GENERATIVE"
					? (this.params.generativeInnovationCost ?? 50000)
					: (this.params.highRiskInnovationCost ?? 10000);

			const innovationBaseCost = baseInnovationCost * ctx.innovationCostMultiplier;

			const canAffordCompliance = c.capital > innovationBaseCost + costOfCompliance;
			const complianceThreshold =
				c.type === "BIG_TECH"
					? (this.params.bigTechComplianceThreshold ?? 1)
					: (this.params.startupComplianceThreshold ?? 0.8);

			const decidesToComply = canAffordCompliance && c.riskAppetite < complianceThreshold;

			if (decidesToComply) {
				const spend = innovationBaseCost + costOfCompliance;
				c.capital -= spend;
				c.turnExpenses += spend;
				c.complianceSpend += costOfCompliance;
				const newProduct = new Product(c.id, "HIGH", true, this.params, aiType);
				c.products.push(newProduct);
				ctx.turnEvents.push(`🚀 ${c.id} lançou IA de Alto Risco (${aiType}).`);
				this.turnCausalLog.push({
					type: "innovation",
					company: c.id,
					product: newProduct,
					compliant: true,
					aiType,
				});
			} else {
				const spend = baseInnovationCost;
				c.capital -= spend;
				c.turnExpenses += spend;
				const newProduct = new Product(c.id, "HIGH", false, this.params, aiType);
				c.products.push(newProduct);
				ctx.turnEvents.push(`🚀 ${c.id} lançou IA de Alto Risco (${aiType}) não conforme.`);
				this.turnCausalLog.push({
					type: "innovation",
					company: c.id,
					product: newProduct,
					compliant: false,
					aiType,
				});
			}
		} else {
			const spend = this.params.minimalRiskInnovationCost ?? 2000;
			c.capital -= spend;
			c.turnExpenses += spend;
			const newProduct = new Product(c.id, "MINIMAL", true, this.params, "COMPLEMENTARY");
			c.products.push(newProduct);
			this.turnCausalLog.push({
				type: "innovation",
				company: c.id,
				product: newProduct,
				compliant: true,
				aiType: "COMPLEMENTARY",
			});
		}
	}

	private _processComplianceDecision(c: Company, ctx: any) {
		const nonCompliant = c.products.filter((p) => !p.compliant);
		if (nonCompliant.length > 0) {
			const p = nonCompliant[0];
			p.compliant = true;
			const cost = 5000;
			c.capital -= cost;
			c.turnExpenses += cost;
			ctx.turnEvents.push(
				`🛠️ ${c.id} investiu em adequação de produto (${p.riskLevel}) por decisão estratégica.`,
			);
		}
	}

	private _processLobby(c: Company, ctx: any) {
		if (!this.params.lobbyEnabled) return;
		const cost = 15000;
		const auditProbabilityBefore = this.params.auditProbability ?? 0.1;
		const auditProbabilityAfter = Math.max(0, auditProbabilityBefore - 0.04);
		c.capital -= cost;
		c.turnExpenses += cost;
		this.params.auditProbability = auditProbabilityAfter;
		ctx.turnEvents.push(`🤝 ${c.id} realizou ações de lobby institucional.`);
		// Registro causal técnico (fonte para validação e relatório).
		this.turnCausalLog.push({
			type: "lobby",
			companyId: c.id,
			cost,
			auditProbabilityBefore,
			auditProbabilityAfter,
		});
		// Evento estruturado observável (fonte de exibição), sem duplicação
		// para a mesma empresa no mesmo turno.
		if (!this.lobbyLoggedThisTurn.has(c.id)) {
			this.lobbyLoggedThisTurn.add(c.id);
			this.criticalEvents.push({
				turn: this.turn,
				type: "LOBBY",
				text:
					`${c.id} realizou ação de lobby; a probabilidade de auditoria ` +
					`passou de ${auditProbabilityBefore.toFixed(2)} para ${auditProbabilityAfter.toFixed(2)}.`,
			});
		}
	}

	private _processIncidents(c: Company, titularEnabled: boolean, ctx: any) {
		const learningConfig = this.actorManager.getActorConfig("learning");
		const nonCompliantHighRisk = c.products.filter(
			(p) => p.riskLevel === "HIGH" && !p.compliant,
		);
		const candidates = nonCompliantHighRisk.filter(
			(p) => p.lastIncidentTurn !== this.turn,
		);

		// Systemic risks from generative AI
		const generativeProducts = c.products.filter(p => p.aiType === "GENERATIVE");
		generativeProducts.forEach(() => {
			if (this.rng.next() < (this.params.systemicRiskChance ?? 0.05)) {
				const trustDrop = (this.params.generativeImpactFactor ?? 5.0) * 2;
				this.socialTrust = Math.max(0, this.socialTrust - trustDrop);
				this.systemicIncidentCount++;
				ctx.turnEvents.push(`⚠️ SISTÊMICO: ${c.id} envolvida em incidente de desinformação (Deepfake).`);
				this.turnCausalLog.push({
					type: "trustShift",
					delta: trustDrop,
					cause: "generative_systemic",
					company: c.id
				});
			}
		});

		candidates.forEach((product) => {
			let incidentChance = this.params.lgpdIncidentChance;
			if (learningConfig)
				incidentChance = LearningEngine.getAdjustedIncidentChance(
					incidentChance,
					c.complianceMaturity,
				);

			const reputationModifier = 1 - c.reputationScore;
			incidentChance *= 1 + reputationModifier;

			if (this.rng.next() < incidentChance) {
				product.lastIncidentTurn = this.turn;
				product.incidentCount++;
				ctx.turnHadIncident = true;
				ctx.companiesWithIncidents.add(c.id);
				const impactFactor =
					this.params.substitutiveEnabled && product.aiType === "SUBSTITUTIVE"
						? (this.params.substitutiveImpactFactor ?? 3.0)
						: 1.0;

				if (titularEnabled && this.titulares.length > 0) {
					const titularImpactRate = this.params.titularImpactRate ?? 0.05;
					const trustReduction = this.params.titularTrustReduction ?? 0.1;
					const affectedCount = Math.floor(
						this.titulares.length * titularImpactRate,
					);
					const affectedIndices: number[] = [];
					while (
						affectedIndices.length < affectedCount &&
						affectedIndices.length < this.titulares.length
					) {
						const idx = Math.floor(this.rng.next() * this.titulares.length);
						if (!affectedIndices.includes(idx)) affectedIndices.push(idx);
					}
					for (const idx of affectedIndices)
						this.titulares[idx].reactToIncident(c.id, { trustReduction });
					this.socialTrust = calculateSocialTrustFromTitulares(
						this.titulares,
					);
				} else {
					const previousTrust = this.socialTrust;
					this.socialTrust -= this.params.socialSensibility * impactFactor;
					if (Math.abs(previousTrust - this.socialTrust) > 5) {
						this.turnCausalLog.push({
							type: "trustShift",
							delta: Math.round(previousTrust - this.socialTrust),
							cause: "incident",
						});
					}
				}

				if (this.params.reputationEnabled) {
					const penaltyAmount =
						this.params.reputationPenaltyPerIncident ?? 0.2;
					c.applyReputationPenalty(penaltyAmount, (c.incidentCount ?? 0) > 0);
					c.incidentCount = (c.incidentCount ?? 0) + 1;
				} else {
					c.reputationScore = Math.max(0, c.reputationScore - 0.2);
				}
				ctx.incidentsThisTurn++;

				const isInsured =
					(c.products || []).some((p) => p.riskLevel === "HIGH") &&
					(this.params.insurancePremium ?? 500) > 0;
				const coverage = isInsured
					? (this.params.insuranceCoverage ?? 0.5)
					: 0;

				let fineMultiplier = 1;
				let isNegligent = false;

				if (this.params.handFormulaEnabled) {
					const P = this.params.auditProbability ?? 0.1;
					const L = this.params.fineSeverity ?? 100000;
					const threshold = P * L;
					if (c.complianceSpend < threshold) {
						fineMultiplier = this.params.negligenceMultiplier ?? 2.5;
						isNegligent = true;
					}
				}
				const reoffenderMultiplier =
					product.incidentCount > 1
						? (this.params.reoffenderMultiplier ?? 1.5)
						: 1.0;
				const baseFine =
					product.riskLevel === "HIGH"
						? this.params.fineSeverity
						: this.params.fineSeverity / 2;
				const proportionalFine = this.params.proportionalFinesEnabled
					? Math.min(baseFine * 10, c.revenueLastTurn * 0.1)
					: baseFine;
				const penalty =
					proportionalFine *
					fineMultiplier *
					reoffenderMultiplier *
					(1 - coverage);

				ctx.turnEvents.push(
					`🚨 INCIDENTE: ${c.id} multada em R$${Math.round(penalty)}${isNegligent ? " [NEGLIGÊNCIA]" : ""}.`,
				);
				c.capital -= penalty;
				c.turnExpenses += penalty;

				const complianceThreshold =
					c.type === "BIG_TECH"
						? (this.params.bigTechComplianceThreshold ?? 1)
						: (this.params.startupComplianceThreshold ?? 0.8);
				if (
					c.capital > (this.params.complianceCostHighRisk ?? 20000) &&
					c.riskAppetite < complianceThreshold
				) {
					product.compliant = true;
					c.capital -= this.params.complianceCostHighRisk ?? 20000;
					c.turnExpenses += this.params.complianceCostHighRisk ?? 20000;
					ctx.turnEvents.push(`🛠️ ${c.id} decidiu se adequar após o incidente.`);
				}

				this.turnCausalLog.push({
					type: "incident",
					company: c.id,
					product: product,
					fine: Math.round(penalty),
					incidentCount: (c.incidentCount ?? 0) + 1,
					negligent: isNegligent,
					insured: isInsured,
				});
				if (isNegligent) {
					this.criticalEvents.push({
						turn: this.turn + 1,
						type: "NEGLIGENCE",
						text: `Negligência: ${c.id} gastou pouco em conformidade (R$${Math.round(c.complianceSpend)} < PxL).`,
					});
				}
				c.insuranceMultiplier = (c.insuranceMultiplier ?? 1.0) * 1.2;
			} else if (!this.params.reputationEnabled) {
				c.reputationScore = Math.min(1.0, c.reputationScore + 0.01);
			}
		});
	}

	private _processMaturityAndReputation(c: Company, ctx: any) {
		const learningConfig = this.actorManager.getActorConfig("learning");

		if (learningConfig)
			c.complianceMaturity = LearningEngine.evolveMaturity(
				c.complianceMaturity,
				learningConfig,
			);

		if (this.params.reputationEnabled) {
			if (!ctx.companiesWithIncidents.has(c.id)) {
				const recoveryRate = this.params.reputationRecoveryRate ?? 0.02;
				c.applyReputationDecay(recoveryRate);
				if (c.complianceMaturity >= 0.7) c.applyReputationDecay(0.005);
			}
		}
	}

	private _processBurnRateAndBankruptcy(c: Company, ctx: any) {
		c.burnRate = Math.max(0, c.turnExpenses - c.revenueLastTurn);
		c.runway = c.burnRate > 0 ? Math.floor(c.capital / c.burnRate) : Infinity;
		
		// #546: Runway-based bankruptcy — no more uniform cliff
		// Capital must actually reach 0 for bankruptcy to trigger.
		// When capital < 3x burnRate the startup enters risk state
		// and may receive angel investment (5-10% chance).
		const isAtRisk = c.burnRate > 0 && c.capital < c.burnRate * 3;
		
		if (isAtRisk) {
			// Companies with COMPLEMENTARY products have 20% higher rescue chance
			const hasComplementary = c.products.some(p => p.aiType === "COMPLEMENTARY");
			const baseRescueChance = 0.08; // 8% base (within 5-10% range)
			const rescueChance = hasComplementary ? baseRescueChance * 1.2 : baseRescueChance;
			
			if (this.rng.next() < rescueChance) {
				// Angel rescue: inject 1-2 turns of burnRate
				const rescueAmount = Math.round(c.burnRate * (1 + this.rng.next()));
				c.capital += rescueAmount;
				ctx.turnEvents.push(`👼 INVESTIMENTO ANJO: ${c.id} recebeu R$${rescueAmount} de investimento anjo!`);
				this.turnCausalLog.push({
					type: "rescue",
					company: c.id,
					companyType: c.type,
					reason: "angel_investment",
				});
			}
		}
		
		// Only bankrupt when capital is truly exhausted (<= 0)
		if (c.capital <= 0) {
			c.bankrupt = true;
			c.inSandbox = false;
			c.runway = 0;
			if (c.type === "STARTUP") ctx.startupBankruptciesThisTurn++;
			else ctx.bigTechBankruptciesThisTurn++;
			ctx.turnEvents.push(`💀 FALÊNCIA: ${c.id} faliu.`);
			this.turnCausalLog.push({
				type: "exit",
				company: c.id,
				companyType: c.type,
				reason: "bankruptcy",
			});
		}
	}

	private _updateSocialTrust(ctx: any) {
		if (this.isActorActive("stateFund") && this.params.stateRoyaltyEnabled) {
			const stateReturns = CapitalFlowEngine.collectStateReturns(
				this.companies,
				this.params,
				this.actorState.stateFund,
			);
			ctx.turnEvents.push(...stateReturns.events);
			this.totalStateReturns += stateReturns.totalReturns;
		}

		// Issue #97: Recuperação de confiança dos titulares
		const titularEnabled = this.params.titularEnabled ?? false;
		if (titularEnabled && this.titulares.length > 0 && !ctx.turnHadIncident) {
			const titularRecoveryRate = this.params.titularRecoveryRate ?? 0.01;
			for (const titular of this.titulares) {
				titular.recoverTrust(titularRecoveryRate);
			}
			// Atualizar socialTrust após recuperação
			this.socialTrust = calculateSocialTrustFromTitulares(this.titulares);
		}

		// Issue #541: Trust recovery fallback (non-titular mode)
		// Issue #545: Trust recovery proporcional a startups ativas / iniciais
		// Playbooks com confiança endógena (nash, sandbox_anpd, autorregulacao_setorial)
		// precisam de recovery mais forte para evitar trust collapse.
		// Recovery = floor dinâmico (0.1 * trust) + bônus de ecossistema (1.0 * startupRatio)
		if (!titularEnabled && !ctx.turnHadIncident && this.socialTrust < 100) {
			const activeStartupsCount = this.companies.filter(
				(c) => c.type === "STARTUP" && !c.bankrupt,
			).length;
			const initialStartupCount = this.params.initialStartups ?? 20;
			const startupRatio =
				initialStartupCount > 0
					? Math.min(1, activeStartupsCount / initialStartupCount)
					: 0.5;

			// Trust floor dinâmico: 10% do trust atual, mínimo 0.5
			// Ex: trust=14 → 1.4, trust=50 → 5.0, trust=80 → 8.0
			const dynamicFloor =
				this.socialTrust > 0
					? Math.max(0.5, 0.1 * this.socialTrust)
					: 0.5;

			// Bônus proporcional a startups ativas (ecossistema saudável → mais recovery)
			const ecosystemBonus = 1.0 * startupRatio;

			const recoveryRate = dynamicFloor + ecosystemBonus;
			this.socialTrust = Math.min(100, this.socialTrust + recoveryRate);
		}

		// Issue #545: Cap per-turn trust drops mais suave (max 8 pts em vez de 15)
		// Limita a queda máxima de confiança em um único turno para evitar colapso
		if (this._preTurnSocialTrust !== undefined) {
			const grossDrop = this._preTurnSocialTrust - this.socialTrust;
			if (grossDrop > 8) {
				this.socialTrust = this._preTurnSocialTrust - 8;
			}
		}

		// Issue #95: Lobby Power - Captura regulatória dinâmica (Stigler 1971)
		const lobbyEnabled = this.params.lobbyEnabled ?? false;
		if (lobbyEnabled) {
			const lobbyCapitalThreshold =
				this.params.lobbyCapitalThreshold ?? 5000000;
			const lobbySuccessRate = this.params.lobbySuccessRate ?? 0.15;
			const lobbyAuditReduction = this.params.lobbyAuditReduction ?? 0.03;
			const lobbyCompliancePenalty = this.params.lobbyCompliancePenalty ?? 5000;
			const complianceCostCap = this.params.complianceCostCap ?? 200000;

			// Verificar Big Techs com capital suficiente
			const bigTechs = this.companies.filter(
				(c) => c.type === "BIG_TECH" && !c.bankrupt,
			);
			for (const bt of bigTechs) {
				if (
					bt.capital >= lobbyCapitalThreshold &&
					this.rng.next() < lobbySuccessRate
				) {
					// Evento de lobby bem-sucedido
					const oldAuditProbability = this.params.auditProbability ?? 0.1;
					const oldComplianceCost = this.params.complianceCostHighRisk ?? 20000;

					// Aplicar mudanças
					this.params.auditProbability = Math.max(
						0,
						oldAuditProbability - lobbyAuditReduction,
					);
					this.params.complianceCostHighRisk = Math.min(
						complianceCostCap,
						oldComplianceCost + lobbyCompliancePenalty,
					);

					// Registrar evento
					this.criticalEvents.push({
						turn: this.turn + 1,
						type: "LOBBY",
						text: `🏛️ CAPTURA REGULATÓRIA: ${bt.id} (R$${Math.round(bt.capital)}) influenciou o ambiente regulatório. Auditoria: ${oldAuditProbability.toFixed(2)} → ${this.params.auditProbability.toFixed(2)}. Custo de conformidade: R$${oldComplianceCost} → R$${this.params.complianceCostHighRisk}.`,
					});

					ctx.turnEvents.push(
						`🏛️ LOBBY: ${bt.id} obeve sucesso na captura regulatória!`,
					);
				}
			}
		}
	}

	private _recordTurn(ctx: any) {
		this.turn++;
		this.events = [
			...ctx.turnEvents.map((e: string) => `[T${this.turn}] ${e}`),
			...this.events,
		].slice(0, 50);
		this.simulationHistory.recordHistory();

		// Check for scheduled critical events in the playbook
		if (this.playbook?.criticalEvents) {
			const scheduledEvents = this.playbook.criticalEvents.filter(
				(e: any) => e.turn === this.turn,
			);
			scheduledEvents.forEach((e: any) => {
				this.criticalEvents.push({
					turn: this.turn,
					type: e.type as any,
					text: e.description || e.text,
				});
			});
		}

		if (ctx.startupBankruptciesThisTurn >= 3) {
			this.criticalEvents.push({
				turn: this.turn,
				type: "CRASH",
				text: `Onda de falências: ${ctx.startupBankruptciesThisTurn} startups sucumbiram aos custos, incidentes ou sanções.`,
			});
		}
		if (ctx.bigTechBankruptciesThisTurn > 0) {
			this.criticalEvents.push({
				turn: this.turn,
				type: "BIG_TECH_FAILURE",
				text: `${ctx.bigTechBankruptciesThisTurn} Big Tech(s) também faliram, indicando choque sistêmico extremo.`,
			});
		}
		if (ctx.incidentsThisTurn >= 2 && this.socialTrust < 80) {
			this.criticalEvents.push({
				turn: this.turn,
				type: "TRUST_DROP",
				text: `A confiança social foi gravemente abalada por múltiplos vazamentos ou falhas éticas.`,
			});
		}

		const hhiForMonopoly = this.history[this.history.length - 1].hhi;
		if (
			hhiForMonopoly > 2500 &&
			(this.history.length < 2 ||
				this.history[this.history.length - 2].hhi <= 2500)
		) {
			this.criticalEvents.push({
				turn: this.turn,
				type: "MONOPOLY",
				text: `O proxy de concentração ultrapassou o limiar definido, sugerindo possível aumento da concentração patrimonial sob os parâmetros simulados.`,
			});
		}
	}


	recordHistory() {
		this.simulationHistory.recordHistory();
	}

	/**
	 * Generates a deterministic SHA-256 technical identifier.
	 */
	async generateReportHash(): Promise<string> {
		return this.simulationHistory.generateReportHash();
	}

	exportHistory(format = "json", playbookId = "", seedValue = this.seed): string {
		return this.simulationHistory.exportHistory(format, playbookId, seedValue);
	}
	}
