import { writable, derived, get } from 'svelte/store';
import type { Flashcard } from '$lib/creator/flashcardTypes';
import type { ReviewAlgorithm, SessionResult } from './reviewTypes';
import { recordReview } from './reviewService';

export interface SessionState {
	cards: Flashcard[];
	currentIndex: number;
	flipped: boolean;
	sessionResults: SessionResult[];
	isComplete: boolean;
	algorithm: ReviewAlgorithm;
}

const empty: SessionState = {
	cards: [],
	currentIndex: 0,
	flipped: false,
	sessionResults: [],
	isComplete: false,
	algorithm: 'sm2'
};

const session = writable<SessionState>(empty);

export const reviewSession = { subscribe: session.subscribe };

export const currentCard = derived(session, ($s) => $s.cards[$s.currentIndex] ?? null);

export const reviewProgress = derived(session, ($s) =>
	$s.cards.length > 0 ? ($s.currentIndex / $s.cards.length) * 100 : 0
);

export const reviewSummary = derived(session, ($s) => {
	const correct = $s.sessionResults.filter((r) => r.rating === 'correct').length;
	const partial = $s.sessionResults.filter((r) => r.rating === 'partial').length;
	const incorrect = $s.sessionResults.filter((r) => r.rating === 'incorrect').length;
	const totalInterval = $s.sessionResults.reduce((s, r) => s + r.nextInterval, 0);
	const avgInterval = $s.sessionResults.length > 0
		? Math.round(totalInterval / $s.sessionResults.length)
		: 0;
	const retention = $s.sessionResults.length > 0
		? Math.round((correct / $s.sessionResults.length) * 100)
		: 0;
	return { correct, partial, incorrect, total: $s.sessionResults.length, avgInterval, retention };
});

export function startSession(cards: Flashcard[], algorithm: ReviewAlgorithm): void {
	session.set({ cards, currentIndex: 0, flipped: false, sessionResults: [], isComplete: false, algorithm });
}

export function flipCurrent(): void {
	session.update((s) => ({ ...s, flipped: !s.flipped }));
}

export async function rateCard(rating: 'correct' | 'partial' | 'incorrect'): Promise<void> {
	const $s = get(session);
	const card = $s.cards[$s.currentIndex];
	if (!card) return;

	// Record in PocketBase and get next interval
	const schedule = await recordReview(card.id, rating, $s.algorithm);
	const result: SessionResult = {
		flashcardId: card.id,
		rating,
		nextInterval: schedule.interval
	};

	session.update((s) => {
		const sessionResults = [...s.sessionResults, result];
		const nextIndex = s.currentIndex + 1;
		const isComplete = nextIndex >= s.cards.length;
		return {
			...s,
			sessionResults,
			currentIndex: isComplete ? s.currentIndex : nextIndex,
			flipped: false,
			isComplete
		};
	});
}

export function endSession(): void {
	session.update((s) => ({ ...s, isComplete: true }));
}

export function resetSession(): void {
	session.set(empty);
}
