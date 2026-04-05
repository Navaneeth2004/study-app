import { pb } from '$lib/shared/pocketbase';
import { ClientResponseError } from 'pocketbase';
import type { Chapter, ChapterFormData } from './creatorTypes';
import { deleteBookmarksForContent } from '$lib/bookmarks/bookmarkService';

export async function listChapters(textbookId: string): Promise<Chapter[]> {
	try {
		const records = await pb.collection('chapters').getFullList({ filter: `textbook = "${textbookId}"`, sort: 'order' });
		return records.map((r) => ({ id: r.id, title: r.title, order: r.order, textbook: r.textbook, owner: r.owner, created: r.created, updated: r.updated }));
	} catch (e) { if (e instanceof ClientResponseError) throw new Error(e.message); throw e; }
}

export async function createChapter(textbookId: string, data: ChapterFormData, order: number): Promise<Chapter> {
	try {
		const r = await pb.collection('chapters').create({ title: data.title, order, textbook: textbookId, owner: pb.authStore.record?.id });
		return { id: r.id, title: r.title, order: r.order, textbook: r.textbook, owner: r.owner, created: r.created, updated: r.updated };
	} catch (e) { if (e instanceof ClientResponseError) throw new Error(e.message); throw e; }
}

export async function updateChapter(id: string, data: Partial<ChapterFormData>): Promise<void> {
	try { await pb.collection('chapters').update(id, data); }
	catch (e) { if (e instanceof ClientResponseError) throw new Error(e.message); throw e; }
}

export async function deleteChapter(id: string): Promise<void> {
	try {
		await pb.collection('chapters').delete(id);
		deleteBookmarksForContent(id); // fire-and-forget
	} catch (e) { if (e instanceof ClientResponseError) throw new Error(e.message); throw e; }
}

export async function reorderChapters(chapters: Chapter[]): Promise<void> {
	try { await Promise.all(chapters.map((chapter, index) => pb.collection('chapters').update(chapter.id, { order: index + 1 }))); }
	catch (e) { if (e instanceof ClientResponseError) throw new Error(e.message); throw e; }
}

export async function getChapter(id: string): Promise<Chapter> {
	try {
		const r = await pb.collection('chapters').getOne(id);
		return { id: r.id, title: r.title, order: r.order, textbook: r.textbook, owner: r.owner, created: r.created, updated: r.updated };
	} catch (e) { if (e instanceof ClientResponseError) throw new Error(e.message); throw e; }
}
