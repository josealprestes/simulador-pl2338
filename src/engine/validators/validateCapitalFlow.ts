/**
 * validateCapitalFlow.ts — #544: Robustness validation of capital curves and drain.
 *
 * Runs BatchRunner-based Monte Carlo across representative playbooks,
 * collects per-turn avgCapital, cloudDrain, and activeStartups,
 * and checks for premature collapse and cloud drain risks.
 * Generates a markdown report.
 */

import { Simulation } from "../Simulation";
import type { SimulationParams } from "../types";
import { BatchRunner } from "../BatchRunner";

// ─── Playbook IDs to validate ────────────────────────────────────────────
export const KEY_PLAYBOOK_IDS = [
	"pl2338_rigor",     // regulacao-conformidade
	"mazzucato",        // acesso-inovacao
	"modelo_nordic",    // internacional
	"porter",           // concentracao-poder-mercado
];

// ─── Types ───────────────────────────────────────────────────────────────

export interface CapitalFlowRunResult {
	iteration: number;
	seed: number;
	finalTurn: number;
	/** Per-turn avgCapital from simulation history */
	avgCapitalByTurn: number[];
	/** Final cloudDrain value */
	cloudDrain: number;
	/** Final activeStartups count */
	activeStartups: number;
	/** Per-turn activeStartups */
	activeStartupsByTurn: number[];
	/** Per-turn cloudDrain */
	cloudDrainByTurn: number[];
}

export interface CapitalFlowAnalysis {
	prematureCollapse: {
		collapseCount: number;
		totalRuns: number;
		collapseRatio: number;
		thresholdTurn: number;
		capitalThreshold: number;
		maxAllowedRatio: number;
		ok: boolean;
	};
	cloudDrainAnalysis: {
		zeroStartupCapitalBeforeMid: boolean;
		earliestZeroTurn: number;
		/** Number of runs where all startups bankrupt before mid simulation */
		allDeadBeforeMid: number;
		totalRuns: number;
		midTurn: number;
		ok: boolean;
	};
	aggregate: {
		avgFinalCapital: number;
		avgCloudDrain: number;
		avgActiveStartups: number;
		avgFinalTurn: number;
		minCapital: number;
		maxCapital: number;
	};
	verdict: {
		stable: boolean;
		issues: string[];
		score: number;
	};
}

export interface PlaybookCapitalFlowResult {
	playbookId: string;
	iterations: number;
	analysis: CapitalFlowAnalysis;
}

// ─── Simulation runner ──────────────────────────────────────────────────

/**
 * Runs a single simulation and collects per-turn capital flow data.
 */
export async function runSimulationWithCapitalTracking(
	params: SimulationParams,
	seed: number,
): Promise<CapitalFlowRunResult> {
	const simParams: SimulationParams = { ...params, seed };
	const sim = new Simulation(simParams);

	const maxTurns = params.maxTurns ?? 50;

	const avgCapitalByTurn: number[] = [];
	const activeStartupsByTurn: number[] = [];
	const cloudDrainByTurn: number[] = [];

	// Run all turns
	while (sim.turn < maxTurns) {
		await sim.runTurn();

		// Record per-turn data from the last history entry
		const lastEntry = sim.history[sim.history.length - 1];
		if (lastEntry) {
			avgCapitalByTurn.push(lastEntry.avgCapital ?? 0);
			activeStartupsByTurn.push(lastEntry.activeStartups ?? 0);
			cloudDrainByTurn.push(lastEntry.cloudDrain ?? sim.cumulativeCloudDrain);
		}

		// Stop early if all companies bankrupt
		const active = sim.companies.filter((c) => !c.bankrupt);
		if (active.length === 0) break;
	}

	const lastState = sim.history[sim.history.length - 1] || {};

	return {
		iteration: 0,
		seed,
		finalTurn: sim.turn,
		avgCapitalByTurn,
		cloudDrain: lastState.cloudDrain ?? sim.cumulativeCloudDrain,
		activeStartups: lastState.activeStartups ?? 0,
		activeStartupsByTurn,
		cloudDrainByTurn,
	};
}

/**
 * Run multiple iterations of the same playbook params with different seeds.
 */
export async function runBatchCapitalFlow(
	baseParams: SimulationParams,
	iterations: number,
	baseSeed: number = 42,
): Promise<CapitalFlowRunResult[]> {
	const results: CapitalFlowRunResult[] = [];

	for (let i = 0; i < iterations; i++) {
		const seed = baseSeed + i;
		const result = await runSimulationWithCapitalTracking(baseParams, seed);
		result.iteration = i;
		results.push(result);
	}

	return results;
}

// ─── Analysis functions ─────────────────────────────────────────────────

/**
 * Analyzes a set of capital flow runs for premature collapse and cloud drain issues.
 */
export function analyzeCapitalFlow(
	results: CapitalFlowRunResult[],
): CapitalFlowAnalysis {
	const totalRuns = results.length;
	if (totalRuns === 0) {
		return createEmptyAnalysis();
	}

	// ─── Premature collapse check ────────────────────────────────────────
	// Check: avgCapital < 1000 before turn 20 in what fraction of runs?
	const thresholdTurn = 20;
	const capitalThreshold = 1000;
	const maxAllowedRatio = 0.3; // Allowed in max 30% of runs

	let collapseCount = 0;
	for (const run of results) {
		for (let t = 0; t < Math.min(thresholdTurn, run.avgCapitalByTurn.length); t++) {
			if (run.avgCapitalByTurn[t] < capitalThreshold) {
				collapseCount++;
				break; // Count each run once
			}
		}
	}
	const collapseRatio = collapseCount / totalRuns;
	const collapseOk = collapseRatio <= maxAllowedRatio;

	// ─── Cloud drain analysis ────────────────────────────────────────────
	// Check: cloudDrain doesn't drain all startup capital before mid simulation
	const midTurn = Math.floor((results[0]?.avgCapitalByTurn.length || 50) / 2);
	let allDeadBeforeMid = 0;
	let earliestZeroTurn = results[0]?.avgCapitalByTurn.length || 50;

	for (const run of results) {
		// Check if all startups are dead before mid turn
		for (let t = 0; t < Math.min(midTurn, run.activeStartupsByTurn.length); t++) {
			if (run.activeStartupsByTurn[t] === 0) {
				allDeadBeforeMid++;
				if (t < earliestZeroTurn) earliestZeroTurn = t;
				break;
			}
		}
	}

	const cloudDrainOk = allDeadBeforeMid < totalRuns * 0.5;

	// ─── Aggregate statistics ───────────────────────────────────────────
	const finalCapitals = results.map((r) => {
		const last = r.avgCapitalByTurn[r.avgCapitalByTurn.length - 1] || 0;
		return last;
	});
	const cloudDrains = results.map((r) => r.cloudDrain);
	const activeStartups = results.map((r) => r.activeStartups);
	const finalTurns = results.map((r) => r.finalTurn);

	const avgFinalCapital = mean(finalCapitals);
	const avgCloudDrain = mean(cloudDrains);
	const avgActiveStartups = mean(activeStartups);
	const avgFinalTurn = mean(finalTurns);
	const minCapital = Math.min(...finalCapitals);
	const maxCapital = Math.max(...finalCapitals);

	// ─── Verdict ─────────────────────────────────────────────────────────
	const issues: string[] = [];
	let score = 100;

	if (!collapseOk) {
		issues.push(
			`Colapso prematuro (avgCapital < R$${capitalThreshold} antes do turno ${thresholdTurn}) em ${(collapseRatio * 100).toFixed(1)}% das runs (limite: ${(maxAllowedRatio * 100).toFixed(0)}%).`,
		);
		score -= 30;
	}

	if (!cloudDrainOk) {
		issues.push(
			`Dreno de nuvem zerou capital de todas as startups antes do meio da simulação (turno ${midTurn}) em ${allDeadBeforeMid}/${totalRuns} runs.`,
		);
		score -= 25;
	}

	// Check if minimum capital is dangerously low
	if (minCapital < 100) {
		issues.push(
			`Capital mínimo entre todas as runs é R$${Math.round(minCapital)} — risco de colapso total em cenários extremos.`,
		);
		score -= 10;
	}

	const stable = issues.length <= 2 && score >= 60;

	return {
		prematureCollapse: {
			collapseCount,
			totalRuns,
			collapseRatio,
			thresholdTurn,
			capitalThreshold,
			maxAllowedRatio,
			ok: collapseOk,
		},
		cloudDrainAnalysis: {
			zeroStartupCapitalBeforeMid: !cloudDrainOk,
			earliestZeroTurn,
			allDeadBeforeMid,
			totalRuns,
			midTurn,
			ok: cloudDrainOk,
		},
		aggregate: {
			avgFinalCapital,
			avgCloudDrain,
			avgActiveStartups,
			avgFinalTurn,
			minCapital,
			maxCapital,
		},
		verdict: {
			stable,
			issues,
			score: Math.max(0, score),
		},
	};
}

function createEmptyAnalysis(): CapitalFlowAnalysis {
	return {
		prematureCollapse: {
			collapseCount: 0,
			totalRuns: 0,
			collapseRatio: 0,
			thresholdTurn: 20,
			capitalThreshold: 1000,
			maxAllowedRatio: 0.3,
			ok: true,
		},
		cloudDrainAnalysis: {
			zeroStartupCapitalBeforeMid: false,
			earliestZeroTurn: 0,
			allDeadBeforeMid: 0,
			totalRuns: 0,
			midTurn: 25,
			ok: true,
		},
		aggregate: {
			avgFinalCapital: 0,
			avgCloudDrain: 0,
			avgActiveStartups: 0,
			avgFinalTurn: 0,
			minCapital: 0,
			maxCapital: 0,
		},
		verdict: { stable: true, issues: [], score: 100 },
	};
}

// ─── Apply fixes to CapitalFlowEngine ───────────────────────────────────

/**
 * If premature collapse is detected, adjusts CapitalFlowEngine config
 * by setting minimum investmentProbability to 0.1 and minimum ticketSize to 30000.
 *
 * Returns the adjusted config for the VC actor.
 */
export function fixCapitalFlowConfig(
	params: SimulationParams,
): Record<string, any> | null {
	const actors: any = params.actors || {};
	const vcActor = actors.ventureCapital;

	// If VC is disabled, we can't fix it via actor params
	if (vcActor === false || vcActor === undefined) {
		return null;
	}

	const fix: Record<string, any> = {};
	let needsFix = false;

	// Ensure minimum investmentProbability of 0.1
	if (
		typeof vcActor === "object" &&
		(vcActor.investmentProbability === undefined ||
			vcActor.investmentProbability < 0.1)
	) {
		fix.investmentProbability = Math.max(
			0.1,
			vcActor.investmentProbability ?? 0.1,
		);
		needsFix = true;
	}

	// Ensure minimum ticketSize of 30000
	if (
		typeof vcActor === "object" &&
		(vcActor.ticketSize === undefined || vcActor.ticketSize < 30000)
	) {
		fix.ticketSize = Math.max(30000, vcActor.ticketSize ?? 30000);
		needsFix = true;
	}

	return needsFix ? fix : null;
}

// ─── Stats helpers ──────────────────────────────────────────────────────

function mean(values: number[]): number {
	if (values.length === 0) return 0;
	return values.reduce((a, b) => a + b, 0) / values.length;
}

// ─── Report generation ──────────────────────────────────────────────────

/**
 * Generate a full markdown report from validation results.
 */
export function generateCapitalFlowReport(
	results: PlaybookCapitalFlowResult[],
): string {
	const lines: string[] = [];
	const dateStr = new Date().toLocaleString("pt-BR");

	lines.push("# Relatório de Validação: Curvas de Capital e Dreno");
	lines.push("");
	lines.push(`**Gerado em:** ${dateStr}`);
	lines.push(`**Playbooks analisados:** ${results.length}`);
	lines.push(`**Iterações por playbook:** ${results[0]?.iterations ?? "N/A"}`);
	lines.push("");
	lines.push("---");
	lines.push("");
	lines.push("## Resumo Executivo");
	lines.push("");

	const stableCount = results.filter((r) => r.analysis.verdict.stable).length;
	const avgScore =
		results.length > 0
			? mean(results.map((r) => r.analysis.verdict.score))
			: 0;

	lines.push(`- **Playbooks estáveis:** ${stableCount}/${results.length}`);
	lines.push(`- **Pontuação média:** ${avgScore.toFixed(1)}/100`);
	lines.push("");
	lines.push(
		stableCount === results.length
			? "✅ **Todas as curvas de capital estão estáveis e os fluxos de dreno são realistas.**"
			: `⚠️ **${results.length - stableCount} playbook(s) apresentam instabilidade no fluxo de capital.**`,
	);
	lines.push("");
	lines.push("---");
	lines.push("");

	for (const result of results) {
		const a = result.analysis;
		lines.push(`## Playbook: \`${result.playbookId}\``);
		lines.push("");
		lines.push(`**Pontuação:** ${a.verdict.score}/100`);
		lines.push(
			`**Status:** ${a.verdict.stable ? "✅ Estável" : "⚠️ Requer atenção"}`,
		);
		lines.push("");

		lines.push("### Colapso Prematuro de Capital");
		lines.push("");
		lines.push(
			`- **Runs com colapso prematuro (avgCapital < R$${a.prematureCollapse.capitalThreshold} antes do turno ${a.prematureCollapse.thresholdTurn}):** ${a.prematureCollapse.collapseCount}/${a.prematureCollapse.totalRuns}`,
		);
		lines.push(
			`- **Proporção de colapso:** ${(a.prematureCollapse.collapseRatio * 100).toFixed(1)}%`,
		);
		lines.push(
			`- **Limite aceitável:** ${(a.prematureCollapse.maxAllowedRatio * 100).toFixed(0)}%`,
		);
		lines.push(
			`- **Resultado:** ${a.prematureCollapse.ok ? "✅ OK" : "❌ ACIMA DO LIMITE"}`,
		);
		lines.push("");

		lines.push("### Dreno de Nuvem (Cloud Drain)");
		lines.push("");
		lines.push(
			`- **Runs com todas as startups mortas antes do meio da simulação (turno ${a.cloudDrainAnalysis.midTurn}):** ${a.cloudDrainAnalysis.allDeadBeforeMid}/${a.cloudDrainAnalysis.totalRuns}`,
		);
		lines.push(
			`- **Turno mais cedo com zero startups:** ${a.cloudDrainAnalysis.earliestZeroTurn}`,
		);
		lines.push(
			`- **Resultado:** ${a.cloudDrainAnalysis.ok ? "✅ OK" : "❌ DREENO EXCESSIVO"}`,
		);
		lines.push("");

		lines.push("### Estatísticas Agregadas");
		lines.push("");
		lines.push(
			`- **Capital médio final:** R$${Math.round(a.aggregate.avgFinalCapital).toLocaleString()}`,
		);
		lines.push(
			`- **Capital mínimo:** R$${Math.round(a.aggregate.minCapital).toLocaleString()}`,
		);
		lines.push(
			`- **Capital máximo:** R$${Math.round(a.aggregate.maxCapital).toLocaleString()}`,
		);
		lines.push(
			`- **Dreno de nuvem médio:** R$${Math.round(a.aggregate.avgCloudDrain).toLocaleString()}`,
		);
		lines.push(
			`- **Startups ativas médias:** ${a.aggregate.avgActiveStartups.toFixed(1)}`,
		);
		lines.push(
			`- **Turno final médio:** ${a.aggregate.avgFinalTurn.toFixed(1)}`,
		);
		lines.push("");

		if (a.verdict.issues.length > 0) {
			lines.push("### Issues Detectadas");
			lines.push("");
			for (const issue of a.verdict.issues) {
				lines.push(`- ⚠️ ${issue}`);
			}
			lines.push("");
		} else {
			lines.push("### Issues Detectadas");
			lines.push("");
			lines.push("Nenhuma issue detectada.");
			lines.push("");
		}
	}

	lines.push("---");
	lines.push("");
	lines.push("## Recomendações");
	lines.push("");
	lines.push(
		"1. **Colapso prematuro:** Se detectado, ajustar `investmentProbability` mínima para 0.1 e `ticketSize` mínimo para R$ 30.000 no config do ator `ventureCapital`.",
	);
	lines.push(
		"2. **Dreno excessivo de nuvem:** Revisar parâmetros de infraestrutura — `cloudRentBase` e `cloudRentPerProduct` — para evitar sangria prematura de capital.",
	);
	lines.push(
		"3. **Subsídio estatal:** Em playbooks sem VC ativo, considerar ativar `stateFund` com `subsidyPerTurn` >= R$ 3.000 para sustentar startups.",
	);
	lines.push("");

	return lines.join("\n");
}
