import { writable, derived, get } from 'svelte/store';
import type { Flashcard } from '$lib/creator/flashcardTypes';
import type { SessionResult } from './reviewTypes';
import { recordReview } from './reviewService';

// Only one mode now: "review" which works exactly like the old "practice" mode:
// - Wrong/partial cards are pushed back to the end of the queue and repeat
// - ONLY correct answers get scheduled in SM-2 (wrong answers are NOT penalised)
// - Session completes only when every card has been answered correctly at least once
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
	cards: [],
	queue: [],
	currentIndex: 0,
	flipped: false,
	sessionResults: [],
	isComplete: false,
	mode: 'review'
};

const session = writable<SessionState>(empty);

export const reviewSession = { subscribe: session.subscribe };
export const currentCard = derived(session, ($s) => $s.queue[$s.currentIndex] ?? null);

export const reviewProgress = derived(session, ($s) => {
	// Progress = unique cards answered correctly / total cards
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
		cards: [...cards],
		queue: [...cards],
		currentIndex: 0,
		flipped: false,
		sessionResults: [],
		isComplete: false,
		mode: 'review'
	});
}

export function flipCurrent(): void {
	session.update((s) => ({ ...s, flipped: !s.flipped }));
}

export async function rateCard(rating: 'correct' | 'partial' | 'incorrect'): Promise<void> {
	const $s = get(session);
	const card = $s.queue[$s.currentIndex];
	if (!card) return;

	let nextInterval = 1;

	// Only schedule CORRECT answers in SM-2. Wrong/partial are NOT penalised.
	if (rating === 'correct') {
		const schedule = await recordReview(card.id, rating, 'sm2');
		nextInterval = schedule.interval;
	}

	const result: SessionResult = { flashcardId: card.id, rating, nextInterval };

	session.update((s) => {
		const sessionResults = [...s.sessionResults, result];
		let newQueue = [...s.queue];
		newQueue.splice(s.currentIndex, 1);

		if (rating !== 'correct') {
			// Wrong or partial: push card to end of queue so it repeats
			newQueue.push(card);
		}

		const isComplete = newQueue.length === 0;
		const nextIndex = isComplete ? 0 : Math.min(s.currentIndex, newQueue.length - 1);
		return { ...s, queue: newQueue, sessionResults, currentIndex: nextIndex, flipped: false, isComplete };
	});
}

export function endSession(): void {
	session.update((s) => ({ ...s, isComplete: true }));
}

export function resetSession(): void {
	session.set(empty);
}
