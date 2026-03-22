import { pb } from '$lib/shared/pocketbase';
import { ClientResponseError } from 'pocketbase';
import type { ChapterNote } from './noteTypes';

function toNote(r: Record<string, unknown>): ChapterNote {
	return {
		id: r.id as string,
		user: r.user as string,
		chapter: r.chapter as string,
		content: r.content as string,
		created: r.created as string,
		updated: r.updated as string
	};
}

export async function getNoteForChapter(chapterId: string): Promise<ChapterNote | null> {
	try {
		const uid = pb.authStore.record?.id ?? '';
		const records = await pb.collection('chapter_notes').getFullList({
			requestKey: null,
			filter: `user = "${uid}" && chapter = "${chapterId}"`
		});
		return records.length > 0 ? toNote(records[0]) : null;
	} catch (e) {
		if (e instanceof ClientResponseError) throw new Error(e.message);
		throw e;
	}
}

export async function saveNote(chapterId: string, content: string): Promise<ChapterNote> {
	try {
		const uid = pb.authStore.record?.id ?? '';
		const existing = await pb.collection('chapter_notes').getFullList({
			requestKey: null,
			filter: `user = "${uid}" && chapter = "${chapterId}"`
		});
		let r;
		if (existing.length > 0) {
			r = await pb.collection('chapter_notes').update(existing[0].id as string, { content });
		} else {
			r = await pb.collection('chapter_notes').create({
				user: uid,
				chapter: chapterId,
				content
			});
		}
		return toNote(r);
	} catch (e) {
		if (e instanceof ClientResponseError) throw new Error(e.message);
		throw e;
	}
}

export async function deleteNote(chapterId: string): Promise<void> {
	try {
		const uid = pb.authStore.record?.id ?? '';
		const existing = await pb.collection('chapter_notes').getFullList({
			requestKey: null,
			filter: `user = "${uid}" && chapter = "${chapterId}"`
		});
		await Promise.all(existing.map((r) => pb.collection('chapter_notes').delete(r.id as string)));
	} catch (e) {
		if (e instanceof ClientResponseError) throw new Error(e.message);
		throw e;
	}
}
