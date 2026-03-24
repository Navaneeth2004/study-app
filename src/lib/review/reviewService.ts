import { pb } from '$lib/shared/pocketbase';
import { ClientResponseError } from 'pocketbase';
import type {
	CardReview, CardSchedule, ReviewSettings,
	ReviewAlgorithm, ReviewStats, DeckReviewSummary
} from './reviewTypes';
import { calculateSM2 } from './algorithms/sm2';
import { calculateSimple } from './algorithms/simpleIntervals';
import { calculateLeitner } from './algorithms/leitner';

function todayStr(): string {
	return new Date().toISOString().slice(0, 10);
}

function addDays(days: number): string {
	const d = new Date();
	d.setDate(d.getDate() + days);
	return d.toISOString().slice(0, 10);
}

function toSchedule(r: Record<string, unknown>): CardSchedule {
	return {
		id: r.id as string,
		user: r.user as string,
		flashcard: r.flashcard as string,
		algorithm: (r.algorithm as ReviewAlgorithm) ?? 'sm2',
		nextReviewAt: (r.nextReviewAt as string) ?? todayStr(),
		interval: (r.interval as number) ?? 0,
		easeFactor: (r.easeFactor as number) ?? 2.5,
		leitnerBox: (r.leitnerBox as number) ?? 1,
		repetitions: (r.repetitions as number) ?? 0,
		lastRating: (r.lastRating as string) ?? ''
	};
}

function toSettings(r: Record<string, unknown>): ReviewSettings {
	return {
		id: r.id as string,
		user: r.user as string,
		defaultAlgorithm: (r.defaultAlgorithm as ReviewAlgorithm) ?? 'sm2',
		dailyNewCardLimit: (r.dailyNewCardLimit as number) ?? 20,
		dailyReviewLimit: (r.dailyReviewLimit as number) ?? 100
	};
}

function toReview(r: Record<string, unknown>): CardReview {
	return {
		id: r.id as string,
		user: r.user as string,
		flashcard: r.flashcard as string,
		rating: r.rating as 'correct' | 'partial' | 'incorrect',
		algorithm: (r.algorithm as ReviewAlgorithm) ?? 'sm2',
		reviewedAt: r.reviewedAt as string
	};
}

export async function getReviewSettings(): Promise<ReviewSettings> {
	const uid = pb.authStore.record?.id ?? '';
	try {
		const records = await pb.collection('review_settings').getFullList({
			requestKey: null,
			filter: `user = "${uid}"`
		});
		if (records.length > 0) return toSettings(records[0]);
		// Create default settings
		const r = await pb.collection('review_settings').create({
			user: uid,
			defaultAlgorithm: 'sm2',
			dailyNewCardLimit: 20,
			dailyReviewLimit: 100
		}, { requestKey: null });
		return toSettings(r);
	} catch (e) {
		if (e instanceof ClientResponseError) throw new Error(e.message);
		throw e;
	}
}

export async function updateReviewSettings(
	data: Partial<Pick<ReviewSettings, 'defaultAlgorithm' | 'dailyNewCardLimit' | 'dailyReviewLimit'>>
): Promise<ReviewSettings> {
	try {
		const settings = await getReviewSettings();
		const r = await pb.collection('review_settings').update(settings.id, data, { requestKey: null });
		return toSettings(r);
	} catch (e) {
		if (e instanceof ClientResponseError) throw new Error(e.message);
		throw e;
	}
}

export async function getSchedule(flashcardId: string): Promise<CardSchedule | null> {
	const uid = pb.authStore.record?.id ?? '';
	try {
		const records = await pb.collection('card_schedules').getFullList({
			requestKey: null,
			filter: `user = "${uid}" && flashcard = "${flashcardId}"`
		});
		return records.length > 0 ? toSchedule(records[0]) : null;
	} catch (e) {
		if (e instanceof ClientResponseError) throw new Error(e.message);
		throw e;
	}
}

export async function getDueCards(date?: string): Promise<CardSchedule[]> {
	const uid = pb.authStore.record?.id ?? '';
	const d = date ?? todayStr();
	try {
		const records = await pb.collection('card_schedules').getFullList({
			requestKey: null,
			filter: `user = "${uid}" && nextReviewAt <= "${d}"`
		});
		return records.map(toSchedule);
	} catch (e) {
		if (e instanceof ClientResponseError) throw new Error(e.message);
		throw e;
	}
}

export async function getDueCardsByDeck(
	deckId: string,
	deckType: 'chapter' | 'category',
	date?: string
): Promise<CardSchedule[]> {
	const uid = pb.authStore.record?.id ?? '';
	const d = date ?? todayStr();
	try {
		const field = deckType === 'chapter' ? 'chapter' : 'category';
		const cards = await pb.collection('flashcards').getFullList({
			requestKey: null,
			filter: `${field} = "${deckId}"`,
			fields: 'id'
		});
		if (cards.length === 0) return [];
		const ids = cards.map((c) => c.id as string);
		const filter = `user = "${uid}" && nextReviewAt <= "${d}" && (${ids.map((id) => `flashcard = "${id}"`).join(' || ')})`;
		const records = await pb.collection('card_schedules').getFullList({
			requestKey: null, filter
		});
		return records.map(toSchedule);
	} catch (e) {
		if (e instanceof ClientResponseError) throw new Error(e.message);
		throw e;
	}
}

export async function getDueCardsByTextbook(textbookId: string, date?: string): Promise<CardSchedule[]> {
	const uid = pb.authStore.record?.id ?? '';
	const d = date ?? todayStr();
	try {
		const chapters = await pb.collection('chapters').getFullList({
			requestKey: null,
			filter: `textbook = "${textbookId}"`,
			fields: 'id'
		});
		if (chapters.length === 0) return [];
		const chapterIds = chapters.map((c) => c.id as string);
		const cards = await pb.collection('flashcards').getFullList({
			requestKey: null,
			filter: '(' + chapterIds.map((id) => `chapter = "${id}"`).join(' || ') + ')',
			fields: 'id'
		});
		if (cards.length === 0) return [];
		const cardIds = cards.map((c) => c.id as string);
		const filter = `user = "${uid}" && nextReviewAt <= "${d}" && (${cardIds.map((id) => `flashcard = "${id}"`).join(' || ')})`;
		const records = await pb.collection('card_schedules').getFullList({
			requestKey: null, filter
		});
		return records.map(toSchedule);
	} catch (e) {
		if (e instanceof ClientResponseError) throw new Error(e.message);
		throw e;
	}
}

export async function getNewCards(limit: number): Promise<string[]> {
	const uid = pb.authStore.record?.id ?? '';
	try {
		// Get all flashcard IDs owned by or accessible to user
		const [ownFlashcards, scheduledCards] = await Promise.all([
			pb.collection('flashcards').getFullList({
				requestKey: null,
				filter: `owner = "${uid}"`,
				fields: 'id'
			}),
			pb.collection('card_schedules').getFullList({
				requestKey: null,
				filter: `user = "${uid}"`,
				fields: 'flashcard'
			})
		]);
		const scheduledIds = new Set(scheduledCards.map((s) => s.flashcard as string));
		const newIds = ownFlashcards
			.map((c) => c.id as string)
			.filter((id) => !scheduledIds.has(id))
			.slice(0, limit);
		return newIds;
	} catch (e) {
		if (e instanceof ClientResponseError) throw new Error(e.message);
		throw e;
	}
}

export async function getNewCardsByDeck(
	deckId: string,
	deckType: 'chapter' | 'category',
	limit: number
): Promise<string[]> {
	const uid = pb.authStore.record?.id ?? '';
	try {
		const field = deckType === 'chapter' ? 'chapter' : 'category';
		const [deckCards, scheduledCards] = await Promise.all([
			pb.collection('flashcards').getFullList({
				requestKey: null,
				filter: `${field} = "${deckId}"`,
				fields: 'id'
			}),
			pb.collection('card_schedules').getFullList({
				requestKey: null,
				filter: `user = "${uid}"`,
				fields: 'flashcard'
			})
		]);
		const scheduledIds = new Set(scheduledCards.map((s) => s.flashcard as string));
		return deckCards
			.map((c) => c.id as string)
			.filter((id) => !scheduledIds.has(id))
			.slice(0, limit);
	} catch (e) {
		if (e instanceof ClientResponseError) throw new Error(e.message);
		throw e;
	}
}

export async function recordReview(
	flashcardId: string,
	rating: 'correct' | 'partial' | 'incorrect',
	algorithm: ReviewAlgorithm
): Promise<CardSchedule> {
	const uid = pb.authStore.record?.id ?? '';
	try {
		// Record review
		await pb.collection('card_reviews').create({
			user: uid,
			flashcard: flashcardId,
			rating,
			algorithm,
			reviewedAt: new Date().toISOString()
		}, { requestKey: null });

		// Fetch or create schedule
		const existing = await getSchedule(flashcardId);
		const ef = existing?.easeFactor ?? 2.5;
		const reps = existing?.repetitions ?? 0;
		const iv = existing?.interval ?? 0;
		const box = existing?.leitnerBox ?? 1;

		let nextInterval: number;
		let nextEaseFactor = ef;
		let nextRepetitions = reps;
		let nextBox = box;

		if (algorithm === 'sm2') {
			const result = calculateSM2(rating, ef, reps, iv);
			nextInterval = result.nextInterval;
			nextEaseFactor = result.nextEaseFactor;
			nextRepetitions = result.nextRepetitions;
		} else if (algorithm === 'simple') {
			const result = calculateSimple(rating, iv);
			nextInterval = result.nextInterval;
		} else {
			const result = calculateLeitner(rating, box);
			nextInterval = result.nextInterval;
			nextBox = result.nextBox;
		}

		const nextReviewAt = addDays(nextInterval);
		const scheduleData = {
			user: uid,
			flashcard: flashcardId,
			algorithm,
			nextReviewAt,
			interval: nextInterval,
			easeFactor: nextEaseFactor,
			leitnerBox: nextBox,
			repetitions: nextRepetitions,
			lastRating: rating
		};

		let r;
		if (existing) {
			r = await pb.collection('card_schedules').update(existing.id, scheduleData, { requestKey: null });
		} else {
			r = await pb.collection('card_schedules').create(scheduleData, { requestKey: null });
		}
		return toSchedule(r);
	} catch (e) {
		if (e instanceof ClientResponseError) throw new Error(e.message);
		throw e;
	}
}

export async function getDueCount(): Promise<number> {
	const uid = pb.authStore.record?.id ?? '';
	const d = todayStr();
	try {
		const result = await pb.collection('card_schedules').getList(1, 1, {
			requestKey: null,
			filter: `user = "${uid}" && nextReviewAt <= "${d}"`,
			fields: 'id'
		});
		return result.totalItems;
	} catch { return 0; }
}

export async function getDueCountByDeck(
	deckId: string,
	deckType: 'chapter' | 'category'
): Promise<number> {
	try {
		const due = await getDueCardsByDeck(deckId, deckType);
		return due.length;
	} catch { return 0; }
}

export async function getTodayReviews(): Promise<CardReview[]> {
	const uid = pb.authStore.record?.id ?? '';
	const today = todayStr();
	try {
		const records = await pb.collection('card_reviews').getFullList({
			requestKey: null,
			filter: `user = "${uid}" && reviewedAt >= "${today}T00:00:00.000Z"`
		});
		return records.map(toReview);
	} catch { return []; }
}

export async function getReviewStats(): Promise<ReviewStats> {
	const uid = pb.authStore.record?.id ?? '';
	const today = todayStr();
	try {
		const [allDue, todayReviews, allReviews, allSchedules] = await Promise.all([
			getDueCount(),
			getTodayReviews(),
			pb.collection('card_reviews').getFullList({
				requestKey: null, filter: `user = "${uid}"`, fields: 'rating,reviewedAt,algorithm'
			}),
			pb.collection('card_schedules').getFullList({
				requestKey: null, filter: `user = "${uid}"`, fields: 'interval,easeFactor,leitnerBox'
			})
		]);

		const reviewedToday = todayReviews.length;
		const newCardsToday = todayReviews.filter((r) => {
			// new cards are those reviewed for the first time
			return r.reviewedAt.startsWith(today);
		}).length;

		const masteredCards = allSchedules.filter((s) => (s.interval as number) >= 21).length;

		// Retention rate last 30 days
		const thirtyDaysAgo = new Date();
		thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
		const recentReviews = allReviews.filter((r) =>
			new Date(r.reviewedAt as string) >= thirtyDaysAgo
		);
		const retentionRate = recentReviews.length > 0
			? Math.round(recentReviews.filter((r) => r.rating === 'correct').length / recentReviews.length * 100)
			: 0;

		// Average ease (SM-2 schedules only)
		const sm2Schedules = allSchedules.filter((s) => (s.easeFactor as number) > 0);
		const averageEase = sm2Schedules.length > 0
			? Math.round(sm2Schedules.reduce((sum, s) => sum + (s.easeFactor as number), 0) / sm2Schedules.length * 100) / 100
			: undefined;

		// Streak: consecutive days with at least one review
		const reviewDays = new Set(
			allReviews.map((r) => (r.reviewedAt as string).slice(0, 10))
		);
		let streak = 0;
		const cursor = new Date();
		// If no review today, start from yesterday
		if (!reviewDays.has(today)) cursor.setDate(cursor.getDate() - 1);
		while (reviewDays.has(cursor.toISOString().slice(0, 10))) {
			streak++;
			cursor.setDate(cursor.getDate() - 1);
		}

		return {
			dueToday: allDue,
			reviewedToday,
			newCardsToday,
			streak,
			totalReviewed: allReviews.length,
			masteredCards,
			averageEase,
			retentionRate
		};
	} catch (e) {
		return {
			dueToday: 0, reviewedToday: 0, newCardsToday: 0,
			streak: 0, totalReviewed: 0, masteredCards: 0, retentionRate: 0
		};
	}
}

export async function getAllDecksWithDueCount(): Promise<DeckReviewSummary> {
	const uid = pb.authStore.record?.id ?? '';
	const today = todayStr();

	try {
		const [textbooks, categories, allFlashcards, allSchedules] = await Promise.all([
			pb.collection('textbooks').getFullList({
				requestKey: null, filter: `owner = "${uid}"`, fields: 'id,title', sort: 'title'
			}),
			pb.collection('flashcard_categories').getFullList({
				requestKey: null, filter: `owner = "${uid}"`, fields: 'id,name', sort: 'name'
			}),
			pb.collection('flashcards').getFullList({
				requestKey: null, filter: `owner = "${uid}"`, fields: 'id,chapter,category'
			}),
			pb.collection('card_schedules').getFullList({
				requestKey: null, filter: `user = "${uid}"`, fields: 'flashcard,nextReviewAt'
			})
		]);

		const scheduledMap = new Map<string, string>(); // flashcardId → nextReviewAt
		for (const s of allSchedules) {
			scheduledMap.set(s.flashcard as string, s.nextReviewAt as string);
		}

		// Build textbook summaries
		const textbookResults = await Promise.all(textbooks.map(async (tb) => {
			const chapters = await pb.collection('chapters').getFullList({
				requestKey: null,
				filter: `textbook = "${tb.id}"`,
				fields: 'id,title',
				sort: 'order'
			});
			const chapterResults = chapters.map((ch) => {
				const chCards = allFlashcards.filter((f) => f.chapter === ch.id);
				const dueCount = chCards.filter((f) => {
					const nextReview = scheduledMap.get(f.id as string);
					return nextReview && nextReview <= today;
				}).length;
				const newCount = chCards.filter((f) => !scheduledMap.has(f.id as string)).length;
				return {
					chapterId: ch.id as string,
					chapterTitle: ch.title as string,
					dueCount,
					newCount,
					totalCards: chCards.length
				};
			});
			return {
				textbookId: tb.id as string,
				textbookTitle: tb.title as string,
				chapters: chapterResults
			};
		}));

		// Build solo deck summaries
		const soloDecks = categories.map((cat) => {
			const catCards = allFlashcards.filter((f) => f.category === cat.id);
			const dueCount = catCards.filter((f) => {
				const nextReview = scheduledMap.get(f.id as string);
				return nextReview && nextReview <= today;
			}).length;
			const newCount = catCards.filter((f) => !scheduledMap.has(f.id as string)).length;
			return {
				categoryId: cat.id as string,
				categoryName: cat.name as string,
				dueCount,
				newCount,
				totalCards: catCards.length
			};
		});

		return { textbooks: textbookResults, soloDecks };
	} catch (e) {
		if (e instanceof ClientResponseError) throw new Error(e.message);
		throw e;
	}
}
