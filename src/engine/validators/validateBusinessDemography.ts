/**
 * validateBusinessDemography.ts
 *
 * Validação das Curvas de Demografia Empresarial (Issue #542)
 *
 * Para cada playbook, executa 100 cenários (iterações com seeds diferentes)
 * e coleta estatísticas detalhadas de sobrevivência de startups:
 *   - activeStartups em cada turno
 *   - Turno da primeira falência
 *   - Turnos com 0 startups
 *   - Mortalidade em 5 anos (50 turnos)
 *
 * Identifica playbooks que consistentemente levam à extinção total
 * ("startup apocalypse") e sugere ajustes nos parâmetros.
 */

import { Simulation } from "../Simulation";
import type { SimulationParams } from "../types";

export interface DemographyRunResult {
	iteration: number;
	seed: number;
	finalTurn: number;
	activeStartupsByTurn: number[];
	activeBigTechsByTurn: number[];
	firstBankruptcyTurn: number | null;
	turnsWithZeroStartups: number[];
	totalStartupBankruptcies: number;
	mortalityRate: number;
	survivedToEnd: boolean;
}

export interface PlaybookDemographyReport {
	playbookId: string;
	playbookName: string;
	category: string;
	runs: number;
	globalMortalityRate: number; // average mortality across all runs
	globalSurvivalRate: number;
	extinctionRate: number; // % of runs where ALL startups died
	prematureExtinctionRate: number; // % of runs with 0 startups before turn 20
	avgFirstBankruptcyTurn: number | null;
	avgTurnsWithZeroStartups: number;
	minSurvivors: number;
	maxSurvivors: number;
	avgSurvivors: number;
	stdSurvivors: number;
	avgActiveStartupsAtTurn: number[]; // averaged across runs per turn
	severeExtinctionPlaybooks: string[]; // playbook IDs with > 50% extinction rate
	recommendations: string[];
}

/**
 * Executa N iterações de um playbook e coleta dados demográficos detalhados.
 */
async function runPlaybookDemography(
	params: SimulationParams,
	maxTurns: number,
	iterations: number = 100,
	baseSeed: number = 42000,
): Promise<DemographyRunResult[]> {
	const results: DemographyRunResult[] = [];

	for (let i = 0; i < iterations; i++) {
		const simParams: SimulationParams = {
			...JSON.parse(JSON.stringify(params)),
			seed: baseSeed + i,
		};
		const sim = new Simulation(simParams);

		const activeStartupsByTurn: number[] = [];
		const activeBigTechsByTurn: number[] = [];
		let firstBankruptcyTurn: number | null = null;

		// Record turn 0 state (initial)
		const initialStartups = sim.companies.filter(
			(c) => c.type === "STARTUP" && !c.bankrupt,
		).length;
		const initialBigTechs = sim.companies.filter(
			(c) => c.type === "BIG_TECH" && !c.bankrupt,
		).length;
		activeStartupsByTurn.push(initialStartups);
		activeBigTechsByTurn.push(initialBigTechs);

		// Simulate turn by turn
		while (sim.turn < maxTurns) {
			await sim.runTurn();

			const activeStartups = sim.companies.filter(
				(c) => c.type === "STARTUP" && !c.bankrupt,
			).length;
			const activeBigTechs = sim.companies.filter(
				(c) => c.type === "BIG_TECH" && !c.bankrupt,
			).length;

			activeStartupsByTurn.push(activeStartups);
			activeBigTechsByTurn.push(activeBigTechs);

			// Track first bankruptcy turn
			if (firstBankruptcyTurn === null) {
				// Check if any startup that was active before is now bankrupt
				const totalStartupsBefore = activeStartupsByTurn[activeStartupsByTurn.length - 2] ?? 0;
				if (activeStartups < totalStartupsBefore) {
					firstBankruptcyTurn = sim.turn;
				}
			}

			// Stop if no active companies
			if (activeStartups + activeBigTechs === 0) break;
		}

		// Count total startup bankruptcies across the run
		const finalStartups = activeStartupsByTurn[activeStartupsByTurn.length - 1];
		const bankruptcies = initialStartups - finalStartups;
		const totalStartupBankruptcies = Math.max(0, bankruptcies);

		// Find turns with zero startups
		const turnsWithZeroStartups = activeStartupsByTurn
			.map((count, turnIdx) => (count === 0 ? turnIdx : -1))
			.filter((t) => t >= 0);

		const mortalityRate =
			initialStartups > 0
				? (initialStartups - finalStartups) / initialStartups
				: 1;

		results.push({
			iteration: i,
			seed: baseSeed + i,
			finalTurn: sim.turn,
			activeStartupsByTurn,
			activeBigTechsByTurn,
			firstBankruptcyTurn,
			turnsWithZeroStartups,
			totalStartupBankruptcies,
			mortalityRate,
			survivedToEnd: finalStartups > 0 && sim.turn >= maxTurns,
		});
	}

	return results;
}

/**
 * Analisa os resultados de um playbook e gera um relatório de demografia.
 */
function analyzePlaybookResults(
	playbookId: string,
	playbookName: string,
	category: string,
	results: DemographyRunResult[],
	maxTurns: number,
): PlaybookDemographyReport {
	const n = results.length;
	if (n === 0) {
		return {
			playbookId,
			playbookName,
			category,
			runs: 0,
			globalMortalityRate: 0,
			globalSurvivalRate: 0,
			extinctionRate: 0,
			prematureExtinctionRate: 0,
			avgFirstBankruptcyTurn: null,
			avgTurnsWithZeroStartups: 0,
			minSurvivors: 0,
			maxSurvivors: 0,
			avgSurvivors: 0,
			stdSurvivors: 0,
			avgActiveStartupsAtTurn: [],
			severeExtinctionPlaybooks: [],
			recommendations: [],
		};
	}

	// Extract final survivors from each run
	const survivors = results.map(
		(r) =>
			r.activeStartupsByTurn[r.activeStartupsByTurn.length - 1],
	);

	const avgSurvivors =
		survivors.reduce((a, b) => a + b, 0) / n;
	const stdSurvivors = Math.sqrt(
		survivors.reduce((acc, s) => acc + (s - avgSurvivors) ** 2, 0) / n,
	);
	const minSurvivors = Math.min(...survivors);
	const maxSurvivors = Math.max(...survivors);

	// Extinction runs (zero startups at the end)
	const extinctionRuns = results.filter(
		(r) => r.activeStartupsByTurn[r.activeStartupsByTurn.length - 1] === 0,
	).length;

	// Premature extinction (zero before turn 20)
	const prematureExtinctionRuns = results.filter(
		(r) => r.activeStartupsByTurn.slice(0, 20).some((c) => c === 0),
	).length;

	// Average mortality rate
	const avgMortality =
		results.reduce((a, r) => a + r.mortalityRate, 0) / n;

	// Average first bankruptcy turn
	const firstBankruptcyTurns = results
		.filter((r) => r.firstBankruptcyTurn !== null)
		.map((r) => r.firstBankruptcyTurn as number);
	const avgFirstBankruptcy =
		firstBankruptcyTurns.length > 0
			? firstBankruptcyTurns.reduce((a, b) => a + b, 0) /
				firstBankruptcyTurns.length
			: null;

	// Average turns with zero startups
	const avgZeroTurns =
		results.reduce((a, r) => a + r.turnsWithZeroStartups.length, 0) / n;

	// Average activeStartups at each turn
	const maxTurnLength = Math.max(
		...results.map((r) => r.activeStartupsByTurn.length),
	);
	const avgActiveStartupsAtTurn: number[] = [];
	for (let t = 0; t < maxTurnLength; t++) {
		let sum = 0;
		let count = 0;
		for (const r of results) {
			if (t < r.activeStartupsByTurn.length) {
				sum += r.activeStartupsByTurn[t];
				count++;
			}
		}
		avgActiveStartupsAtTurn.push(count > 0 ? sum / count : 0);
	}

	// Survival rate (survived to end)
	const survivalCount = results.filter((r) => r.survivedToEnd).length;
	const survivalRate = survivalCount / n;

	// Recommendations
	const recommendations: string[] = [];
	const extinctionRate = extinctionRuns / n;
	const prematureRate = prematureExtinctionRuns / n;

	if (extinctionRate > 0.5) {
		recommendations.push(
			`⚠️ Extinção crítica: ${(extinctionRate * 100).toFixed(0)}% das runs terminam com 0 startups. ` +
				`Considere aumentar startupInitialCapital, reduzir complianceCostHighRisk, ou reduzir fineSeverity.`,
		);
	}
	if (prematureRate > 0.3) {
		recommendations.push(
			`⚠️ Extinção prematura: ${(prematureRate * 100).toFixed(0)}% das runs têm 0 startups antes do turno 20. ` +
				`Startups estão morrendo rápido demais — verifique startupInitialCapital e custos fixos.`,
		);
	}
	if (avgFirstBankruptcy !== null && avgFirstBankruptcy < 5) {
		recommendations.push(
			`⚠️ Primeira falência muito cedo: média no turno ${avgFirstBankruptcy.toFixed(1)}. ` +
				`Startups sem capital de giro suficiente para os primeiros turnos.`,
		);
	}
	if (avgMortality > 0.95) {
		recommendations.push(
			`⚠️ Mortalidade média de ${(avgMortality * 100).toFixed(0)}% — muito acima do esperado (60-80%). ` +
				`O ambiente está excessivamente punitivo para novos entrantes.`,
		);
	}
	if (avgMortality < 0.3) {
		recommendations.push(
			`ℹ️ Mortalidade média de ${(avgMortality * 100).toFixed(0)}% — abaixo do esperado. ` +
				`Ambiente muito favorável a startups; pode não refletir a realidade de mercado.`,
		);
	}
	if (avgSurvivors < 1 && extinctionRate > 0.7) {
		recommendations.push(
			`🔴 STARTUP APOCALYPSE DETECTADO: média de ${avgSurvivors.toFixed(1)} startups sobreviventes, ` +
				`${(extinctionRate * 100).toFixed(0)}% extinção. Ajustes URGENTES necessários.`,
		);
	}

	return {
		playbookId,
		playbookName,
		category,
		runs: n,
		globalMortalityRate: avgMortality,
		globalSurvivalRate: survivalRate,
		extinctionRate,
		prematureExtinctionRate: prematureRate,
		avgFirstBankruptcyTurn: avgFirstBankruptcy,
		avgTurnsWithZeroStartups: avgZeroTurns,
		minSurvivors,
		maxSurvivors,
		avgSurvivors,
		stdSurvivors,
		avgActiveStartupsAtTurn,
		severeExtinctionPlaybooks:
			extinctionRate > 0.5 ? [playbookId] : [],
		recommendations,
	};
}

/**
 * Valida todos os playbooks contra o problema de extinção em massa de startups.
 * Executa N iterações por playbook e retorna relatórios individuais e consolidado.
 */
export async function validateBusinessDemography(
	playbooks: Array<{ id: string; name: string; category: string; params: any; maxTurns?: number }>,
	iterations: number = 100,
): Promise<{
	reports: PlaybookDemographyReport[];
	consolidated: {
		totalPlaybooks: number;
		playbooksWithExtinction: number;
		playbooksWithPrematureExtinction: number;
		playbooksWithCriticalExtinction: number;
		avgMortalityAcrossPlaybooks: number;
		avgExtinctionRateAcrossPlaybooks: number;
	};
}> {
	const reports: PlaybookDemographyReport[] = [];

	for (const pb of playbooks) {
		const maxTurns = pb.maxTurns ?? 50;
		console.log(`\n📊 Validando playbook: ${pb.id} (${pb.name}) — ${iterations} iterações...`);

		const results = await runPlaybookDemography(
			pb.params as SimulationParams,
			maxTurns,
			iterations,
		);

		const report = analyzePlaybookResults(
			pb.id,
			pb.name,
			pb.category,
			results,
			maxTurns,
		);

		reports.push(report);

		// Print summary line
		const extinctionIcon = report.extinctionRate > 0.5 ? "🔴" : report.extinctionRate > 0.3 ? "🟡" : "🟢";
		console.log(
			`  ${extinctionIcon} ${pb.id}: ` +
			`mort=${(report.globalMortalityRate * 100).toFixed(0)}% ` +
			`ext=${(report.extinctionRate * 100).toFixed(0)}% ` +
			`prem=${(report.prematureExtinctionRate * 100).toFixed(0)}% ` +
			`avg_surv=${report.avgSurvivors.toFixed(2)} ` +
			`1st_bank=T${report.avgFirstBankruptcyTurn?.toFixed(0) ?? "N/A"}`,
		);

		// Flush output
		if (typeof process !== "undefined" && process.stdout) {
			process.stdout.write("");
		}
	}

	// Consolidated statistics
	const withExtinction = reports.filter((r) => r.extinctionRate > 0).length;
	const withPremature = reports.filter(
		(r) => r.prematureExtinctionRate > 0,
	).length;
	const withCritical = reports.filter(
		(r) => r.extinctionRate > 0.5,
	).length;
	const avgMortalityOverall =
		reports.reduce((a, r) => a + r.globalMortalityRate, 0) / reports.length;
	const avgExtinctionOverall =
		reports.reduce((a, r) => a + r.extinctionRate, 0) / reports.length;

	return {
		reports,
		consolidated: {
			totalPlaybooks: reports.length,
			playbooksWithExtinction: withExtinction,
			playbooksWithPrematureExtinction: withPremature,
			playbooksWithCriticalExtinction: withCritical,
			avgMortalityAcrossPlaybooks: avgMortalityOverall,
			avgExtinctionRateAcrossPlaybooks: avgExtinctionOverall,
		},
	};
}

/**
 * Gera um relatório textual completo da validação demográfica.
 */
export function generateDemographyReport(result: {
	reports: PlaybookDemographyReport[];
	consolidated: {
		totalPlaybooks: number;
		playbooksWithExtinction: number;
		playbooksWithPrematureExtinction: number;
		playbooksWithCriticalExtinction: number;
		avgMortalityAcrossPlaybooks: number;
		avgExtinctionRateAcrossPlaybooks: number;
	};
}): string {
	const { reports, consolidated } = result;
	const lines: string[] = [];

	lines.push("=".repeat(72));
	lines.push("RELATÓRIO DE VALIDAÇÃO DEMOGRÁFICA — ISSUE #542");
	lines.push("Robustez: Validação das Curvas de Demografia Empresarial");
	lines.push("=".repeat(72));
	lines.push("");
	lines.push(`Total de playbooks analisados: ${consolidated.totalPlaybooks}`);
	lines.push(`Playbooks com extinção (>0%): ${consolidated.playbooksWithExtinction}`);
	lines.push(`Playbooks com extinção prematura: ${consolidated.playbooksWithPrematureExtinction}`);
	lines.push(`Playbooks com extinção crítica (>50%): ${consolidated.playbooksWithCriticalExtinction}`);
	lines.push(`Mortalidade média geral: ${(consolidated.avgMortalityAcrossPlaybooks * 100).toFixed(1)}%`);
	lines.push(`Taxa de extinção média geral: ${(consolidated.avgExtinctionRateAcrossPlaybooks * 100).toFixed(1)}%`);
	lines.push("");

	// Detailed per-playbook
	lines.push("-".repeat(72));
	lines.push("DETALHAMENTO POR PLAYBOOK");
	lines.push("-".repeat(72));

	for (const r of reports) {
		lines.push("");
		const statusIcon =
			r.extinctionRate > 0.5
				? "🔴 CRÍTICO"
				: r.extinctionRate > 0.3
					? "🟡 ATENÇÃO"
					: "🟢 OK";
		lines.push(`## ${r.playbookId} — ${r.playbookName} [${statusIcon}]`);
		lines.push(`   Categoria: ${r.category}`);
		lines.push(`   Iterações: ${r.runs}`);
		lines.push(`   Mortalidade média: ${(r.globalMortalityRate * 100).toFixed(1)}%`);
		lines.push(`   Taxa de sobrevivência: ${(r.globalSurvivalRate * 100).toFixed(1)}%`);
		lines.push(`   Taxa de extinção: ${(r.extinctionRate * 100).toFixed(1)}%`);
		lines.push(`   Extinção prematura (<T20): ${(r.prematureExtinctionRate * 100).toFixed(1)}%`);
		lines.push(
			`   Primeira falência (média): T${r.avgFirstBankruptcyTurn?.toFixed(1) ?? "N/A"}`,
		);
		lines.push(
			`   Turnos médios com 0 startups: ${r.avgTurnsWithZeroStartups.toFixed(2)}`,
		);
		lines.push(
			`   Startups sobreviventes: min=${r.minSurvivors} max=${r.maxSurvivors} ` +
			`média=${r.avgSurvivors.toFixed(2)} σ=${r.stdSurvivors.toFixed(2)}`,
		);

		// Curve summary (sample at key turns)
		const curve = r.avgActiveStartupsAtTurn;
		const sampleTurns = [0, 5, 10, 20, 30, 40, 49].filter(
			(t) => t < curve.length,
		);
		lines.push(`   Curva média (turnos selecionados):`);
		for (const t of sampleTurns) {
			lines.push(`     T${t}: ${curve[t].toFixed(2)} startups`);
		}

		if (r.recommendations.length > 0) {
			lines.push(`   Recomendações:`);
			for (const rec of r.recommendations) {
				lines.push(`     ${rec}`);
			}
		}
	}

	// Overall assessment
	lines.push("");
	lines.push("=".repeat(72));
	lines.push("AVALIAÇÃO CONSOLIDADA");
	lines.push("=".repeat(72));
	lines.push("");

	const criticalCount = consolidated.playbooksWithCriticalExtinction;
	if (criticalCount > 0) {
		lines.push(
			`🔴 ${criticalCount} de ${consolidated.totalPlaybooks} playbooks apresentam ` +
			`extinção crítica (>50% das runs).`,
		);
		lines.push(
			`   Ajustes recomendados nos parâmetros de capital inicial, custos de conformidade,`,
		);
		lines.push(`   probabilidade de auditoria e/ou severidade de multas.`);
		lines.push(``);
		lines.push(
			`   Parâmetros a revisar para evitar extinção em massa:`,
		);
		lines.push(`   1. startupInitialCapital: aumentar o capital inicial`);
		lines.push(`   2. startupFixedCost: reduzir custos fixos`);
		lines.push(`   3. complianceCostHighRisk: reduzir para cenários punitivos`);
		lines.push(`   4. auditProbability: reduzir frequência de fiscalização`);
		lines.push(`   5. fineSeverity: reduzir severidade de multas`);
		lines.push(`   6. trustRevenueFloor: aumentar piso de receita baseado em confiança`);
	} else {
		lines.push(
			`🟢 Nenhum playbook apresenta extinção crítica. ` +
			`Demografia empresarial dentro de parâmetros aceitáveis.`,
		);
	}

	lines.push("");
	lines.push(`Relatório gerado em: ${new Date().toISOString()}`);

	return lines.join("\n");
}
