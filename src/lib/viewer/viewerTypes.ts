import type { Flashcard } from '$lib/creator/flashcardTypes';

export interface StudySession {
	cards: Flashcard[];
	currentIndex: number;
	flipped: boolean;
	completed: boolean;
}

export interface ReadingProgress {
	textbookId: string;
	chapterId: string;
}

export type Rating = 'correct' | 'partial' | 'incorrect';

export interface CardResult {
	cardId: string;
	rating: Rating;
}

export interface QuizSession {
	cards: Flashcard[];
	currentIndex: number;
	flipped: boolean;
	results: CardResult[];
}