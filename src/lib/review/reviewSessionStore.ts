import { writable, derived, get } from 'svelte/store';
import type { Flashcard } from '$lib/creator/flashcardTypes';
import type { SessionResult } from './reviewTypes';
import { recordReview } from './reviewService';

export type SessionMode = 'review';

export interface SessionState {
	cards: Flashcard[];
	queue: Flashcard[];
	currentIndex: number;
	flipped: boolean;
	sessionResults: SessionResult[];
	isComplete: boolean;
	mode: SessionMode;
}

const empty: SessionState = {
	cards: [], queue: [], currentIndex: 0, flipped: false,
	sessionResults: [], isComplete: false, mode: 'review'
};

const session = writable<SessionState>(empty);
export const reviewSession = { subscribe: session.subscribe };
export const currentCard = derived(session, ($s) => $s.queue[$s.currentIndex] ?? null);

export const reviewProgress = derived(session, ($s) => {
	const doneIds = new Set(
		$s.sessionResults.filter((r) => r.rating === 'correct').map((r) => r.flashcardId)
	);
	return $s.cards.length > 0 ? (doneIds.size / $s.cards.length) * 100 : 0;
});

export const reviewSummary = derived(session, ($s) => {
	const correct = $s.sessionResults.filter((r) => r.rating === 'correct').length;
	const partial = $s.sessionResults.filter((r) => r.rating === 'partial').length;
	const incorrect = $s.sessionResults.filter((r) => r.rating === 'incorrect').length;
	const masteredIds = new Set(
		$s.sessionResults.filter((r) => r.rating === 'correct').map((r) => r.flashcardId)
	);
	return {
		correct, partial, incorrect,
		total: $s.sessionResults.length,
		avgInterval: 0,
		retention: $s.sessionResults.length > 0 ? Math.round((correct / $s.sessionResults.length) * 100) : 0,
		masteredCount: masteredIds.size,
		totalCards: $s.cards.length
	};
});

export function startSession(cards: Flashcard[], _mode?: SessionMode): void {
	session.set({
		cards: [...cards], queue: [...cards], currentIndex: 0,
		flipped: false, sessionResults: [], isComplete: false, mode: 'review'
	});
}

export async function rateCard(rating: 'correct' | 'partial' | 'incorrect'): Promise<void> {
	const $s = get(session);
	const card = $s.queue[$s.currentIndex];
	if (!card) return;

	let nextInterval = 1;

	// ALWAYS record the review in card_reviews (for stats/chart).
	// Only update the SM-2 schedule for CORRECT answers.
	// For wrong/partial we still write to card_reviews but skip schedule update.
	try {
		if (rating === 'correct') {
			// recordReview updates schedule + writes review record
			const schedule = await recordReview(card.id, rating, 'sm2');
			nextInterval = schedule.interval;
		} else {
			// Only write review record, no schedule update
			await recordReviewOnly(card.id, rating);
		}
	} catch { /* never block UI on review record failures */ }

	const result: SessionResult = { flashcardId: card.id, rating, nextInterval };

	session.update((s) => {
		const sessionResults = [...s.sessionResults, result];
		let newQueue = [...s.queue];
		newQueue.splice(s.currentIndex, 1);
		if (rating !== 'correct') newQueue.push(card);
		const isComplete = newQueue.length === 0;
		const nextIndex = isComplete ? 0 : Math.min(s.currentIndex, newQueue.length - 1);
		return { ...s, queue: newQueue, sessionResults, currentIndex: nextIndex, flipped: false, isComplete };
	});
}

/** Write a review record without updating the SM-2 schedule */
async function recordReviewOnly(flashcardId: string, rating: 'partial' | 'incorrect'): Promise<void> {
	const { pb } = await import('$lib/shared/pocketbase');
	const uid = pb.authStore.record?.id ?? '';
	await pb.collection('card_reviews').create({
		user: uid, flashcard: flashcardId, rating, algorithm: 'sm2',
		reviewedAt: new Date().toISOString()
	}, { requestKey: null });
}

export function endSession(): void {
	session.update((s) => ({ ...s, isComplete: true }));
}

export function resetSession(): void {
	session.set(empty);
}
