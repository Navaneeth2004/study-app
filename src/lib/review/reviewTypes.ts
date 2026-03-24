export type ReviewAlgorithm = 'sm2' | 'simple' | 'leitner';

export interface CardReview {
	id: string;
	user: string;
	flashcard: string;
	rating: 'correct' | 'partial' | 'incorrect';
	algorithm: ReviewAlgorithm;
	reviewedAt: string;
}

export interface CardSchedule {
	id: string;
	user: string;
	flashcard: string;
	algorithm: ReviewAlgorithm;
	nextReviewAt: string;
	interval: number;
	easeFactor: number;
	leitnerBox: number;
	repetitions: number;
	lastRating: string;
}

export interface ReviewSettings {
	id: string;
	user: string;
	defaultAlgorithm: ReviewAlgorithm;
	dailyNewCardLimit: number;
	dailyReviewLimit: number;
}

export interface ReviewStats {
	dueToday: number;
	reviewedToday: number;
	newCardsToday: number;
	streak: number;
	totalReviewed: number;
	masteredCards: number;
	averageEase?: number;
	retentionRate: number;
}

export interface ChapterDeckSummary {
	chapterId: string;
	chapterTitle: string;
	dueCount: number;
	newCount: number;
	totalCards: number;
}

export interface TextbookDeckSummary {
	textbookId: string;
	textbookTitle: string;
	chapters: ChapterDeckSummary[];
}

export interface SoloDeckSummary {
	categoryId: string;
	categoryName: string;
	dueCount: number;
	newCount: number;
	totalCards: number;
}

export interface DeckReviewSummary {
	textbooks: TextbookDeckSummary[];
	soloDecks: SoloDeckSummary[];
}

export interface SessionResult {
	flashcardId: string;
	rating: 'correct' | 'partial' | 'incorrect';
	nextInterval: number;
}
