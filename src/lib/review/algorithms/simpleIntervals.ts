export interface SimpleResult {
	nextInterval: number;
}

const MAX_INTERVAL = 180;

export function calculateSimple(
	rating: 'correct' | 'partial' | 'incorrect',
	currentInterval: number
): SimpleResult {
	let nextInterval: number;

	if (rating === 'incorrect') {
		nextInterval = 1;
	} else if (rating === 'partial') {
		nextInterval = 3;
	} else {
		// correct
		if (currentInterval < 7) {
			nextInterval = 7;
		} else {
			nextInterval = Math.round(currentInterval * 2.0);
		}
	}

	return { nextInterval: Math.min(nextInterval, MAX_INTERVAL) };
}
