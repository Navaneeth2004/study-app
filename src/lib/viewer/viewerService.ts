import { pb } from '$lib/shared/pocketbase';
import { ClientResponseError } from 'pocketbase';
import type { Textbook, Chapter } from '$lib/creator/creatorTypes';
import type { RuntimeBlock } from '$lib/creator/contentTypes';
import type { Flashcard, FlashcardCategory } from '$lib/creator/flashcardTypes';

function toTextbook(r: Record<string, unknown>): Textbook {
	return {
		id: r.id as string,
		title: r.title as string,
		description: (r.description as string) ?? '',
		owner: r.owner as string,
		created: r.created as string,
		updated: r.updated as string
	};
}

function toCategory(r: Record<string, unknown>): FlashcardCategory {
	return {
		id: r.id as string,
		name: r.name as string,
		description: (r.description as string) ?? '',
		owner: r.owner as string,
		created: r.created as string,
		updated: r.updated as string
	};
}

// ── Textbooks ────────────────────────────────────────────────────────────────

export async function listMyTextbooks(): Promise<Textbook[]> {
	try {
		const uid = pb.authStore.record?.id ?? '';
		// Own textbooks
		const own = await pb.collection('textbooks').getFullList({
			requestKey: null,
			filter: `owner = "${uid}"`,
			sort: '-created'
		});
		// Installed textbooks
		const installs = await pb.collection('installs').getFullList({
			requestKey: null,
			filter: `user = "${uid}" && contentType = "textbook"`
		});
		const installedIds = installs.map((i) => i.contentId as string);
		const installedRecords = installedIds.length > 0
			? await Promise.all(
				installedIds.map((id) =>
					pb.collection('textbooks').getOne(id, { requestKey: null, expand: 'owner' }).catch(() => null)
				)
			)
			: [];
		const ownSet = new Set(own.map((r) => r.id as string));
		const merged = [
			...own.map(toTextbook),
			...installedRecords
				.filter((r): r is NonNullable<typeof r> => r !== null && !ownSet.has(r.id as string))
				.map((r) => ({
					...toTextbook(r),
					ownerName: (r.expand?.owner as Record<string, unknown>)?.name as string ?? ''
				}))
		];
		return merged;
	} catch (e) {
		if (e instanceof ClientResponseError) throw new Error(e.message);
		throw e;
	}
}

export async function getTextbook(id: string): Promise<Textbook> {
	try {
		const r = await pb.collection('textbooks').getOne(id, { requestKey: null });
		return toTextbook(r);
	} catch (e) {
		if (e instanceof ClientResponseError) throw new Error(e.message);
		throw e;
	}
}

// ── Chapters ─────────────────────────────────────────────────────────────────

export async function listChapters(textbookId: string): Promise<Chapter[]> {
	try {
		const records = await pb.collection('chapters').getFullList({ requestKey: null,
			filter: `textbook = "${textbookId}"`,
			sort: 'order'
		});
		return records.map((r) => ({
			id: r.id as string,
			title: r.title as string,
			order: r.order as number,
			textbook: r.textbook as string,
			owner: r.owner as string,
			created: r.created as string,
			updated: r.updated as string
		}));
	} catch (e) {
		if (e instanceof ClientResponseError) throw new Error(e.message);
		throw e;
	}
}

export async function getChapter(id: string): Promise<Chapter> {
	try {
		const r = await pb.collection('chapters').getOne(id, { requestKey: null });
		return {
			id: r.id as string,
			title: r.title as string,
			order: r.order as number,
			textbook: r.textbook as string,
			owner: r.owner as string,
			created: r.created as string,
			updated: r.updated as string
		};
	} catch (e) {
		if (e instanceof ClientResponseError) throw new Error(e.message);
		throw e;
	}
}

// ── Blocks ────────────────────────────────────────────────────────────────────

export async function listBlocks(chapterId: string): Promise<RuntimeBlock[]> {
	try {
		const records = await pb.collection('chapter_blocks').getFullList({ requestKey: null,
			filter: `chapter = "${chapterId}"`,
			sort: 'order'
		});
		return records.map((r) => ({
			id: r.id as string,
			chapter: r.chapter as string,
			owner: r.owner as string,
			type: r.type as RuntimeBlock['type'],
			order: r.order as number,
			data: r.data as Record<string, unknown>
		}));
	} catch (e) {
		if (e instanceof ClientResponseError) throw new Error(e.message);
		throw e;
	}
}

// ── Flashcards ────────────────────────────────────────────────────────────────

function toFlashcard(r: Record<string, unknown>): Flashcard {
	return {
		id: r.id as string,
		owner: r.owner as string,
		frontText: r.front_text as string,
		frontImageUrl: r.front_image
			? pb.files.getURL(r as Parameters<typeof pb.files.getURL>[0], r.front_image as string)
			: '',
		frontAudioUrl: r.front_audio
			? pb.files.getURL(r as Parameters<typeof pb.files.getURL>[0], r.front_audio as string)
			: '',
		backText: r.back_text as string,
		backImageUrl: r.back_image
			? pb.files.getURL(r as Parameters<typeof pb.files.getURL>[0], r.back_image as string)
			: '',
		backAudioUrl: r.back_audio
			? pb.files.getURL(r as Parameters<typeof pb.files.getURL>[0], r.back_audio as string)
			: '',
		chapter: (r.chapter as string) ?? '',
		category: (r.category as string) ?? '',
		order: r.order as number,
		created: r.created as string,
		updated: r.updated as string
	};
}

export async function listFlashcardsByChapter(chapterId: string): Promise<Flashcard[]> {
	try {
		const records = await pb.collection('flashcards').getFullList({ requestKey: null,
			filter: `chapter = "${chapterId}"`,
			sort: 'order'
		});
		return records.map(toFlashcard);
	} catch (e) {
		if (e instanceof ClientResponseError) throw new Error(e.message);
		throw e;
	}
}

export async function listFlashcardsByCategory(categoryId: string): Promise<Flashcard[]> {
	try {
		const records = await pb.collection('flashcards').getFullList({ requestKey: null,
			filter: `category = "${categoryId}"`,
			sort: 'order'
		});
		return records.map(toFlashcard);
	} catch (e) {
		if (e instanceof ClientResponseError) throw new Error(e.message);
		throw e;
	}
}

export async function listMyCategories(): Promise<FlashcardCategory[]> {
	try {
		const uid = pb.authStore.record?.id ?? '';
		const own = await pb.collection('flashcard_categories').getFullList({
			requestKey: null,
			filter: `owner = "${uid}"`,
			sort: 'name'
		});
		const installs = await pb.collection('installs').getFullList({
			requestKey: null,
			filter: `user = "${uid}" && contentType = "flashcard_category"`
		});
		const installedIds = installs.map((i) => i.contentId as string);
		const installedRecords = installedIds.length > 0
			? await Promise.all(
				installedIds.map((id) =>
					pb.collection('flashcard_categories').getOne(id, { requestKey: null, expand: 'owner' }).catch(() => null)
				)
			)
			: [];
		const ownSet = new Set(own.map((r) => r.id as string));
		const merged = [
			...own.map(toCategory),
			...installedRecords
				.filter((r): r is NonNullable<typeof r> => r !== null && !ownSet.has(r.id as string))
				.map((r) => ({
					...toCategory(r),
					ownerName: (r.expand?.owner as Record<string, unknown>)?.name as string ?? ''
				}))
		];
		return merged;
	} catch (e) {
		if (e instanceof ClientResponseError) throw new Error(e.message);
		throw e;
	}
}
