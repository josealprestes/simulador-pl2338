/**
 * validateConcentrationTrust.ts — Issue #541
 * 
 * Validação das Curvas de Concentração (HHI) e Confiança (socialTrust)
 * em 100 cenários estocásticos para garantir robustez e suavidade.
 * 
 * Executa BatchRunner.run() para cada playbook representativo com 100
 * iterações, analisa distribuições, variância e correlações esperadas.
 */

import { MetricsEngine } from "../MetricsEngine";
import { BatchRunner } from "../BatchRunner";
import type { SimulationParams } from "../types";

// ─── Playbook Params Representativos ────────────────────────────────────────

/** Parâmetros base padrão do simulador */
const DEFAULT_PARAMS: SimulationParams = {
	initialStartups: 20,
	initialBigTechs: 2,
	startupInitialCapital: 50000,
	bigTechInitialCapital: 500000,
	startupInnovationCapacity: 15,
	bigTechInnovationCapacity: 5,
	complianceCostHighRisk: 20000,
	auditProbability: 0.1,
	fineSeverity: 100000,
	sandboxCapacity: 5,
	lgpdIncidentChance: 0.15,
	socialSensibility: 10,
	maxTurns: 50,
	seed: 12345,
};

/** Playbook: dinâmicas-sociais (trust impact) — Schumpeter Mark II */
const PLAYBOOK_DINAMICAS_SOCIAIS: SimulationParams = {
	...DEFAULT_PARAMS,
	initialStartups: 10,
	initialBigTechs: 4,
	startupInitialCapital: 70000,
	bigTechInitialCapital: 1200000,
	startupInnovationCapacity: 10,
	bigTechInnovationCapacity: 45,
	trustRevenueFloor: 0.25,
	highRiskProductRevenue: 12000,
	startupHighRiskThreshold: 0.25,
	startupComplianceThreshold: 0.7,
	complianceCostHighRisk: 5000,
	auditProbability: 0.05,
	fineSeverity: 10000,
	sandboxCapacity: 0,
	lgpdIncidentChance: 0.04,
	socialSensibility: 3,
	reoffenderMultiplier: 1.5,
	innovationHHIThresholds: [2000, 4000],
	innovationHHIModifiers: [1.0, 1.2, 0.7],
	maxTurns: 20,
	actors: {
		ventureCapital: {
			active: true,
			investmentProbability: 0.45,
			ticketSize: 60000,
			complianceFreezeThreshold: 120000,
			fineFreezeThreshold: 500000,
			trustFreezeThreshold: 15,
			vcFreezeMode: "probabilistic",
		},
		stateFund: false,
		infrastructure: {
			active: true,
			cloudRentBase: 5000,
			cloudRentPerProduct: 2000,
		},
		openSource: false,
		learning: { active: true, maturityGain: 0.1 },
	},
};

/** Playbook: concentracao-poder-mercado (HHI focus) — Porter */
const PLAYBOOK_CONCENTRACAO: SimulationParams = {
	...DEFAULT_PARAMS,
	initialStartups: 15,
	initialBigTechs: 3,
	startupInitialCapital: 55000,
	bigTechInitialCapital: 1600000,
	startupInnovationCapacity: 14,
	bigTechInnovationCapacity: 12,
	bigTechFixedCost: 16000,
	trustRevenueFloor: 0.4,
	highRiskProductRevenue: 10000,
	startupComplianceThreshold: 0.7,
	complianceCostHighRisk: 70000,
	auditProbability: 0.15,
	fineSeverity: 100000,
	sandboxCapacity: 2,
	lgpdIncidentChance: 0.08,
	socialSensibility: 10,
	maxTurns: 50,
	actors: {
		ventureCapital: {
			active: true,
			investmentProbability: 0.25,
			ticketSize: 50000,
			complianceFreezeThreshold: 90000,
			fineFreezeThreshold: 150000,
			trustFreezeThreshold: 25,
		},
		stateFund: false,
		infrastructure: false,
		openSource: false,
		learning: { active: true, maturityGain: 0.1 },
	},
};

/** Playbook: acesso-inovacao (innovation affects concentration) */
const PLAYBOOK_ACESSO_INOVACAO: SimulationParams = {
	...DEFAULT_PARAMS,
	initialStartups: 20,
	initialBigTechs: 2,
	startupInitialCapital: 80000,
	bigTechInitialCapital: 1000000,
	startupInnovationCapacity: 20,
	bigTechInnovationCapacity: 8,
	trustRevenueFloor: 0.4,
	startupHighRiskThreshold: 0.3,
	startupComplianceThreshold: 0.5,
	bigTechComplianceThreshold: 0.75,
	complianceCostHighRisk: 15000,
	auditProbability: 0.05,
	fineSeverity: 10000,
	sandboxCapacity: 3,
	lgpdIncidentChance: 0.05,
	socialSensibility: 2,
	reoffenderMultiplier: 1.5,
	maxTurns: 50,
	actors: {
		ventureCapital: {
			active: true,
			investmentProbability: 0.4,
			ticketSize: 80000,
			vcFreezeMode: "probabilistic",
			vcBaseFreezeProb: 0.4,
		},
		stateFund: false,
		infrastructure: false,
		openSource: false,
		learning: { active: true, maturityGain: 0.05 },
	},
	reputationEnabled: true,
	reputationRevenueImpact: 0.2,
	reputationPenaltyPerIncident: 0.2,
	handFormulaEnabled: true,
	negligenceMultiplier: 2.5,
	lobbyEnabled: true,
	lobbyCapitalThreshold: 5000000,
	lobbySuccessRate: 0.15,
	lobbyAuditReduction: 0.03,
	lobbyCompliancePenalty: 5000,
	complianceCostCap: 200000,
};

/** Playbook: regulacao-conformidade (compliance affects both) — Fórmula de Hand */
const PLAYBOOK_REGULACAO: SimulationParams = {
	...DEFAULT_PARAMS,
	initialStartups: 20,
	initialBigTechs: 2,
	startupInitialCapital: 55000,
	bigTechInitialCapital: 1600000,
	startupInnovationCapacity: 12,
	bigTechInnovationCapacity: 12,
	bigTechFixedCost: 18000,
	trustRevenueFloor: 0.45,
	highRiskProductRevenue: 10000,
	startupHighRiskThreshold: 0.55,
	startupComplianceThreshold: 0.75,
	complianceCostHighRisk: 80000,
	copyrightFeeRate: 0,
	auditProbability: 0.2,
	fineSeverity: 400000,
	sandboxCapacity: 2,
	lgpdIncidentChance: 0.05,
	socialSensibility: 5,
	maxTurns: 40,
	actors: {
		ventureCapital: false,
		stateFund: false,
		infrastructure: false,
		openSource: false,
		learning: { active: true, maturityGain: 0.1 },
	},
};

// ─── All playbooks to test ──────────────────────────────────────────────────

export interface PlaybookTestCase {
	id: string;
	name: string;
	params: SimulationParams;
}

export const PLAYBOOKS: PlaybookTestCase[] = [
	{
		id: "dinamicas-sociais",
		name: "Dinâmicas Sociais (Schumpeter Mark II)",
		params: PLAYBOOK_DINAMICAS_SOCIAIS,
	},
	{
		id: "concentracao-poder-mercado",
		name: "Concentração & Poder de Mercado (Porter)",
		params: PLAYBOOK_CONCENTRACAO,
	},
	{
		id: "acesso-inovacao",
		name: "Acesso & Inovação",
		params: PLAYBOOK_ACESSO_INOVACAO,
	},
	{
		id: "regulacao-conformidade",
		name: "Regulação & Conformidade (Hand)",
		params: PLAYBOOK_REGULACAO,
	},
];

// ─── Statistics Helpers ─────────────────────────────────────────────────────

export interface DistributionStats {
	mean: number;
	median: number;
	stdDev: number;
	variance: number;
	min: number;
	max: number;
	cv: number; // coefficient of variation (stdDev / mean)
}

export function computeStats(values: number[]): DistributionStats {
	const sorted = [...values].sort((a, b) => a - b);
	const n = sorted.length;
	const mean = sorted.reduce((a, b) => a + b, 0) / n;
	const variance = sorted.reduce((acc, v) => acc + (v - mean) ** 2, 0) / n;
	const stdDev = Math.sqrt(variance);
	const median = n % 2 === 0
		? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
		: sorted[Math.floor(n / 2)];
	const cv = mean !== 0 ? stdDev / mean : 0;

	return {
		mean,
		median,
		stdDev,
		variance,
		min: sorted[0],
		max: sorted[n - 1],
		cv,
	};
}

export interface CorrelationResult {
	pearson: number;
	interpretation: string;
}

export function computeCorrelation(
	x: number[],
	y: number[],
	labelX: string,
	labelY: string,
	expectedSign: "positive" | "negative" | "none",
): CorrelationResult {
	const n = Math.min(x.length, y.length);
	const avgX = x.slice(0, n).reduce((a, b) => a + b, 0) / n;
	const avgY = y.slice(0, n).reduce((a, b) => a + b, 0) / n;

	let num = 0, denX = 0, denY = 0;
	for (let i = 0; i < n; i++) {
		const dx = x[i] - avgX;
		const dy = y[i] - avgY;
		num += dx * dy;
		denX += dx * dx;
		denY += dy * dy;
	}

	const pearson = denX === 0 || denY === 0 ? 0 : num / Math.sqrt(denX * denY);

	let interpretation: string;
	if (expectedSign === "positive") {
		interpretation = pearson > 0.3
			? `✅ Correlação positiva esperada entre ${labelX} e ${labelY}: ${pearson.toFixed(3)}`
			: `⚠️ Correlação positiva entre ${labelX} e ${labelY} abaixo do esperado: ${pearson.toFixed(3)}`;
	} else if (expectedSign === "negative") {
		interpretation = pearson < -0.3
			? `✅ Correlação negativa esperada entre ${labelX} e ${labelY}: ${pearson.toFixed(3)}`
			: `⚠️ Correlação negativa entre ${labelX} e ${labelY} abaixo do esperado: ${pearson.toFixed(3)}`;
	} else {
		interpretation = `Correlação entre ${labelX} e ${labelY}: ${pearson.toFixed(3)}`;
	}

	return { pearson, interpretation };
}

// ─── Validation Report ──────────────────────────────────────────────────────

export interface ValidationFinding {
	playbook: string;
	metric: string;
	status: "pass" | "warn" | "fail";
	message: string;
}

export interface ValidationReport {
	timestamp: string;
	summary: string;
	findings: ValidationFinding[];
	overallStatus: "pass" | "warn" | "fail";
}

// ─── Main Validator ─────────────────────────────────────────────────────────

const ITERATIONS = 100;
const MAX_CV_THRESHOLD = 0.30; // CV < 30%

/**
 * Executa a validação para todos os playbooks e retorna um relatório.
 */
export async function validateAllPlaybooks(): Promise<ValidationReport> {
	const findings: ValidationFinding[] = [];
	let hasWarnings = false;
	let hasFailures = false;

	for (const pb of PLAYBOOKS) {
		process.stdout.write(`\n🔍 Validando playbook: ${pb.name} (${pb.id})...\n`);

		// 1. Run batch
		const results = await BatchRunner.run(pb.params, ITERATIONS);

		if (results.length === 0) {
			findings.push({
				playbook: pb.id,
				metric: "batch",
				status: "fail",
				message: `${pb.name}: Nenhum resultado retornado pelo BatchRunner.`,
			});
			hasFailures = true;
			continue;
		}

		// 2. Extrair métricas
		const hhiValues = results.map((r) => r.hhi);
		const trustValues = results.map((r) => r.socialTrust);
		const startupValues = results.map((r) => r.activeStartups);
		const bigTechValues = results.map((r) => r.activeBigTechs);

		// 3. Estatísticas descritivas
		const hhiStats = computeStats(hhiValues);
		const trustStats = computeStats(trustValues);
		const startupStats = computeStats(startupValues);

		process.stdout.write(`   HHI:        média=${hhiStats.mean.toFixed(1)}, CV=${(hhiStats.cv * 100).toFixed(1)}%, [${hhiStats.min}-${hhiStats.max}]\n`);
		process.stdout.write(`   socialTrust: média=${trustStats.mean.toFixed(1)}, CV=${(trustStats.cv * 100).toFixed(1)}%, [${trustStats.min}-${trustStats.max}]\n`);
		process.stdout.write(`   startups:    média=${startupStats.mean.toFixed(1)}, CV=${(startupStats.cv * 100).toFixed(1)}%, [${startupStats.min}-${startupStats.max}]\n`);

		// 4. Verificar variância (CV < 30%)
		const hhiCvOk = hhiStats.cv < MAX_CV_THRESHOLD || hhiStats.mean < 100; // baixo HHI pode ter CV alto
		const trustCvOk = trustStats.cv < MAX_CV_THRESHOLD || trustStats.mean < 10; // trust baixo pode ter CV alto
		const startupCvOk = startupStats.cv < MAX_CV_THRESHOLD || startupStats.mean < 3;

		if (!hhiCvOk) {
			findings.push({
				playbook: pb.id,
				metric: "hhi",
				status: "warn",
				message: `HHI CV=${(hhiStats.cv * 100).toFixed(1)}% > 30% (mean=${hhiStats.mean.toFixed(1)}). Alta dispersão pode indicar choques estocásticos excessivos.`,
			});
			hasWarnings = true;
		} else {
			findings.push({
				playbook: pb.id,
				metric: "hhi",
				status: "pass",
				message: `HHI CV=${(hhiStats.cv * 100).toFixed(1)}% < 30% (mean=${hhiStats.mean.toFixed(1)}). Dispersão aceitável.`,
			});
		}

		if (!trustCvOk) {
			findings.push({
				playbook: pb.id,
				metric: "socialTrust",
				status: "warn",
				message: `socialTrust CV=${(trustStats.cv * 100).toFixed(1)}% > 30% (mean=${trustStats.mean.toFixed(1)}). Quedas abruptas de confiança podem ser realistas ou excessivas.`,
			});
			hasWarnings = true;
		} else {
			findings.push({
				playbook: pb.id,
				metric: "socialTrust",
				status: "pass",
				message: `socialTrust CV=${(trustStats.cv * 100).toFixed(1)}% < 30% (mean=${trustStats.mean.toFixed(1)}). Dispersão aceitável.`,
			});
		}

		if (!startupCvOk) {
			findings.push({
				playbook: pb.id,
				metric: "activeStartups",
				status: "warn",
				message: `activeStartups CV=${(startupStats.cv * 100).toFixed(1)}% > 30% (mean=${startupStats.mean.toFixed(1)}). Mortalidade muito variável entre cenários.`,
			});
			hasWarnings = true;
		} else {
			findings.push({
				playbook: pb.id,
				metric: "activeStartups",
				status: "pass",
				message: `activeStartups CV=${(startupStats.cv * 100).toFixed(1)}% < 30% (mean=${startupStats.mean.toFixed(1)}). Dispersão aceitável.`,
			});
		}

		// 5. Correlações esperadas
		// trust + startups → positiva (confiança alta → mais startups sobrevivem)
		const trustStartupCorr = computeCorrelation(
			trustValues, startupValues,
			"socialTrust", "activeStartups", "positive",
		);
		findings.push({
			playbook: pb.id,
			metric: "corr_trust_startups",
			status: trustStartupCorr.pearson > 0.3 ? "pass" : "warn",
			message: trustStartupCorr.interpretation,
		});
		if (trustStartupCorr.pearson <= 0.3) hasWarnings = true;

		// hhi + startups → negativa (alta concentração → menos startups)
		const hhiStartupCorr = computeCorrelation(
			hhiValues, startupValues,
			"hhi", "activeStartups", "negative",
		);
		findings.push({
			playbook: pb.id,
			metric: "corr_hhi_startups",
			status: hhiStartupCorr.pearson < -0.3 ? "pass" : "warn",
			message: hhiStartupCorr.interpretation,
		});
		if (hhiStartupCorr.pearson >= -0.3) hasWarnings = true;

		// 6. Verificar trust não muito baixo (média > 20)
		if (trustStats.mean < 20) {
			findings.push({
				playbook: pb.id,
				metric: "socialTrust",
				status: "warn",
				message: `socialTrust médio=${trustStats.mean.toFixed(1)} < 20. Confiança social colapsada — verificar choques estocásticos.`,
			});
			hasWarnings = true;
		}

		process.stdout.write(`   ✅ Playbook ${pb.id} validado.\n`);
	}

	// 8. Overall status
	let overallStatus: "pass" | "warn" | "fail";
	let summary: string;

	if (hasFailures) {
		overallStatus = "fail";
		summary = "❌ VALIDAÇÃO FALHOU: Erros críticos encontrados.";
	} else if (hasWarnings) {
		overallStatus = "warn";
		summary = "⚠️ VALIDAÇÃO CONCLUÍDA COM AVISOS: Dispersão ou correlações abaixo do esperado em alguns playbooks.";
	} else {
		overallStatus = "pass";
		summary = "✅ VALIDAÇÃO APROVADA: Todos os playbooks apresentam curvas suaves e correlações esperadas.";
	}

	process.stdout.write(`\n${summary}\n`);

	return {
		timestamp: new Date().toISOString(),
		summary,
		findings,
		overallStatus,
	};
}

/**
 * Execução autônoma (node)
 */
if (import.meta.url === `file://${process.argv[1]}`) {
	validateAllPlaybooks().then((report) => {
		process.stdout.write(`\n--- FINAL REPORT ---\n`);
		process.stdout.write(`Status: ${report.overallStatus}\n`);
		process.stdout.write(`Summary: ${report.summary}\n`);
		process.stdout.write(`Findings:\n`);
		for (const f of report.findings) {
			process.stdout.write(`  [${f.status.toUpperCase()}] ${f.playbook}/${f.metric}: ${f.message}\n`);
		}
		process.exit(report.overallStatus === "fail" ? 1 : 0);
	}).catch((err) => {
		console.error(err);
		process.exit(1);
	});
}
