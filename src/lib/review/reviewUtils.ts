import type { CardSchedule, ReviewAlgorithm } from './reviewTypes';
import { calculateSM2 } from './algorithms/sm2';
import { calculateSimple } from './algorithms/simpleIntervals';
import { calculateLeitner, BOX_INTERVALS } from './algorithms/leitner';

export function isDue(schedule: CardSchedule): boolean {
	const today = new Date().toISOString().slice(0, 10);
	return schedule.nextReviewAt <= today;
}

export function getAlgorithmLabel(algorithm: ReviewAlgorithm): string {
	switch (algorithm) {
		case 'sm2': return 'SM-2';
		case 'simple': return 'Simple';
		case 'leitner': return 'Leitner';
	}
}

export function getNextReviewLabel(nextReviewAt: string): string {
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const next = new Date(nextReviewAt + 'T00:00:00');
	const diffMs = next.getTime() - today.getTime();
	const days = Math.round(diffMs / 86_400_000);

	if (days <= 0) return 'Today';
	if (days === 1) return 'Tomorrow';
	if (days < 7) return `In ${days} days`;
	if (days < 14) return 'In 1 week';
	if (days < 30) return `In ${Math.round(days / 7)} weeks`;
	if (days < 60) return 'In 1 month';
	return `In ${Math.round(days / 30)} months`;
}

export function getLeitnerBoxLabel(box: number): string {
	const interval = BOX_INTERVALS[box - 1] ?? 1;
	const labels = ['Daily', 'Every 3 days', 'Weekly', 'Every 2 weeks', 'Monthly'];
	return labels[box - 1] ?? `Every ${interval} days`;
}

export function calculateRetentionRate(
	reviews: Array<{ rating: string }>
): number {
	if (reviews.length === 0) return 0;
	const correct = reviews.filter((r) => r.rating === 'correct').length;
	return Math.round((correct / reviews.length) * 100);
}

export interface NextReviewPreview {
	correct: string;
	partial: string;
	incorrect: string;
}

export function getNextReviewPreview(
	schedule: CardSchedule | null,
	algorithm: ReviewAlgorithm
): NextReviewPreview {
	const today = new Date().toISOString().slice(0, 10);

	function intervalToLabel(interval: number): string {
		if (interval <= 0) return 'Today';
		if (interval === 1) return 'Tomorrow';
		if (interval < 7) return `${interval} days`;
		if (interval === 7) return '1 week';
		if (interval < 30) return `${Math.round(interval / 7)} weeks`;
		return `${Math.round(interval / 30)} months`;
	}

	function addDays(days: number): string {
		const d = new Date();
		d.setDate(d.getDate() + days);
		return d.toISOString().slice(0, 10);
	}

	if (algorithm === 'sm2') {
		const ef = schedule?.easeFactor ?? 2.5;
		const reps = schedule?.repetitions ?? 0;
		const iv = schedule?.interval ?? 0;
		const r = (rating: 'correct' | 'partial' | 'incorrect') =>
			calculateSM2(rating, ef, reps, iv);
		return {
			correct: intervalToLabel(r('correct').nextInterval),
			partial: intervalToLabel(r('partial').nextInterval),
			incorrect: intervalToLabel(r('incorrect').nextInterval)
		};
	}

	if (algorithm === 'simple') {
		const iv = schedule?.interval ?? 0;
		return {
			correct: intervalToLabel(calculateSimple('correct', iv).nextInterval),
			partial: intervalToLabel(calculateSimple('partial', iv).nextInterval),
			incorrect: intervalToLabel(calculateSimple('incorrect', iv).nextInterval)
		};
	}

	// leitner
	const box = schedule?.leitnerBox ?? 1;
	return {
		correct: intervalToLabel(calculateLeitner('correct', box).nextInterval),
		partial: intervalToLabel(calculateLeitner('partial', box).nextInterval),
		incorrect: intervalToLabel(calculateLeitner('incorrect', box).nextInterval)
	};
}
