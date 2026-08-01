/**
 * LCG RNG (Linear Congruential Generator) determinístico.
 * Essencial para reprodutibilidade científica através de sementes (seeds).
 */
export class RNG {
	private seed: number;

	constructor(seed: number = 42) {
		this.seed = seed;
	}

	/**
	 * Retorna o próximo valor flutuante no intervalo [0, 1).
	 */
	next(): number {
		this.seed = (this.seed * 1664525 + 1013904223) % 4294967296;
		return this.seed / 4294967296;
	}

	/**
	 * Retorna um número inteiro aleatório entre min e max (inclusive).
	 */
	nextInt(min: number, max: number): number {
		return Math.floor(this.next() * (max - min + 1)) + min;
	}
}
