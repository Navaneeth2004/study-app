import { pb } from '$lib/shared/pocketbase';
import { ClientResponseError } from 'pocketbase';
import type { Textbook, TextbookFormData } from './creatorTypes';

export async function listTextbooks(): Promise<Textbook[]> {
	try {
		const records = await pb.collection('textbooks').getFullList({
			filter: `owner = "${pb.authStore.record?.id}"`,
			sort: '-created',
			expand: 'chapters_via_textbook',
			requestKey: null
		});
		return records.map((r) => ({
			id: r.id,
			title: r.title,
			description: r.description ?? '',
			owner: r.owner,
			created: r.created,
			updated: r.updated,
			chaptersCount: (r.expand?.chapters_via_textbook ?? []).length
		}));
	} catch (e) {
		if (e instanceof ClientResponseError) throw new Error(e.message);
		throw e;
	}
}

export async function getTextbook(id: string): Promise<Textbook> {
	try {
		const r = await pb.collection('textbooks').getOne(id);
		return {
			id: r.id,
			title: r.title,
			description: r.description ?? '',
			owner: r.owner,
			created: r.created,
			updated: r.updated
		};
	} catch (e) {
		if (e instanceof ClientResponseError) throw new Error(e.message);
		throw e;
	}
}

export async function createTextbook(data: TextbookFormData): Promise<Textbook> {
	try {
		const r = await pb.collection('textbooks').create({
			title: data.title,
			description: data.description,
			owner: pb.authStore.record?.id
		});
		return {
			id: r.id,
			title: r.title,
			description: r.description ?? '',
			owner: r.owner,
			created: r.created,
			updated: r.updated
		};
	} catch (e) {
		if (e instanceof ClientResponseError) throw new Error(e.message);
		throw e;
	}
}

export async function updateTextbook(id: string, data: Partial<TextbookFormData>): Promise<void> {
	try {
		await pb.collection('textbooks').update(id, data);
	} catch (e) {
		if (e instanceof ClientResponseError) throw new Error(e.message);
		throw e;
	}
}

export async function deleteTextbook(id: string): Promise<void> {
	try {
		await pb.collection('textbooks').delete(id);
	} catch (e) {
		if (e instanceof ClientResponseError) throw new Error(e.message);
		throw e;
	}
}
