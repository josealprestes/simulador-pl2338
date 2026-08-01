import { Simulation } from "./Simulation";
import { SimulationParams, BatchRunResult, OATResult, Company } from "./types";

/**
 * BatchRunner: Headless simulation runner for large-scale analysis.
 * Supports Monte Carlo methods and Sensitivity Analysis.
 */
export class BatchRunner {
	/**
	 * Runs a set of simulations with the same base parameters but different seeds.
	 * @param {SimulationParams} params Simulation parameters.
	 * @param {number} iterations Number of runs.
	 * @returns {Promise<BatchRunResult[]>} Results from each run.
	 */
	static async run(
		params: SimulationParams,
		iterations: number = 10,
	): Promise<BatchRunResult[]> {
		const results: BatchRunResult[] = [];
		const baseSeed = params.seed ?? (Date.now() % 100000) + 1;

		for (let i = 0; i < iterations; i++) {
			const simParams = { ...params, seed: baseSeed + i };
			const sim = new Simulation(simParams);

			const maxTurns = params.maxTurns ?? 50;

			while (sim.turn < maxTurns) {
				await sim.runTurn();
				// Stop if market collapses
				if (sim.companies.filter((c: Company) => !c.bankrupt).length === 0) break;
			}

			const lastState: Record<string, any> = sim.history[sim.history.length - 1] || {};
			results.push({
				iteration: i,
				seed: baseSeed + i,
				finalTurn: sim.turn,
				activeStartups: lastState.activeStartups ?? 0,
				activeBigTechs: lastState.activeBigTechs ?? 0,
				socialTrust: lastState.socialTrust ?? 100,
				hhi: lastState.hhi ?? 0,
				cloudDrain: lastState.cloudDrain ?? 0,
				compliantProducts: lastState.compliantProducts ?? 0,
				totalProducts: lastState.totalProducts ?? 0,
				avgCapital: lastState.avgCapital ?? 0,
			});
		}
		return results;
	}

	/**
	 * One-At-a-Time (OAT) Sensitivity Analysis.
	 * @param {SimulationParams} baselineParams Reference parameters.
	 * @param {string} parameterName Parameter to vary.
	 * @param {(number | string | boolean)[]} values Range of values for the parameter.
	 * @param {number} iterationsPerPoint Number of Monte Carlo runs for averaging.
	 * @returns {Promise<OATResult[]>} OAT analysis results.
	 */
	static async runOAT(
		baselineParams: SimulationParams,
		parameterName: string,
		values: (number | string | boolean)[],
		iterationsPerPoint: number = 5,
	): Promise<OATResult[]> {
		const oatResults: OATResult[] = [];

		for (const val of values) {
			// Deep clone params if they have nested objects (actors)
			const currentParams = JSON.parse(JSON.stringify(baselineParams));

			// Handle nested keys like 'actors.ventureCapital'
			const keys = parameterName.split(".");
			let target = currentParams;
			for (let i = 0; i < keys.length - 1; i++) {
				if (!target[keys[i]]) target[keys[i]] = {};
				target = target[keys[i]];
			}
			target[keys[keys.length - 1]] = val;

			const batch = await BatchRunner.run(currentParams, iterationsPerPoint);

			// Calculate statistics
			const summary = batch.reduce(
				(acc, r) => ({
					activeStartups: acc.activeStartups + r.activeStartups,
					activeBigTechs: acc.activeBigTechs + r.activeBigTechs,
					socialTrust: acc.socialTrust + r.socialTrust,
					hhi: acc.hhi + r.hhi,
					complianceRatio:
						acc.complianceRatio + r.compliantProducts / (r.totalProducts || 1),
				}),
				{
					activeStartups: 0,
					activeBigTechs: 0,
					socialTrust: 0,
					hhi: 0,
					complianceRatio: 0,
				},
			);

			oatResults.push({
				parameter: parameterName,
				value: val,
				avgStartups: summary.activeStartups / iterationsPerPoint,
				avgBigTechs: summary.activeBigTechs / iterationsPerPoint,
				avgTrust: summary.socialTrust / iterationsPerPoint,
				avgHHI: summary.hhi / iterationsPerPoint,
				avgComplianceRatio: summary.complianceRatio / iterationsPerPoint,
			});
		}
		return oatResults;
	}
}
