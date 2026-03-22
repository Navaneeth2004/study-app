/**
 * forkService.ts
 * Orchestrates forking installed content into user-owned copies.
 * File fetching via pb.files.getURL() only; all CRUD via existing services.
 */

import { pb } from '$lib/shared/pocketbase';
import { createChapter } from '$lib/creator/chapterService';
import { createCategory } from '$lib/creator/flashcardService';
import type { ForkProgress } from './forkTypes';

type ProgressCallback = (p: ForkProgress) => void;

// ── Helpers ───────────────────────────────────────────────────────────────────

async function fetchFileBlob(url: string): Promise<Blob | null> {
	try {
		const res = await fetch(url);
		if (!res.ok) return null;
		return await res.blob();
	} catch {
		return null;
	}
}

function filenameFromUrl(url: string): string {
	return url.split('/').pop()?.split('?')[0] ?? 'file';
}

/** Fetch a user's display name directly — works even if users collection expand is blocked */
async function getUserName(userId: string): Promise<string> {
	try {
		const r = await pb.collection('users').getOne(userId, { requestKey: null });
		return (r.name as string) || (r.email as string) || 'Unknown';
	} catch {
		return 'Unknown';
	}
}

// ── Textbook fork ─────────────────────────────────────────────────────────────

export async function forkTextbook(
	textbookId: string,
	newTitle: string,
	onProgress: ProgressCallback
): Promise<string> {
	const srcTextbook = await pb.collection('textbooks').getOne(textbookId, { requestKey: null });

	// Fetch owner name directly from users collection
	const ownerName = await getUserName(srcTextbook.owner as string);

	const chapters = await pb.collection('chapters').getFullList({
		filter: `textbook = "${textbookId}"`,
		sort: 'order',
		requestKey: null
	});

	const totalSteps = 1 + chapters.length;
	let step = 0;

	onProgress({ step: ++step, total: totalSteps, message: 'Creating textbook…' });

	const newTb = await pb.collection('textbooks').create({
		title: newTitle,
		description: (srcTextbook.description as string) ?? '',
		owner: pb.authStore.record?.id,
		forkedFrom: textbookId,
		forkedFromAuthor: ownerName,
		isShared: false
	}, { requestKey: null });

	for (let ci = 0; ci < chapters.length; ci++) {
		const ch = chapters[ci];
		onProgress({
			step: ++step,
			total: totalSteps,
			message: `Copying chapter ${ci + 1} of ${chapters.length}…`
		});

		const newCh = await createChapter(newTb.id, { title: ch.title as string }, ch.order as number);

		// Copy blocks
		const rawBlocks = await pb.collection('chapter_blocks').getFullList({
			filter: `chapter = "${ch.id}"`,
			sort: 'order',
			requestKey: null
		});

		for (const bl of rawBlocks) {
			const fd = new FormData();
			fd.append('chapter', newCh.id);
			fd.append('owner', pb.authStore.record?.id ?? '');
			fd.append('type', bl.type as string);
			fd.append('order', String(bl.order));
			fd.append('data', JSON.stringify(bl.data ?? {}));

			if (bl.imageFile) {
				const blob = await fetchFileBlob(pb.files.getURL(bl, bl.imageFile as string));
				if (blob) fd.append('imageFile', new File([blob], filenameFromUrl(bl.imageFile as string)));
			}
			if (bl.audioFile) {
				const blob = await fetchFileBlob(pb.files.getURL(bl, bl.audioFile as string));
				if (blob) fd.append('audioFile', new File([blob], filenameFromUrl(bl.audioFile as string)));
			}

			await pb.collection('chapter_blocks').create(fd, { requestKey: null });
		}

		// Copy chapter flashcards
		const chCards = await pb.collection('flashcards').getFullList({
			filter: `chapter = "${ch.id}"`,
			sort: 'order',
			requestKey: null
		});
		for (const card of chCards) {
			await forkFlashcardRecord(card, { chapter: newCh.id });
		}
	}

	onProgress({ step: totalSteps, total: totalSteps, message: 'Done!' });
	return newTb.id as string;
}

// ── Category fork ─────────────────────────────────────────────────────────────

export async function forkCategory(
	categoryId: string,
	newTitle: string,
	onProgress: ProgressCallback
): Promise<string> {
	const srcCat = await pb.collection('flashcard_categories').getOne(categoryId, { requestKey: null });
	const ownerName = await getUserName(srcCat.owner as string);

	const cards = await pb.collection('flashcards').getFullList({
		filter: `category = "${categoryId}"`,
		sort: 'order',
		requestKey: null
	});

	const total = 1 + cards.length;
	let step = 0;

	onProgress({ step: ++step, total, message: 'Creating deck…' });

	const newCat = await pb.collection('flashcard_categories').create({
		name: newTitle,
		description: (srcCat.description as string) ?? '',
		owner: pb.authStore.record?.id,
		forkedFrom: categoryId,
		forkedFromAuthor: ownerName,
		isShared: false
	}, { requestKey: null });

	for (let i = 0; i < cards.length; i++) {
		onProgress({ step: ++step, total, message: `Copying card ${i + 1} of ${cards.length}…` });
		await forkFlashcardRecord(cards[i], { category: newCat.id as string });
	}

	onProgress({ step: total, total, message: 'Done!' });
	return newCat.id as string;
}

// ── Shared flashcard copier ───────────────────────────────────────────────────

async function forkFlashcardRecord(
	card: Record<string, unknown>,
	relation: { chapter?: string; category?: string }
): Promise<void> {
	const fd = new FormData();
	fd.append('owner', pb.authStore.record?.id ?? '');
	fd.append('front_text', (card.front_text as string) ?? '');
	fd.append('back_text', (card.back_text as string) ?? '');
	fd.append('order', String(card.order ?? 1));
	if (relation.chapter) fd.append('chapter', relation.chapter);
	if (relation.category) fd.append('category', relation.category);

	for (const field of ['front_image', 'back_image', 'front_audio', 'back_audio']) {
		if (card[field]) {
			const blob = await fetchFileBlob(
				pb.files.getURL(card as Parameters<typeof pb.files.getURL>[0], card[field] as string)
			);
			if (blob) fd.append(field, new File([blob], filenameFromUrl(card[field] as string)));
		}
	}

	await pb.collection('flashcards').create(fd, { requestKey: null });
}
