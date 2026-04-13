import { writable, derived } from 'svelte/store';
import type { Flashcard } from '$lib/creator/flashcardTypes';
import type { CardResult, Rating } from './viewerTypes';

export type QuizMode = 'front-to-back' | 'back-to-front' | 'mixed';

interface QuizState {
	cards: Flashcard[];
	currentIndex: number;
	flipped: boolean;
	results: CardResult[];
	mode: QuizMode;
}

const empty: QuizState = { cards: [], currentIndex: 0, flipped: false, results: [], mode: 'front-to-back' };
const session = writable<QuizState>(empty);

export const quizSession = { subscribe: session.subscribe };
export const currentCard = derived(session, ($s) => $s.cards[$s.currentIndex] ?? null);

// Returns card with front/back potentially swapped based on mode
export const displayCard = derived(session, ($s) => {
	const card = $s.cards[$s.currentIndex];
	if (!card) return null;
	const isBackToFront = $s.mode === 'back-to-front' ||
		($s.mode === 'mixed' && $s.currentIndex % 2 !== 0);
	if (isBackToFront) {
		return {
			...card,
			frontText: card.backText,
			frontImageUrl: card.backImageUrl,
			frontAudioUrl: card.backAudioUrl,
			backText: card.frontText,
			backImageUrl: card.frontImageUrl,
			backAudioUrl: card.frontAudioUrl,
		};
	}
	return card;
});

export const isComplete = derived(session, ($s) => $s.results.length === $s.cards.length && $s.cards.length > 0);
export const progress = derived(session, ($s) => $s.cards.length > 0 ? ($s.currentIndex / $s.cards.length) * 100 : 0);
export const summary = derived(session, ($s) => {
	const correct = $s.results.filter((r) => r.rating === 'correct').length;
	const partial = $s.results.filter((r) => r.rating === 'partial').length;
	const incorrect = $s.results.filter((r) => r.rating === 'incorrect').length;
	return { correct, partial, incorrect, total: $s.results.length };
});

function shuffle<T>(arr: T[]): T[] {
	const a = [...arr];
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[a[i], a[j]] = [a[j], a[i]];
	}
	return a;
}

export function startQuiz(cards: Flashcard[], mode: QuizMode = 'front-to-back'): void {
	session.set({ cards: shuffle(cards), currentIndex: 0, flipped: false, results: [], mode });
}

export function rateCard(rating: Rating): void {
	session.update((s) => {
		const results = [...s.results, { cardId: s.cards[s.currentIndex].id, rating }];
		const nextIndex = s.currentIndex + 1;
		return { ...s, results, currentIndex: nextIndex < s.cards.length ? nextIndex : s.currentIndex, flipped: false };
	});
}

export function restartWithFailed(): void {
	session.update((s) => {
		const failedIds = new Set(s.results.filter((r) => r.rating !== 'correct').map((r) => r.cardId));
		return { ...s, cards: shuffle(s.cards.filter((c) => failedIds.has(c.id))), currentIndex: 0, flipped: false, results: [] };
	});
}

export function resetQuiz(): void { session.set(empty); }
