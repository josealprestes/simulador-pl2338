import { Company } from "./types";

/**
 * InfrastructureEngine: simulates cloud dependency and compute rent.
 */
export class InfrastructureEngine {
	/**
	 * Processes cloud-rent capital drain.
	 */
	static processCloudRent(
		companies: Company[],
		config: Record<string, any> = {},
	): { totalDrain: number; sovereignReinvestment: number } {
		let totalDrain = 0;
		let sovereignReinvestment = 0;

		const bigTechs = companies.filter(
			(c) => !c.bankrupt && c.type === "BIG_TECH",
		);

		const baseRent = config.cloudRentBase ?? 1000;
		const productRent = config.cloudRentPerProduct ?? 500;
		const isSovereign = config.sovereignCloud ?? false;
		const sovereignSubsidyRate = config.sovereignSubsidyRate ?? 0.3; // 30% reduction

		companies
			.filter((c) => !c.bankrupt && c.type === "STARTUP")
			.forEach((c) => {
				// Goldfarb & Tucker (2019): Infrastructure costs are driven by scale and usage.
				const numProducts = (c.products || []).length;
				let rent = numProducts * baseRent + numProducts * productRent;

				if (isSovereign) {
					const subsidy = rent * sovereignSubsidyRate;
					rent -= subsidy;
					sovereignReinvestment += rent; // Redirected to national fund
				}

				c.capital -= rent;
				c.turnExpenses = (c.turnExpenses || 0) + rent;
				totalDrain += rent;

				if (!isSovereign && bigTechs.length > 0) {
					const share = Math.floor(rent / bigTechs.length);
					bigTechs.forEach((bt) => {
						bt.capital += share;
						bt.revenueLastTurn += share;
					});
				}
			});

		return { totalDrain, sovereignReinvestment };
	}}
