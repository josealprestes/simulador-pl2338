import { Company, SimulationParams } from "./types";
import { RNG } from "./RNG";

/**
 * CapitalFlowEngine: manages external capital flows from VC and the state.
 */
export class CapitalFlowEngine {
	/**
	 * Processes venture-capital investments.
	 */
	static processVC(
		companies: Company[],
		params: SimulationParams,
		socialTrust: number,
		rng: RNG,
		config: Record<string, any> = {},
		state: Record<string, any> = {},
	): { events: string[]; causalLog: any[] } {
		const events: string[] = [];
		const causalLog: any[] = [];
		if (!Array.isArray(companies)) {
			return { events, causalLog };
		}

		const complianceFreezeThreshold = config.complianceFreezeThreshold ?? 80000;
		const fineFreezeThreshold = config.fineFreezeThreshold ?? 300000;
		const trustFreezeThreshold = config.trustFreezeThreshold ?? 30;
		const investmentProbability =
			config.investmentProbability ?? config.appetite ?? 0.2;
		const ticketSize = config.ticketSize ?? 50000;
		const vcFreezeMode = config.vcFreezeMode ?? "binary";

		const isGlobalRiskTriggered =
			params.complianceCostHighRisk > complianceFreezeThreshold ||
			params.fineSeverity > fineFreezeThreshold ||
			socialTrust < trustFreezeThreshold;

		if (vcFreezeMode === "binary" && isGlobalRiskTriggered) {
			// Legacy binary freeze behavior
			if (params.complianceCostHighRisk > complianceFreezeThreshold) {
				events.push(
					`❄️ VC: Freeze ativado - Custo de conformidade (R$${params.complianceCostHighRisk}) > limiar (R$${complianceFreezeThreshold}).`,
				);
				causalLog.push({ type: "vcFreeze", trigger: "Custo de conformidade", threshold: "desconhecido" });
			}
			if (params.fineSeverity > fineFreezeThreshold) {
				events.push(
					`❄️ VC: Freeze ativado - Multa (R$${params.fineSeverity}) > limiar (R$${fineFreezeThreshold}).`,
				);
				causalLog.push({ type: "vcFreeze", trigger: "Multa", threshold: "desconhecido" });
			}
			if (socialTrust < trustFreezeThreshold) {
				events.push(
					`❄️ VC: Freeze ativado - Confiança social (${socialTrust}) < limiar (${trustFreezeThreshold}).`,
				);
				causalLog.push({ type: "vcFreeze", trigger: "Confiança social", threshold: "desconhecido" });
			}
			return { events, causalLog };
		}

		// Individual risk multiplier based on global conditions
		let globalRiskMultiplier = 1.0;
		if (isGlobalRiskTriggered) {
			if (params.complianceCostHighRisk > complianceFreezeThreshold)
				globalRiskMultiplier += 0.3;
			if (params.fineSeverity > fineFreezeThreshold)
				globalRiskMultiplier += 0.4;
			if (socialTrust < trustFreezeThreshold) globalRiskMultiplier += 0.5;
		}

		companies
			.filter((c) => !c.bankrupt && c.type === "STARTUP")
			.forEach((c) => {
				// Dosi et al. (2010): Heterogeneous responses to regulatory shocks.
				if (vcFreezeMode === "probabilistic") {
					const baseFreezeProb = config.vcBaseFreezeProb ?? 0.3;

					// High-performing startups (more products/capital) should have lower freeze probability.
					const productFactor = Math.max(
						0.2,
						1 - (c.products || []).length * 0.1,
					);
					const capitalFactor = Math.max(0.2, 1 - c.capital / 500000);

					// Higher compliance maturity reduces freeze chance
					const freezeProb = Math.min(
						0.95,
						baseFreezeProb *
							(1.1 - c.complianceMaturity) *
							globalRiskMultiplier *
							productFactor *
							capitalFactor,
					);

					if (rng.next() < freezeProb) {
						return; // This startup is frozen for this turn
					}
				}

				const hasHighRisk = (c.products || []).some(
					(p) => p.riskLevel === "HIGH",
				);
				const hasPool =
					state.remainingPool === undefined ||
					state.remainingPool >= ticketSize;
				const isReputable =
					c.reputationScore >= (config.reputationScoreThreshold ?? 0.4);

				if (
					hasHighRisk &&
					hasPool &&
					isReputable &&
					rng.next() < investmentProbability
				) {
					c.capital += ticketSize;
					if (state.remainingPool !== undefined)
						state.remainingPool -= ticketSize;
					events.push(
						`💰 VC: Aporte de R$${ticketSize.toLocaleString()} em ${c.id} (Serie A).`,
					);
					causalLog.push({ type: "vcInvestment", company: c.id });
				}
			});

		return { events, causalLog };
	}

	/**
	 * Processes state subsidies and compliance vouchers.
	 */
	static processState(
		companies: Company[],
		params: SimulationParams,
		config: Record<string, any> = {},
		state: Record<string, any> = {},
	): { events: string[]; causalLog: any[] } {
		const events: string[] = [];
		const causalLog: any[] = [];
		const subsidy = config.subsidyPerTurn ?? 2000;
		const voucherCap = config.voucherCap ?? 10000;

		companies
			.filter((c) => !c.bankrupt && c.type === "STARTUP")
			.forEach((c) => {
				const hasComplementary = (c.products || []).some(
					(p) => p.aiType === "COMPLEMENTARY",
				);
				const isSubstitutiveOnly =
					(c.products || []).length > 0 &&
					(c.products || []).every((p) => p.aiType === "SUBSTITUTIVE");

				// SUBSTITUTIVE only companies are not eligible in fomento playbooks
				if (params.substitutiveEnabled && isSubstitutiveOnly) return;

				let currentSubsidy = subsidy;
				if (params.substitutiveEnabled && hasComplementary) {
					currentSubsidy *= (params as SimulationParams).stateFundComplementaryBonus ?? 1.5;
				}

				if (
					state.remainingBudget === undefined ||
					state.remainingBudget >= currentSubsidy
				) {
					c.capital += currentSubsidy;
					c.subsidyReceived += currentSubsidy;
					if (state.remainingBudget !== undefined)
						state.remainingBudget -= currentSubsidy;
					causalLog.push({ type: "subsidy", company: c.id });
				}

				if (c.capital < 20000 && params.complianceCostHighRisk > 0) {
					const voucher = Math.min(params.complianceCostHighRisk, voucherCap);
					if (
						state.remainingBudget === undefined ||
						state.remainingBudget >= voucher
					) {
						c.capital += voucher;
						c.subsidyReceived += voucher;
						if (state.remainingBudget !== undefined)
							state.remainingBudget -= voucher;
						events.push(`🏛️ ESTADO: Voucher de compliance para ${c.id}.`);
						causalLog.push({ type: "subsidy", company: c.id });
					}
				}
			});

		return { events, causalLog };
	}

	/**
	 * Collects royalties/equity returns from subsidized companies for the state fund.
	 */
	static collectStateReturns(
		companies: Company[],
		params: SimulationParams,
		state: Record<string, any> = {},
	): { events: string[]; totalReturns: number } {
		const events: string[] = [];
		const stateRoyaltyEnabled = (params as SimulationParams).stateRoyaltyEnabled ?? false;
		const stateRoyaltyRate = (params as SimulationParams).stateRoyaltyRate ?? 0.05;
		const stateRoyaltyMinRevenue = (params as SimulationParams).stateRoyaltyMinRevenue ?? 100000;
		let totalReturns = 0;

		if (!stateRoyaltyEnabled) return { events, totalReturns };

		companies
			.filter((c) => !c.bankrupt && c.subsidyReceived > 0)
			.forEach((c) => {
				if (c.revenueLastTurn > stateRoyaltyMinRevenue) {
					const royalty = c.revenueLastTurn * stateRoyaltyRate;
					c.capital -= royalty;
					c.turnExpenses += royalty;
					totalReturns += royalty;
					events.push(
						`🏛️ RETORNO: ${c.id} pagou R$${Math.round(royalty).toLocaleString()} ao Estado.`,
					);
				}
			});

		if (totalReturns > 0 && state.remainingBudget !== undefined) {
			state.remainingBudget += totalReturns;
		}

		return { events, totalReturns };
	}
}
