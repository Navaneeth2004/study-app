export interface LeitnerResult {
	nextBox: number;
	nextInterval: number;
}

export const BOX_INTERVALS = [1, 3, 7, 14, 30];

export function calculateLeitner(
	rating: 'correct' | 'partial' | 'incorrect',
	currentBox: number
): LeitnerResult {
	let nextBox: number;

	if (rating === 'correct') {
		nextBox = Math.min(5, currentBox + 1);
	} else if (rating === 'partial') {
		nextBox = currentBox;
	} else {
		nextBox = 1;
	}

	return {
		nextBox,
		nextInterval: BOX_INTERVALS[nextBox - 1]
	};
}
