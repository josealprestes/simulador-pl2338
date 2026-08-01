import { Company, SimulationParams } from "./types";
import { RNG } from "./RNG";

/**
 * ProcurementEngine: Manages government contracts and procurement quotas.
 */
export class ProcurementEngine {
	/**
	 * Processes government procurement and awards contracts.
	 */
	static processProcurement(
		companies: Company[],
		params: SimulationParams,
		rng: RNG,
	): string[] {
		const events: string[] = [];
		const totalAvailable = params.maxGovContracts ?? 0;
		const quota = params.reservedProcurementQuota ?? 0;
		const contractValue = params.govContractValue ?? 0;

		if (totalAvailable <= 0 || contractValue <= 0) return events;

		const activeCompanies = companies.filter((c) => !c.bankrupt);
		const startups = activeCompanies.filter((c) => c.type === "STARTUP");
		const bigTechs = activeCompanies.filter((c) => c.type === "BIG_TECH");

		const reservedForStartups = Math.floor(totalAvailable * quota);
		const forAnyone = totalAvailable - reservedForStartups;

		let awardedCount = 0;

		// 1. Award to Startups (Quota)
		const eligibleStartups = [...startups];
		for (
			let i = 0;
			i < reservedForStartups && eligibleStartups.length > 0;
			i++
		) {
			const idx = Math.floor(rng.next() * eligibleStartups.length);
			const startup = eligibleStartups.splice(idx, 1)[0];
			startup.governmentContracts = (startup.governmentContracts ?? 0) + 1;
			startup.capital += contractValue;
			startup.revenueLastTurn += contractValue;
			awardedCount++;
		}

		// 2. Award remaining to Anyone (remaining startups + big techs)
		const anyoneElse = [...eligibleStartups, ...bigTechs];
		for (let i = 0; i < forAnyone && anyoneElse.length > 0; i++) {
			const idx = Math.floor(rng.next() * anyoneElse.length);
			const company = anyoneElse.splice(idx, 1)[0];
			company.governmentContracts = (company.governmentContracts ?? 0) + 1;
			company.capital += contractValue;
			company.revenueLastTurn += contractValue;
			awardedCount++;
		}

		if (awardedCount > 0) {
			events.push(
				`🏛️ LICITAÇÃO: ${awardedCount} contratos governamentais adjudicados.`,
			);
		}

		return events;
	}
}
