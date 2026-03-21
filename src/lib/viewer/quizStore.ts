import { writable, derived, get } from 'svelte/store';
import type { Flashcard } from '$lib/creator/flashcardTypes';
import type { QuizSession, CardResult, Rating } from './viewerTypes';

const empty: QuizSession = { cards: [], currentIndex: 0, flipped: false, results: [] };

const session = writable<QuizSession>(empty);

export const quizSession = { subscribe: session.subscribe };

export const currentCard = derived(session, ($s) => $s.cards[$s.currentIndex] ?? null);

export const isComplete = derived(session, ($s) => $s.results.length === $s.cards.length && $s.cards.length > 0);

export const progress = derived(session, ($s) =>
	$s.cards.length > 0 ? ($s.currentIndex / $s.cards.length) * 100 : 0
);

export const summary = derived(session, ($s) => {
	const correct = $s.results.filter((r) => r.rating === 'correct').length;
	const partial = $s.results.filter((r) => r.rating === 'partial').length;
	const incorrect = $s.results.filter((r) => r.rating === 'incorrect').length;
	return { correct, partial, incorrect, total: $s.results.length };
});

export function startQuiz(cards: Flashcard[]): void {
	session.set({ cards, currentIndex: 0, flipped: false, results: [] });
}

export function flipCurrent(): void {
	session.update((s) => ({ ...s, flipped: !s.flipped }));
}

export function rateCard(rating: Rating): void {
	session.update((s) => {
		const result: CardResult = { cardId: s.cards[s.currentIndex].id, rating };
		const results = [...s.results, result];
		const nextIndex = s.currentIndex + 1;
		return {
			...s,
			results,
			currentIndex: nextIndex < s.cards.length ? nextIndex : s.currentIndex,
			flipped: false
		};
	});
}

export function restartWithFailed(): void {
	session.update((s) => {
		const failedIds = new Set(
			s.results.filter((r) => r.rating !== 'correct').map((r) => r.cardId)
		);
		const cards = s.cards.filter((c) => failedIds.has(c.id));
		return { cards, currentIndex: 0, flipped: false, results: [] };
	});
}

export function resetQuiz(): void {
	session.set(empty);
}