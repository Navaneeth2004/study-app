import { pb } from '$lib/shared/pocketbase';
import { ClientResponseError } from 'pocketbase';
import type { Flashcard, FlashcardCategory, FlashcardForm } from './flashcardTypes';
import { deleteBookmarksForContent } from '$lib/bookmarks/bookmarkService';

function toFlashcard(r: Record<string, unknown>): Flashcard {
	return {
		id: r.id as string, owner: r.owner as string,
		frontText: r.front_text as string,
		frontImageUrl: r.front_image ? pb.files.getURL(r as Parameters<typeof pb.files.getURL>[0], r.front_image as string) : '',
		frontAudioUrl: r.front_audio ? pb.files.getURL(r as Parameters<typeof pb.files.getURL>[0], r.front_audio as string) : '',
		backText: r.back_text as string,
		backImageUrl: r.back_image ? pb.files.getURL(r as Parameters<typeof pb.files.getURL>[0], r.back_image as string) : '',
		backAudioUrl: r.back_audio ? pb.files.getURL(r as Parameters<typeof pb.files.getURL>[0], r.back_audio as string) : '',
		chapter: (r.chapter as string) ?? '', category: (r.category as string) ?? '',
		order: r.order as number, created: r.created as string, updated: r.updated as string
	};
}

function toCategory(r: Record<string, unknown>): FlashcardCategory {
	return { id: r.id as string, name: r.name as string, description: (r.description as string) ?? '', owner: r.owner as string, created: r.created as string, updated: r.updated as string };
}

export async function listByChapter(chapterId: string): Promise<Flashcard[]> {
	try {
		const records = await pb.collection('flashcards').getFullList({ filter: `chapter = "${chapterId}"`, sort: 'order', requestKey: null });
		return records.map(toFlashcard);
	} catch (e) { if (e instanceof ClientResponseError) throw new Error(e.message); throw e; }
}

export async function listByCategory(categoryId: string): Promise<Flashcard[]> {
	try {
		const records = await pb.collection('flashcards').getFullList({ filter: `category = "${categoryId}"`, sort: 'order', requestKey: null });
		return records.map(toFlashcard);
	} catch (e) { if (e instanceof ClientResponseError) throw new Error(e.message); throw e; }
}

export async function createFlashcard(data: FlashcardForm): Promise<Flashcard> {
	try {
		const formData = new FormData();
		formData.append('owner', pb.authStore.record?.id ?? '');
		formData.append('front_text', data.frontText);
		formData.append('back_text', data.backText);
		formData.append('order', String(data.order ?? 1));
		if (data.chapter) formData.append('chapter', data.chapter);
		if (data.category) formData.append('category', data.category);
		if (data.frontImageFile) formData.append('front_image', data.frontImageFile);
		if (data.backImageFile) formData.append('back_image', data.backImageFile);
		if (data.frontAudioFile) formData.append('front_audio', data.frontAudioFile);
		if (data.backAudioFile) formData.append('back_audio', data.backAudioFile);
		const r = await pb.collection('flashcards').create(formData, { requestKey: null });
		return toFlashcard(r);
	} catch (e) { if (e instanceof ClientResponseError) throw new Error(e.message); throw e; }
}

export async function updateFlashcard(id: string, data: FlashcardForm): Promise<Flashcard> {
	try {
		const formData = new FormData();
		formData.append('front_text', data.frontText);
		formData.append('back_text', data.backText);
		if (data.frontImageFile) formData.append('front_image', data.frontImageFile);
		if (data.backImageFile) formData.append('back_image', data.backImageFile);
		if (data.frontAudioFile) formData.append('front_audio', data.frontAudioFile);
		if (data.backAudioFile) formData.append('back_audio', data.backAudioFile);
		const r = await pb.collection('flashcards').update(id, formData);
		return toFlashcard(r);
	} catch (e) { if (e instanceof ClientResponseError) throw new Error(e.message); throw e; }
}

export async function deleteFlashcard(id: string): Promise<void> {
	try {
		await pb.collection('flashcards').delete(id);
		deleteBookmarksForContent(id); // fire-and-forget
	} catch (e) { if (e instanceof ClientResponseError) throw new Error(e.message); throw e; }
}

export async function reorderFlashcards(flashcards: Flashcard[]): Promise<void> {
	try { await Promise.all(flashcards.map((card, index) => pb.collection('flashcards').update(card.id, { order: index + 1 }))); }
	catch (e) { if (e instanceof ClientResponseError) throw new Error(e.message); throw e; }
}

export async function listCategories(): Promise<FlashcardCategory[]> {
	try {
		const records = await pb.collection('flashcard_categories').getFullList({ filter: `owner = "${pb.authStore.record?.id}"`, sort: 'name', requestKey: null });
		return records.map(toCategory);
	} catch (e) { if (e instanceof ClientResponseError) throw new Error(e.message); throw e; }
}

export async function createCategory(name: string, description?: string): Promise<FlashcardCategory> {
	try {
		const r = await pb.collection('flashcard_categories').create({ name, description: description ?? '', owner: pb.authStore.record?.id });
		return toCategory(r);
	} catch (e) { if (e instanceof ClientResponseError) throw new Error(e.message); throw e; }
}

export async function updateCategory(id: string, name: string, description?: string): Promise<void> {
	try { await pb.collection('flashcard_categories').update(id, { name, description: description ?? '' }); }
	catch (e) { if (e instanceof ClientResponseError) throw new Error(e.message); throw e; }
}

export async function deleteCategory(id: string): Promise<void> {
	try {
		await pb.collection('flashcard_categories').delete(id);
		deleteBookmarksForContent(id); // fire-and-forget
	} catch (e) { if (e instanceof ClientResponseError) throw new Error(e.message); throw e; }
}

export async function getCategory(id: string): Promise<FlashcardCategory> {
	try {
		const r = await pb.collection('flashcard_categories').getOne(id, { requestKey: null });
		return toCategory(r);
	} catch (e) { if (e instanceof ClientResponseError) throw new Error(e.message); throw e; }
}
