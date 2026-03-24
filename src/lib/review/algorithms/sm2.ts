export interface SM2Result {
	nextInterval: number;
	nextEaseFactor: number;
	nextRepetitions: number;
}

/**
 * SM-2 algorithm.
 * q values: correct=5, partial=3, incorrect=1
 */
export function calculateSM2(
	rating: 'correct' | 'partial' | 'incorrect',
	currentEaseFactor: number,
	currentRepetitions: number,
	currentInterval: number
): SM2Result {
	const q = rating === 'correct' ? 5 : rating === 'partial' ? 3 : 1;

	if (q < 3) {
		return {
			nextInterval: 1,
			nextEaseFactor: Math.max(1.3, Math.min(2.5, currentEaseFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)))),
			nextRepetitions: 0
		};
	}

	const nextRepetitions = currentRepetitions + 1;
	let nextInterval: number;

	if (currentRepetitions === 0) {
		nextInterval = 1;
	} else if (currentRepetitions === 1) {
		nextInterval = 6;
	} else {
		nextInterval = Math.round(currentInterval * currentEaseFactor);
	}

	const nextEaseFactor = Math.max(1.3, Math.min(2.5, currentEaseFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))));

	return { nextInterval, nextEaseFactor, nextRepetitions };
}
