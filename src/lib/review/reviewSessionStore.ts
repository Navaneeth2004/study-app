import { writable, derived, get } from 'svelte/store';
import type { Flashcard } from '$lib/creator/flashcardTypes';
import type { SessionResult } from './reviewTypes';
import { recordReview } from './reviewService';

export type SessionMode = 'review' | 'practice';

export interface SessionState {
	cards: Flashcard[];           // original card list
	queue: Flashcard[];           // remaining queue (practice re-adds wrong cards)
	currentIndex: number;         // index into queue
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
	if ($s.mode === 'practice') {
		// Progress based on original cards that are "done" (answered correct at least once)
		const doneIds = new Set($s.sessionResults.filter((r) => r.rating === 'correct').map((r) => r.flashcardId));
		return $s.cards.length > 0 ? (doneIds.size / $s.cards.length) * 100 : 0;
	}
	return $s.cards.length > 0 ? ($s.currentIndex / $s.cards.length) * 100 : 0;
});

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
	// Unique cards mastered (answered correct at least once)
	const masteredIds = new Set($s.sessionResults.filter((r) => r.rating === 'correct').map((r) => r.flashcardId));
	return { correct, partial, incorrect, total: $s.sessionResults.length, avgInterval, retention, masteredCount: masteredIds.size, totalCards: $s.cards.length };
});

export function startSession(cards: Flashcard[], mode: SessionMode = 'review'): void {
	session.set({
		cards: [...cards],
		queue: [...cards],
		currentIndex: 0,
		flipped: false,
		sessionResults: [],
		isComplete: false,
		mode
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

	if ($s.mode === 'review') {
		// Full SR scheduling — record in PocketBase
		const schedule = await recordReview(card.id, rating, 'sm2');
		nextInterval = schedule.interval;
	}
	// In practice mode: only record correct cards in PocketBase (so they get scheduled)
	// Wrong/partial cards just re-queue — no PocketBase write for those
	if ($s.mode === 'practice' && rating === 'correct') {
		const schedule = await recordReview(card.id, rating, 'sm2');
		nextInterval = schedule.interval;
	}

	const result: SessionResult = {
		flashcardId: card.id,
		rating,
		nextInterval
	};

	session.update((s) => {
		const sessionResults = [...s.sessionResults, result];

		if (s.mode === 'practice') {
			// Remove card from queue at currentIndex
			let newQueue = [...s.queue];
			newQueue.splice(s.currentIndex, 1);

			// If wrong or partial — push back to end of queue
			if (rating !== 'correct') {
				newQueue.push(card);
			}

			const isComplete = newQueue.length === 0;
			const nextIndex = isComplete ? 0 : Math.min(s.currentIndex, newQueue.length - 1);
			return { ...s, queue: newQueue, sessionResults, currentIndex: nextIndex, flipped: false, isComplete };
		} else {
			// Normal review — linear progression
			const nextIndex = s.currentIndex + 1;
			const isComplete = nextIndex >= s.queue.length;
			return { ...s, sessionResults, currentIndex: isComplete ? s.currentIndex : nextIndex, flipped: false, isComplete };
		}
	});
}

export function endSession(): void {
	session.update((s) => ({ ...s, isComplete: true }));
}

export function resetSession(): void {
	session.set(empty);
}
