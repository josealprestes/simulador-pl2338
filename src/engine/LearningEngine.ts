import { Company } from "./types";

/**
 * LearningEngine: manages institutional learning and compliance maturity.
 */
export class LearningEngine {
	/**
	 * Processes one turn of learning.
	 * @param {Company[]} companies
	 * @param {Record<string, any>} config Learning actor configuration.
	 */
	static processLearning(companies: Company[], config: Record<string, any> = {}) {
		const maturityGain = config.maturityGain ?? 0.05;
		companies
			.filter((c) => !c.bankrupt)
			.forEach((c) => {
				if (!c.complianceMaturity) c.complianceMaturity = 0;
				c.complianceMaturity += maturityGain;
				if (c.complianceMaturity > 1.0) c.complianceMaturity = 1.0;
			});
	}

	/**
	 * Evolui a maturidade de uma única empresa.
	 */
	static evolveMaturity(currentMaturity: number, config: Record<string, any> = {}): number {
		const maturityGain = config.maturityGain ?? 0.05;
		const nextMaturity = (currentMaturity || 0) + maturityGain;
		return Math.min(1.0, nextMaturity);
	}

	/**
	 * Calculates incident chance adjusted by compliance maturity.
	 */
	static getAdjustedIncidentChance(baseChance: number, maturity: number = 0): number {
		const reduction = 0.7 * maturity;
		return baseChance * (1 - reduction);
	}
}
