/**
 * validateProductDiversity.ts — #543: Robustness validation of product diversity curves.
 *
 * Runs BatchRunner-based Monte Carlo across representative playbooks,
 * collects market creation snapshots (diversityIndex, totalProducts,
 * avgProductsPerCompany), and verifies that average diversity > 0.3
 * in at least 80% of playbooks.
 *
 * If diversity is chronically low, this file reports findings so that
 * parameters in Simulation.ts (innovation cost, sandbox compliance multiplier,
 * state fund bonuses) can be adjusted.
 */

import { Simulation } from "../Simulation";
import type { SimulationParams, SimulationState, MarketCreationSnapshot } from "../types";

// ─── Playbook IDs to validate ────────────────────────────────────────────
export const KEY_PLAYBOOK_IDS = [
	"mazzucato",            // acesso-inovacao
	"schumpeter",           // dinamicas-sociais
	"porter",               // concentracao-poder-mercado
	"pl2338_rigor",         // regulacao-conformidade
	"modelo_nordic",        // internacional
];

// ─── Types ───────────────────────────────────────────────────────────────

export interface ProductDiversityRunResult {
	iteration: number;
	seed: number;
	finalTurn: number;
	/** Final diversityIndex (0–1; 1 = perfectly even, 0 = one company holds all) */
	diversityIndex: number;
	/** Total products in the market at end */
	totalProducts: number;
	/** Average products per company at end */
	avgProductsPerCompany: number;
	/** Full history of market creation snapshots (for deeper analysis) */
	marketCreationHistory: MarketCreationSnapshot[];
}

export interface ProductDiversityPlaybookResult {
	playbookId: string;
	iterations: number;
	/** Per-run metrics */
	runs: ProductDiversityRunResult[];
	/** Aggregate statistics */
	meanDiversityIndex: number;
	medianDiversityIndex: number;
	stdDiversityIndex: number;
	minDiversityIndex: number;
	maxDiversityIndex: number;
	meanTotalProducts: number;
	meanAvgProductsPerCompany: number;
	/** Fraction of runs with diversityIndex > 0.3 */
	fractionAboveThreshold: number;
	verdict: {
		passed: boolean; // diversity > 0.3 on average
		issues: string[];
		score: number; // 0-100
	};
}

export interface ProductDiversityReport {
	timestamp: string;
	playbookResults: ProductDiversityPlaybookResult[];
	summary: {
		playbooksPassed: number;
		totalPlaybooks: number;
		overallPass: boolean;
		lowDiversityPlaybooks: string[];
	};
}

// ─── Simulation runner ──────────────────────────────────────────────────

/**
 * Run a single simulation and collect product diversity data at the end.
 */
export async function runSimulation(
	params: SimulationParams,
	seed: number,
): Promise<ProductDiversityRunResult> {
	const simParams: SimulationParams = { ...params, seed };
	const sim = new Simulation(simParams);

	const maxTurns = params.maxTurns ?? 50;

	// Run all turns
	while (sim.turn < maxTurns) {
		await sim.runTurn();
		// Stop early if all companies bankrupt
		const active = sim.companies.filter((c) => !c.bankrupt);
		if (active.length === 0) break;
	}

	// Collect all market creation snapshots from history
	const marketCreationHistory: MarketCreationSnapshot[] = [];
	for (const entry of sim.history) {
		if (entry.marketCreation) {
			marketCreationHistory.push(entry.marketCreation);
		}
	}

	// Get final state
	const lastEntry = sim.history[sim.history.length - 1];
	const lastMarketCreation = lastEntry?.marketCreation;

	return {
		iteration: 0,
		seed,
		finalTurn: sim.turn,
		diversityIndex: lastMarketCreation?.diversityIndex ?? 0,
		totalProducts: lastEntry?.totalProducts ?? 0,
		avgProductsPerCompany: lastMarketCreation?.avgProductsPerCompany ?? 0,
		marketCreationHistory,
	};
}

/**
 * Run multiple iterations of the same playbook params with different seeds.
 */
export async function runBatch(
	baseParams: SimulationParams,
	iterations: number,
	baseSeed: number = 42,
): Promise<ProductDiversityRunResult[]> {
	const results: ProductDiversityRunResult[] = [];

	for (let i = 0; i < iterations; i++) {
		const seed = baseSeed + i;
		const result = await runSimulation(baseParams, seed);
		result.iteration = i;
		results.push(result);
	}

	return results;
}

// ─── Statistics helpers ─────────────────────────────────────────────────

function mean(values: number[]): number {
	if (values.length === 0) return 0;
	return values.reduce((a, b) => a + b, 0) / values.length;
}

function median(values: number[]): number {
	if (values.length === 0) return 0;
	const sorted = [...values].sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	return sorted.length % 2 === 0
		? (sorted[mid - 1] + sorted[mid]) / 2
		: sorted[mid];
}

function stdDev(values: number[]): number {
	if (values.length <= 1) return 0;
	const m = mean(values);
	const variance = values.reduce((sum, v) => sum + (v - m) ** 2, 0) / (values.length - 1);
	return Math.sqrt(variance);
}

// ─── Analysis ───────────────────────────────────────────────────────────

/**
 * Analyze a set of product diversity runs for a single playbook.
 */
export function analyzePlaybook(
	playbookId: string,
	runs: ProductDiversityRunResult[],
): ProductDiversityPlaybookResult {
	const diversityValues = runs.map((r) => r.diversityIndex);
	const totalRuns = runs.length;

	const meanDiversity = mean(diversityValues);
	const minDiversity = diversityValues.length > 0 ? Math.min(...diversityValues) : 0;
	const maxDiversity = diversityValues.length > 0 ? Math.max(...diversityValues) : 0;
	const stdDiversity = stdDev(diversityValues);
	const medDiversity = median(diversityValues);
	const meanTotal = mean(runs.map((r) => r.totalProducts));
	const meanAvgProducts = mean(runs.map((r) => r.avgProductsPerCompany));
	const fractionAbove = runs.filter((r) => r.diversityIndex > 0.3).length / totalRuns;

	const issues: string[] = [];
	let score = 100;

	if (meanDiversity < 0.3) {
		issues.push(
			"Diversidade m\u00e9dia de produtos = " +
			(meanDiversity * 100).toFixed(1) +
			"% \u2014 abaixo do limiar de 30%. Mercado tende a ser concentrado em poucas empresas.",
		);
		score -= 40;
	}

	if (fractionAbove < 0.5) {
		issues.push(
			"Apenas " +
			(fractionAbove * 100).toFixed(0) +
			"% das runs atingem diversidade > 0.3 \u2014 a maioria dos cen\u00e1rios resulta em concentra\u00e7\u00e3o.",
		);
		score -= 20;
	}

	if (meanTotal < 5) {
		issues.push(
			"M\u00e9dia de produtos totais = " +
			meanTotal.toFixed(1) +
			" \u2014 mercado subdesenvolvido, pouca inova\u00e7\u00e3o ocorre.",
		);
		score -= 20;
	}

	if (meanAvgProducts < 0.5) {
		issues.push(
			"M\u00e9dia de produtos por empresa = " +
			meanAvgProducts.toFixed(2) +
			" \u2014 a maioria das empresas n\u00e3o est\u00e1 inovando.",
		);
		score -= 20;
	}

	return {
		playbookId,
		iterations: runs.length,
		runs,
		meanDiversityIndex: meanDiversity,
		medianDiversityIndex: medDiversity,
		stdDiversityIndex: stdDiversity,
		minDiversityIndex: minDiversity,
		maxDiversityIndex: maxDiversity,
		meanTotalProducts: meanTotal,
		meanAvgProductsPerCompany: meanAvgProducts,
		fractionAboveThreshold: fractionAbove,
		verdict: {
			passed: meanDiversity >= 0.3,
			issues,
			score: Math.max(0, score),
		},
	};
}

// ─── Report generation ──────────────────────────────────────────────────

/**
 * Generate a full markdown report from validation results.
 */
export function generateReport(
	results: ProductDiversityPlaybookResult[],
): string {
	const lines: string[] = [];
	const dateStr = new Date().toLocaleString("pt-BR");

	lines.push("# Relat\u00f3rio de Valida\u00e7\u00e3o: Diversidade de Produtos");
	lines.push("");
	lines.push("**Gerado em:** " + dateStr);
	lines.push("**Playbooks analisados:** " + results.length);
	lines.push("**Itera\u00e7\u00f5es por playbook:** " + (results[0]?.iterations ?? "N/A"));
	lines.push("**Limiar de diversidade:** > 0.30 (30%)");
	lines.push("");
	lines.push("---");
	lines.push("");
	lines.push("## Resumo Executivo");
	lines.push("");

	const passedCount = results.filter((r) => r.verdict.passed).length;
	const failedPlaybooks = results.filter((r) => !r.verdict.passed);
	const avgScore = results.length > 0
		? mean(results.map((r) => r.verdict.score))
		: 0;

	lines.push("- **Playbooks com diversidade adequada:** " + passedCount + "/" + results.length);
	lines.push("- **Playbooks com diversidade baixa:** " + failedPlaybooks.length + "/" + results.length);
	lines.push("- **Pontua\u00e7\u00e3o m\u00e9dia:** " + avgScore.toFixed(1) + "/100");
	lines.push("");

	if (failedPlaybooks.length === 0) {
		lines.push("\u2705 **Todos os playbooks apresentam diversidade de produtos adequada (m\u00e9dia > 0.30).**");
	} else {
		lines.push(
			"\u26a0\ufe0f **" + failedPlaybooks.length + " playbook(s) com diversidade abaixo do limiar de 0.30.**",
		);
	}
	lines.push("");
	lines.push("---");
	lines.push("");

	for (const result of results) {
		const pbLine = "## Playbook: `" + result.playbookId + "`";
		lines.push(pbLine);
		lines.push("");
		lines.push("**Pontua\u00e7\u00e3o:** " + result.verdict.score + "/100");
		lines.push("**Status:** " + (result.verdict.passed ? "\u2705 Diversidade adequada" : "\u26a0\ufe0f Diversidade baixa"));
		lines.push("");
		lines.push("### Estat\u00edsticas de Diversidade");
		lines.push("");
		lines.push("- **Diversidade m\u00e9dia (diversityIndex):** " + (result.meanDiversityIndex * 100).toFixed(1) + "%");
		lines.push("- **Diversidade mediana:** " + (result.medianDiversityIndex * 100).toFixed(1) + "%");
		lines.push("- **Desvio padr\u00e3o:** " + (result.stdDiversityIndex * 100).toFixed(1) + "%");
		lines.push("- **M\u00ednimo:** " + (result.minDiversityIndex * 100).toFixed(1) + "%");
		lines.push("- **M\u00e1ximo:** " + (result.maxDiversityIndex * 100).toFixed(1) + "%");
		lines.push("- **Fra\u00e7\u00f5es acima do limiar (30%):** " + (result.fractionAboveThreshold * 100).toFixed(0) + "%");
		lines.push("");
		lines.push("### M\u00e9tricas de Inova\u00e7\u00e3o");
		lines.push("");
		lines.push("- **M\u00e9dia de produtos totais:** " + result.meanTotalProducts.toFixed(1));
		lines.push("- **M\u00e9dia de produtos por empresa:** " + result.meanAvgProductsPerCompany.toFixed(2));
		lines.push("");

		if (result.verdict.issues.length > 0) {
			lines.push("### Issues Detectadas");
			lines.push("");
			for (const issue of result.verdict.issues) {
				lines.push("- \u26a0\ufe0f " + issue);
			}
			lines.push("");
		} else {
			lines.push("### Issues Detectadas");
			lines.push("");
			lines.push("Nenhuma issue detectada.");
			lines.push("");
		}

		lines.push("---");
		lines.push("");
	}

	// Recommendations
	lines.push("## Recomenda\u00e7\u00f5es");
	lines.push("");

	if (failedPlaybooks.length > 0) {
		lines.push("### Playbooks que requerem ajustes:");
		lines.push("");
		for (const pb of failedPlaybooks) {
			lines.push(
				"- **`" + pb.playbookId + "`** (score: " +
				pb.verdict.score + "/100, diversidade m\u00e9dia: " +
				(pb.meanDiversityIndex * 100).toFixed(1) + "%)",
			);
		}
		lines.push("");

		// Check if low total products is the main issue
		const lowProductPlaybooks = failedPlaybooks.filter(
			(pb) => pb.meanTotalProducts < 5,
		);
		if (lowProductPlaybooks.length > 0) {
			lines.push("1. **Aumentar taxa de inova\u00e7\u00e3o:** Se o n\u00famero total de produtos \u00e9 baixo, considerar:");
			lines.push("   - Reduzir custos de inova\u00e7\u00e3o (highRiskInnovationCost)");
			lines.push("   - Aumentar innovationCapacity das empresas");
			lines.push("   - Garantir que stateFund subsidies est\u00e3o ativos e suficientes");
			lines.push("   - Afetados: " + lowProductPlaybooks.map((p) => "`" + p.playbookId + "`").join(", "));
			lines.push("");
		}

		const lowDiversityPlaybooks = failedPlaybooks.filter(
			(pb) => pb.meanTotalProducts >= 5 && pb.meanDiversityIndex < 0.3,
		);
		if (lowDiversityPlaybooks.length > 0) {
			lines.push("2. **Melhorar distribui\u00e7\u00e3o de produtos entre empresas:**");
			lines.push("   - Aumentar sandboxCapacity para permitir mais entradas");
			lines.push("   - Reduzir vantagens assim\u00e9tricas de Big Techs");
			lines.push("   - Ajustar stateFundComplementaryBonus para incentivar inova\u00e7\u00e3o complementar");
			lines.push("   - Afetados: " + lowDiversityPlaybooks.map((p) => "`" + p.playbookId + "`").join(", "));
			lines.push("");
		}
	}

	if (failedPlaybooks.length === 0) {
		lines.push("Nenhuma recomenda\u00e7\u00e3o de ajuste \u2014 a diversidade de produtos est\u00e1 adequada em todos os playbooks.");
		lines.push("");
	}

	lines.push("---");
	lines.push("");
	lines.push(
		"*Relat\u00f3rio gerado automaticamente pelo validador de diversidade de produtos (validateProductDiversity.ts).*",
	);

	return lines.join("\n");
}

// ─── Main validator ─────────────────────────────────────────────────────

/**
 * Run full product diversity validation across all key playbooks.
 */
export async function validateProductDiversity(
	buildParamsFn: (playbook: any) => SimulationParams,
	findPlaybookFn: (id: string) => any,
	iterations: number = 100,
): Promise<ProductDiversityReport> {
	const results: ProductDiversityPlaybookResult[] = [];

	for (const playbookId of KEY_PLAYBOOK_IDS) {
		const playbook = findPlaybookFn(playbookId);
		const params = buildParamsFn(playbook);

		console.log("\n\uD83D\uDCCA Validating product diversity: " + playbookId + " (" + iterations + " iterations)...");

		const runs = await runBatch(params, iterations);
		const analysis = analyzePlaybook(playbookId, runs);
		results.push(analysis);

		console.log(
			"   Diversity: " + (analysis.meanDiversityIndex * 100).toFixed(1) +
			"% | Total products: " + analysis.meanTotalProducts.toFixed(1) +
			" | Score: " + analysis.verdict.score + "/100 | Pass: " + analysis.verdict.passed,
		);
		if (analysis.verdict.issues.length > 0) {
			for (const issue of analysis.verdict.issues) {
				console.log("   \u26a0\ufe0f " + issue);
			}
		}
	}

	const passedCount = results.filter((r) => r.verdict.passed).length;
	const lowDiversityPlaybooks = results
		.filter((r) => !r.verdict.passed)
		.map((r) => r.playbookId);

	return {
		timestamp: new Date().toISOString(),
		playbookResults: results,
		summary: {
			playbooksPassed: passedCount,
			totalPlaybooks: results.length,
			overallPass: passedCount >= results.length * 0.8, // at least 80%
			lowDiversityPlaybooks,
		},
	};
}
