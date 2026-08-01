/**
 * MetricsEngine: Módulo puro para cálculos de indicadores de mercado.
 *
 * Sem caches: para o volume atual de agentes, correção e auditabilidade são
 * mais importantes que micro-otimização. Caches por identidade de array
 * mutável retornavam métricas obsoletas (HHI antigo, médias antigas).
 */
export class MetricsEngine {
	static calculateHHI(companies: import("./types").Company[], metric: "capital" | "revenueLastTurn" = "capital"): number {
		if (!companies || companies.length === 0) return 0;

		const total = companies.reduce((acc, c) => acc + (c[metric] || 0), 0);
		if (total === 0) return 0;

		const hhi = companies.reduce((acc, c) => {
			const share = ((c[metric] || 0) / total) * 100;
			return acc + share * share;
		}, 0);

		return Math.round(hhi);
	}

	/**
	 * Calcula o HHI baseado na contagem de produtos de um determinado nível de risco.
	 * @param {string} riskLevel
	 * @returns {number}
	 */
	static calculateProductHHI(
		companies: import("./types").Company[],
		riskLevel: string = "HIGH",
	): number {
		if (!companies || companies.length === 0) return 0;

		const counts = companies.map(
			(c) =>
				(c.products || []).filter((p: import("./types").Product) => p && p.riskLevel === riskLevel)
					.length,
		);
		const total = counts.reduce((acc, val) => acc + val, 0);
		if (total === 0) return 0;

		const hhi = counts.reduce((acc, val) => {
			const share = (val / total) * 100;
			return acc + share * share;
		}, 0);

		return Math.round(hhi);
	}

	static calculateAverages(companies: import("./types").Company[]): {
		avgCapital: number;
		avgRunway: number;
		avgBurnRate: number;
		/**
		 * Definição: a média de runway é calculada apenas entre empresas com
		 * runway finito. Empresas com runway infinito não são zeradas na soma
		 * (isso reduziria artificialmente a média) nem incluem o divisor.
		 */
		finiteRunwayCompanyCount: number;
		unlimitedRunwayCompanyCount: number;
	} {
		const empty = {
			avgCapital: 0,
			avgRunway: 0,
			avgBurnRate: 0,
			finiteRunwayCompanyCount: 0,
			unlimitedRunwayCompanyCount: 0,
		};
		if (!companies || companies.length === 0) return empty;

		const count = companies.length;
		const sums = companies.reduce(
			(acc, c) => ({
				capital: acc.capital + (c.capital || 0),
				burnRate: acc.burnRate + (c.burnRate || 0),
			}),
			{ capital: 0, burnRate: 0 },
		);

		const finiteRunways = companies
			.map((c) => c.runway)
			.filter((r): r is number => Number.isFinite(r));

		const avgRunway =
			finiteRunways.length === 0
				? 0
				: Math.round(finiteRunways.reduce((acc, r) => acc + r, 0) / finiteRunways.length);

		return {
			avgCapital: Math.round(sums.capital / count),
			avgRunway,
			avgBurnRate: Math.round(sums.burnRate / count),
			finiteRunwayCompanyCount: finiteRunways.length,
			unlimitedRunwayCompanyCount: count - finiteRunways.length,
		};
	}

	static calculateComplementaryRatio(companies: import("./types").Company[]): number {
		if (!companies || companies.length === 0) return 0;

		const highRiskProducts = companies.flatMap((c) =>
			(c.products || []).filter((p: import("./types").Product) => p && p.riskLevel === "HIGH"),
		);
		if (highRiskProducts.length === 0) return 0;

		const complementaryCount = highRiskProducts.filter(
			(p: import("./types").Product) => p && p.aiType === "COMPLEMENTARY",
		).length;
		return parseFloat(
			(complementaryCount / highRiskProducts.length).toFixed(2),
		);
	}

	/**
	 * Determina o modificador de inovação baseado no HHI (Aghion et al. 2005).
	 * @param {number} hhi
	 * @param {Array<number>} thresholds [low, high]
	 * @param {Array<number>} modifiers [lowMod, midMod, highMod]
	 * @returns {number}
	 */
	static getInnovationModifier(
		hhi: number,
		thresholds: number[] = [1500, 2500],
		modifiers: number[] = [1.0, 1.0, 1.0],
	): number {
		if (hhi < thresholds[0]) return modifiers[0]; // Mercado competitivo
		if (hhi < thresholds[1]) return modifiers[1]; // Neck-and-neck (estímulo)
		return modifiers[2]; // Mercado concentrado (desestímulo)
	}

	/**
	 * Calcula a matriz de correlação de Pearson para um conjunto de resultados de simulação.
	 * @param {Array<import("./types").BatchRunResult>} batchResults Saída do BatchRunner.run.
	 * @param {Array<string>} metrics Lista de métricas para correlacionar.
	 * @returns {Record<string, Record<string, number>>|null} Matriz de correlação.
	 */
	static calculateCorrelationMatrix(
		batchResults: import("./types").BatchRunResult[],
		metrics: (keyof import("./types").BatchRunResult)[] = ["activeStartups", "hhi", "socialTrust", "cloudDrain"],
	): Record<string, Record<string, number>> | null {
		const n = batchResults.length;
		if (n < 2) return null;

		const matrix: Record<string, Record<string, number>> = {};

		metrics.forEach((m1) => {
			matrix[m1] = {};
			metrics.forEach((m2) => {
				if (m1 === m2) {
					matrix[m1][m2] = 1.0;
					return;
				}

				const data1 = batchResults.map((r) => r[m1] ?? 0);
				const data2 = batchResults.map((r) => r[m2] ?? 0);

				const avg1 = data1.reduce((a, b) => a + b, 0) / n;
				const avg2 = data2.reduce((a, b) => a + b, 0) / n;

				let num = 0;
				let den1 = 0;
				let den2 = 0;

				for (let i = 0; i < n; i++) {
					const d1 = data1[i] - avg1;
					const d2 = data2[i] - avg2;
					num += d1 * d2;
					den1 += d1 * d1;
					den2 += d2 * d2;
				}

				const correlation =
					den1 === 0 || den2 === 0 ? 0 : num / Math.sqrt(den1 * den2);
				matrix[m1][m2] = parseFloat(correlation.toFixed(3));
			});
		});

		return matrix;
	}

	/**
	 * Calcula a variância de uma métrica.
	 * @param {Array<number>} values
	 * @returns {number}
	 */
	static calculateVariance(values: number[]): number {
		if (values.length < 2) return 0;
		const avg = values.reduce((a, b) => a + b, 0) / values.length;
		return (
			values.reduce((acc, val) => acc + (val - avg) ** 2, 0) / values.length
		);
	}
}
