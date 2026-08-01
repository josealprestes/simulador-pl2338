import { RNG } from "./RNG";
import {
	Company as ICompany,
	Product as IProduct,
	SimulationParams,
	CompanyType,
	RiskLevel,
	AIType,
} from "./types";

/**
 * Box-Muller transform to generate a normally-distributed random value.
 * Uses two uniform [0,1) samples from the RNG.
 */
function normalRandom(rng: RNG, mean: number, std: number): number {
	const u1 = Math.max(1e-10, rng.next());
	const u2 = rng.next();
	const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
	return mean + z * std;
}

export class Company implements ICompany {
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
	incidentCount?: number;
	fixedCost: number;

	constructor(id: string, type: CompanyType, rng: RNG, params: Partial<SimulationParams> = {}) {
		this.id = id;
		this.type = type;
		this.capital =
			type === "BIG_TECH"
				? (params.bigTechInitialCapital ?? 500000)
				: (params.startupInitialCapital ?? 50000);
		this.innovationCapacity =
			type === "BIG_TECH"
				? (params.bigTechInnovationCapacity ?? 5)
				: (params.startupInnovationCapacity ?? 15);
		this.riskAppetite = rng.next();
		this.products = [];
		this.bankrupt = false;
		this.inSandbox = false;
		this.complianceSpend = 0;
		this.revenueLastTurn = 0;
		this.turnExpenses = 0;
		this.burnRate = 0;
		this.runway = Infinity;
		this.complianceMaturity = 0;
		this.reputationScore = 1.0;
		this.subsidyReceived = 0;
		this.governmentContracts = 0;
		this.insuranceMultiplier = 1.0;
		// Individual fixed cost with normal dispersion (std = 30% of mean)
		// Only startups get the variance; big techs use the configured value directly
		if (type === "STARTUP") {
			const meanFixedCost = params.startupFixedCost ?? 2000;
			const stdFixedCost = meanFixedCost * 0.3;
			this.fixedCost = Math.max(100, Math.round(normalRandom(rng, meanFixedCost, stdFixedCost)));
		} else {
			this.fixedCost = params.bigTechFixedCost ?? 20000;
		}
	}

	applyReputationDecay(recoveryRate: number) {
		this.reputationScore = Math.min(1, this.reputationScore + recoveryRate);
	}

	applyReputationPenalty(penalty: number, isRepeatOffender = false) {
		const factor = isRepeatOffender ? 1.5 : 1.0;
		this.reputationScore = Math.max(0, this.reputationScore - penalty * factor);
	}
}

export class Product implements IProduct {
	companyId: string;
	riskLevel: RiskLevel;
	compliant: boolean;
	aiType: AIType;
	revenue: number;
	incidentCount: number;
	lastIncidentTurn: number | null;

	constructor(
		companyId: string,
		riskLevel: RiskLevel,
		compliant: boolean,
		params: Partial<SimulationParams> = {},
		aiType: AIType = "COMPLEMENTARY",
	) {
		this.companyId = companyId;
		this.riskLevel = riskLevel;
		this.compliant = compliant;
		this.aiType = aiType;
		this.incidentCount = 0;
		this.lastIncidentTurn = null;

		const baseRevenue =
			riskLevel === "HIGH"
				? (params.highRiskProductRevenue ?? 8000)
				: (params.minimalRiskProductRevenue ?? 2000);

		const substitutiveMultiplier = params.substitutiveRevenueMultiplier ?? 1.1;
		const complementaryMultiplier =
			params.complementaryRevenueMultiplier ?? 1.4;
		const generativeMultiplier = params.generativeRevenueMultiplier ?? 1.8;

		if (params.substitutiveEnabled) {
			if (aiType === "GENERATIVE") {
				this.revenue = baseRevenue * generativeMultiplier;
			} else {
				this.revenue =
					aiType === "COMPLEMENTARY"
						? baseRevenue * complementaryMultiplier
						: baseRevenue * substitutiveMultiplier;
			}
		} else {
			this.revenue =
				aiType === "SUBSTITUTIVE" ? baseRevenue * 0.8 : baseRevenue * 1.2;
		}
	}
}
