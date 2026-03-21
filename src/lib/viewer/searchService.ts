import { pb } from '$lib/shared/pocketbase';
import { ClientResponseError } from 'pocketbase';
import type { Textbook } from '$lib/creator/creatorTypes';
import type { FlashcardCategory } from '$lib/creator/flashcardTypes';

export async function searchMyTextbooks(query: string): Promise<Textbook[]> {
	if (!query.trim()) return [];
	try {
		const records = await pb.collection('textbooks').getFullList({
			requestKey: null,
			filter: `owner = "${pb.authStore.record?.id}" && title ~ "${query}"`,
			sort: 'title'
		});
		return records.map((r) => ({
			id: r.id as string,
			title: r.title as string,
			description: (r.description as string) ?? '',
			owner: r.owner as string,
			created: r.created as string,
			updated: r.updated as string
		}));
	} catch (e) {
		if (e instanceof ClientResponseError) throw new Error(e.message);
		throw e;
	}
}

export async function searchMyCategories(query: string): Promise<FlashcardCategory[]> {
	if (!query.trim()) return [];
	try {
		const records = await pb.collection('flashcard_categories').getFullList({
			requestKey: null,
			filter: `owner = "${pb.authStore.record?.id}" && name ~ "${query}"`,
			sort: 'name'
		});
		return records.map((r) => ({
			id: r.id as string,
			name: r.name as string,
			description: (r.description as string) ?? '',
			owner: r.owner as string,
			created: r.created as string,
			updated: r.updated as string
		}));
	} catch (e) {
		if (e instanceof ClientResponseError) throw new Error(e.message);
		throw e;
	}
}
