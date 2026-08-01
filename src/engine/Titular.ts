import { RNG } from "./RNG";

/**
 * Titular.ts - Agente representando titulares de dados (LGPD Art. 17)
 *
 * Implementa uma população de agentes TITULAR com comportamento reativo simples.
 * Cada titular tem um nível de confiança (trustLevel) que é afetado por incidentes
 * e pode entrar em boicote (boycott) de empresas com baixa reputação.
 *
 * Referência: PL 2338/2023, Capítulo de Direitos Fundamentais
 * Literatura: Bonabeau (2002), Macal e North (2010) - Agent-Based Modeling
 */

export interface TitularParams {
	initialTrustLevel?: number;
	boycottThreshold?: number;
	trustReduction?: number;
}

/**
 * Classe representando um titular de dados
 */
export class Titular {
	id: number;
	trustLevel: number;
	incidentsExperienced: number;
	isBoycotting: boolean;
	boycottThreshold: number;
	boycottTargets: Set<string>;

	/**
	 * Cria um novo agente titular
	 * @param {number} id - Identificador único do titular
	 * @param {RNG} _rng - Instância do RNG para geração aleatória com seed
	 * @param {TitularParams} params - Parâmetros de configuração
	 */
	constructor(id: number, _rng: RNG, params: TitularParams = {}) {
		this.id = id;
		this.trustLevel = params.initialTrustLevel ?? 1.0; // 0 to 1, padrão é confiança máxima
		this.incidentsExperienced = 0;
		this.isBoycotting = false;
		this.boycottThreshold = params.boycottThreshold ?? 0.3;
		this.boycottTargets = new Set(); // Conjunto de IDs de empresas em boicote
	}

	/**
	 * Reage a um incidente envolvendo uma empresa específica
	 * @param {string} companyId - ID da empresa envolvida no incidente
	 * @param {TitularParams} params - Parâmetros de configuração
	 */
	reactToIncident(companyId: string, params: TitularParams = {}) {
		const trustReduction = params.trustReduction ?? 0.1;

		this.trustLevel = Math.max(0, this.trustLevel - trustReduction);
		this.incidentsExperienced++;

		// Verificar se deve entrar em boicote
		if (this.trustLevel < this.boycottThreshold) {
			this.isBoycotting = true;
			this.boycottTargets.add(companyId);
		}
	}

	/**
	 * Verifica se este titular está boicotando uma empresa específica
	 * @param {string} companyId - ID da empresa a verificar
	 * @returns {boolean} - true se está boicotando a empresa
	 */
	isBoycottingCompany(companyId: string): boolean {
		return this.isBoycotting && this.boycottTargets.has(companyId);
	}

	/**
	 * Adiciona uma empresa à lista de boicote
	 * @param {string} companyId - ID da empresa a boicotar
	 */
	addBoycottTarget(companyId: string) {
		this.boycottTargets.add(companyId);
		if (this.trustLevel < this.boycottThreshold) {
			this.isBoycotting = true;
		}
	}

	/**
	 * Remove uma empresa da lista de boicote (para recuperação de confiança)
	 * @param {string} companyId - ID da empresa a remover do boicote
	 */
	removeBoycottTarget(companyId: string) {
		this.boycottTargets.delete(companyId);
		if (this.boycottTargets.size === 0) {
			this.isBoycotting = false;
		}
	}

	/**
	 * Recupera confiança passivamente ao longo do tempo
	 * @param {number} recoveryRate - Taxa de recuperação por turno
	 */
	recoverTrust(recoveryRate: number) {
		this.trustLevel = Math.min(1, this.trustLevel + recoveryRate);

		// Se a confiança se recuperou acima do limiar, sair do boicote
		if (this.trustLevel >= this.boycottThreshold && this.isBoycotting) {
			this.isBoycotting = false;
			this.boycottTargets.clear();
		}
	}

	/**
	 * Retorna o estado atual do titular
	 */
	getState() {
		return {
			id: this.id,
			trustLevel: this.trustLevel,
			incidentsExperienced: this.incidentsExperienced,
			isBoycotting: this.isBoycotting,
			boycottTargets: Array.from(this.boycottTargets),
			boycottThreshold: this.boycottThreshold,
		};
	}
}

/**
 * Função utilitária para calcular socialTrust global a partir de titulares
 * @param {Array<Titular>} titulares - Array de agentes titulares
 * @returns {number} - Nível de confiança social agregada (0-100)
 */
export function calculateSocialTrustFromTitulares(titulares: Titular[]): number {
	if (titulares.length === 0) {
		return 100; // Valor default se não houver titulares
	}

	const avgTrustLevel =
		titulares.reduce((sum, t) => sum + t.trustLevel, 0) / titulares.length;
	// Converter de 0-1 para 0-100
	return avgTrustLevel * 100;
}

/**
 * Função utilitária para calcular a penalidade de receita por boicote
 * @param {Array<Titular>} titulares - Array de agentes titulares
 * @param {string} companyId - ID da empresa a verificar
 * @param {number} penaltyPerTitular - Penalidade por titular em boicote
 * @returns {number} - Penalidade total de receita
 */
export function calculateBoycottPenalty(
	titulares: Titular[],
	companyId: string,
	penaltyPerTitular: number,
): number {
	const boycottingCount = titulares.filter((t) =>
		t.isBoycottingCompany(companyId),
	).length;
	return boycottingCount * penaltyPerTitular;
}
