/**
 * OpenSourceEngine: simulates the impact of open models on innovation costs.
 */

export interface OpenSourceResult {
	launched: boolean;
	costMultiplier: number;
}

export class OpenSourceEngine {
	/**
	 * Returns whether there was an open-source release and its innovation cost multiplier.
	 */
	static processOpenSource(turn: number, actorsConfig: Record<string, any> = {}): OpenSourceResult {
		const cycle = actorsConfig.releaseCycle || 10;
		const isReleaseTurn = turn > 0 && turn % cycle === 0;

		if (isReleaseTurn) {
			return {
				launched: true,
				costMultiplier: actorsConfig.costMultiplier ?? 0.5,
			};
		}

		return { launched: false, costMultiplier: 1.0 };
	}
}
