/**
 * exportImportService.ts
 * Responsibility: all .studyapp export and import logic — ZIP creation,
 * manifest building, media fetching, and PocketBase orchestration.
 * Zero UI logic. All PocketBase CRUD via existing service files.
 */

import { zipSync, unzipSync, strToU8, strFromU8 } from 'fflate';
import { pb } from '$lib/shared/pocketbase';
import { listTextbooks, createTextbook, deleteTextbook } from '$lib/creator/textbookService';
import { listChapters, createChapter, deleteChapter } from '$lib/creator/chapterService';
import { listBlocks, deleteBlock } from '$lib/creator/contentService';
import {
	listCategories, listByCategory, listByChapter,
	createCategory, deleteCategory, createFlashcard, deleteFlashcard
} from '$lib/creator/flashcardService';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ManifestMediaFiles {
	imageFile?: string | null;
	audioFile?: string | null;
}

export interface ManifestFlashcardMedia {
	front_image?: string | null;
	back_image?: string | null;
	front_audio?: string | null;
	back_audio?: string | null;
}

export interface ManifestBlock {
	id: string;
	type: string;
	order: number;
	data: Record<string, unknown>;
	mediaFiles: ManifestMediaFiles;
}

export interface ManifestFlashcard {
	id: string;
	front_text: string;
	back_text: string;
	order: number;
	mediaFiles: ManifestFlashcardMedia;
}

export interface ManifestChapter {
	id: string;
	title: string;
	order: number;
	blocks: ManifestBlock[];
	flashcards: ManifestFlashcard[];
}

export interface ManifestTextbook {
	id: string;
	title: string;
	description: string;
	chapters: ManifestChapter[];
}

export interface ManifestCategory {
	id: string;
	name: string;
	description: string;
	flashcards: ManifestFlashcard[];
}

export interface Manifest {
	version: '1.0';
	exportedAt: string;
	exportedBy: string;
	type: 'full' | 'partial';
	textbooks: ManifestTextbook[];
	flashcard_categories: ManifestCategory[];
}

export interface ImportProgress {
	step: string;
	current: number;
	total: number;
}

export interface ImportSummary {
	textbooksImported: number;
	categoriesImported: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Fetch a file URL and return it as a Uint8Array, or null on failure */
async function fetchFileBytes(url: string): Promise<Uint8Array | null> {
	try {
		const res = await fetch(url);
		if (!res.ok) return null;
		const buf = await res.arrayBuffer();
		return new Uint8Array(buf);
	} catch {
		return null;
	}
}

/** Extract filename from a PocketBase file URL */
function filenameFromUrl(url: string): string {
	return url.split('/').pop()?.split('?')[0] ?? 'file';
}

/** Build a unique media path to avoid collisions: media/{id}_{filename} */
function mediaPath(ownerId: string, url: string): string {
	return `media/${ownerId}_${filenameFromUrl(url)}`;
}

/** Trigger a browser download of the given bytes as the given filename */
function triggerDownload(bytes: Uint8Array, filename: string): void {
	const blob = new Blob([bytes], { type: 'application/octet-stream' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	a.click();
	URL.revokeObjectURL(url);
}

// ── Raw PocketBase record fetchers (bypass typed service mappers) ─────────────

/** Fetch raw block records for a chapter so we can access file fields */
async function fetchRawBlocks(chapterId: string): Promise<Record<string, unknown>[]> {
	const records = await pb.collection('chapter_blocks').getFullList({
		filter: `chapter = "${chapterId}"`,
		sort: 'order',
		requestKey: null
	});
	return records as unknown as Record<string, unknown>[];
}

/** Fetch raw flashcard records for a chapter */
async function fetchRawFlashcardsByChapter(chapterId: string): Promise<Record<string, unknown>[]> {
	const records = await pb.collection('flashcards').getFullList({
		filter: `chapter = "${chapterId}"`,
		sort: 'order',
		requestKey: null
	});
	return records as unknown as Record<string, unknown>[];
}

/** Fetch raw flashcard records for a category */
async function fetchRawFlashcardsByCategory(categoryId: string): Promise<Record<string, unknown>[]> {
	const records = await pb.collection('flashcards').getFullList({
		filter: `category = "${categoryId}"`,
		sort: 'order',
		requestKey: null
	});
	return records as unknown as Record<string, unknown>[];
}

// ── Build helpers ─────────────────────────────────────────────────────────────

/** Build ManifestBlock + collect media files into the zip map */
async function buildBlock(
	raw: Record<string, unknown>,
	zipFiles: Record<string, Uint8Array>
): Promise<ManifestBlock> {
	const id = raw.id as string;
	const mediaFiles: ManifestMediaFiles = {};

	if (raw.imageFile) {
		const url = pb.files.getURL(raw as Parameters<typeof pb.files.getURL>[0], raw.imageFile as string);
		const path = mediaPath(id + '_img', url);
		const bytes = await fetchFileBytes(url);
		if (bytes) {
			zipFiles[path] = bytes;
			mediaFiles.imageFile = path;
		}
	}
	if (raw.audioFile) {
		const url = pb.files.getURL(raw as Parameters<typeof pb.files.getURL>[0], raw.audioFile as string);
		const path = mediaPath(id + '_aud', url);
		const bytes = await fetchFileBytes(url);
		if (bytes) {
			zipFiles[path] = bytes;
			mediaFiles.audioFile = path;
		}
	}

	return {
		id,
		type: raw.type as string,
		order: raw.order as number,
		data: (raw.data as Record<string, unknown>) ?? {},
		mediaFiles
	};
}

/** Build ManifestFlashcard + collect media files */
async function buildFlashcard(
	raw: Record<string, unknown>,
	zipFiles: Record<string, Uint8Array>
): Promise<ManifestFlashcard> {
	const id = raw.id as string;
	const mediaFiles: ManifestFlashcardMedia = {};

	const fileFields: Array<[keyof ManifestFlashcardMedia, string]> = [
		['front_image', 'front_image'],
		['back_image', 'back_image'],
		['front_audio', 'front_audio'],
		['back_audio', 'back_audio']
	];

	for (const [key, field] of fileFields) {
		if (raw[field]) {
			const url = pb.files.getURL(raw as Parameters<typeof pb.files.getURL>[0], raw[field] as string);
			const path = mediaPath(`${id}_${field}`, url);
			const bytes = await fetchFileBytes(url);
			if (bytes) {
				zipFiles[path] = bytes;
				mediaFiles[key] = path;
			}
		}
	}

	return {
		id,
		front_text: (raw.front_text as string) ?? '',
		back_text: (raw.back_text as string) ?? '',
		order: raw.order as number,
		mediaFiles
	};
}

// ── Core export builder ───────────────────────────────────────────────────────

async function buildExport(
	textbookIds: string[],
	categoryIds: string[],
	type: 'full' | 'partial'
): Promise<Uint8Array> {
	const zipFiles: Record<string, Uint8Array> = {};
	const user = pb.authStore.record;

	// Build textbooks
	const textbookManifests: ManifestTextbook[] = [];
	for (const tbId of textbookIds) {
		const tb = await pb.collection('textbooks').getOne(tbId, { requestKey: null });
		const chapters = await listChapters(tbId);
		const chapterManifests: ManifestChapter[] = [];

		for (const ch of chapters) {
			const rawBlocks = await fetchRawBlocks(ch.id);
			const rawCards = await fetchRawFlashcardsByChapter(ch.id);

			const blocks = await Promise.all(rawBlocks.map((b) => buildBlock(b, zipFiles)));
			const flashcards = await Promise.all(rawCards.map((c) => buildFlashcard(c, zipFiles)));

			chapterManifests.push({
				id: ch.id,
				title: ch.title,
				order: ch.order,
				blocks,
				flashcards
			});
		}

		textbookManifests.push({
			id: tbId,
			title: tb.title as string,
			description: (tb.description as string) ?? '',
			chapters: chapterManifests
		});
	}

	// Build categories
	const categoryManifests: ManifestCategory[] = [];
	for (const catId of categoryIds) {
		const cat = await pb.collection('flashcard_categories').getOne(catId, { requestKey: null });
		const rawCards = await fetchRawFlashcardsByCategory(catId);
		const flashcards = await Promise.all(rawCards.map((c) => buildFlashcard(c, zipFiles)));

		categoryManifests.push({
			id: catId,
			name: cat.name as string,
			description: (cat.description as string) ?? '',
			flashcards
		});
	}

	const manifest: Manifest = {
		version: '1.0',
		exportedAt: new Date().toISOString(),
		exportedBy: (user?.name as string) ?? (user?.email as string) ?? 'unknown',
		type,
		textbooks: textbookManifests,
		flashcard_categories: categoryManifests
	};

	zipFiles['manifest.json'] = strToU8(JSON.stringify(manifest, null, 2));

	return zipSync(zipFiles);
}

// ── Public export functions ───────────────────────────────────────────────────

export async function exportAll(filename?: string): Promise<void> {
	const textbooks = await listTextbooks();
	const categories = await listCategories();
	const bytes = await buildExport(
		textbooks.map((t) => t.id),
		categories.map((c) => c.id),
		'full'
	);
	const date = new Date().toISOString().slice(0, 10);
	triggerDownload(bytes, filename ?? `studyapp-export-${date}.studyapp`);
}

export async function exportSelected(
	textbookIds: string[],
	categoryIds: string[],
	filename?: string
): Promise<void> {
	const bytes = await buildExport(textbookIds, categoryIds, 'partial');
	const date = new Date().toISOString().slice(0, 10);
	triggerDownload(bytes, filename ?? `studyapp-export-${date}.studyapp`);
}

/** Read a .studyapp file and return the parsed manifest without importing */
export async function readManifest(file: File): Promise<Manifest> {
	const arrayBuffer = await file.arrayBuffer();
	const zipData = unzipSync(new Uint8Array(arrayBuffer));
	const manifestBytes = zipData['manifest.json'];
	if (!manifestBytes) throw new Error('Invalid .studyapp file: missing manifest.json');
	return JSON.parse(strFromU8(manifestBytes)) as Manifest;
}

// ── Import ────────────────────────────────────────────────────────────────────

export async function importFromFile(
	file: File,
	onProgress: (p: ImportProgress) => void
): Promise<ImportSummary> {
	const uid = pb.authStore.record?.id ?? '';

	// Read ZIP
	const arrayBuffer = await file.arrayBuffer();
	const zipData = unzipSync(new Uint8Array(arrayBuffer));

	const manifestBytes = zipData['manifest.json'];
	if (!manifestBytes) throw new Error('Invalid .studyapp file: missing manifest.json');

	const manifest = JSON.parse(strFromU8(manifestBytes)) as Manifest;

	let textbooksImported = 0;
	let categoriesImported = 0;

	// ── Import textbooks ───────────────────────────────────────────────────────
	const totalTextbooks = manifest.textbooks.length;
	for (let ti = 0; ti < totalTextbooks; ti++) {
		const tbData = manifest.textbooks[ti];
		onProgress({ step: `Importing textbook "${tbData.title}"`, current: ti + 1, total: totalTextbooks });

		// Check for existing textbook with same title and delete it
		const existing = await pb.collection('textbooks').getFullList({
			filter: `owner = "${uid}" && title = "${tbData.title.replace(/"/g, '\\"')}"`,
			requestKey: null
		});
		for (const e of existing) {
			// Delete all chapters (cascade deletes blocks via PocketBase rules, or do it manually)
			const existingChapters = await listChapters(e.id as string);
			for (const ch of existingChapters) {
				const existingBlocks = await pb.collection('chapter_blocks').getFullList({
					filter: `chapter = "${ch.id}"`, requestKey: null
				});
				for (const bl of existingBlocks) await deleteBlock(bl.id as string);
				await deleteChapter(ch.id);
			}
			await deleteTextbook(e.id as string);
		}

		// Create textbook
		const newTb = await createTextbook({ title: tbData.title, description: tbData.description });

		// Create chapters
		for (const chData of tbData.chapters) {
			const newCh = await createChapter(newTb.id, { title: chData.title }, chData.order);

			// Create blocks
			for (const blData of chData.blocks) {
				const blockFormData = new FormData();
				blockFormData.append('chapter', newCh.id);
				blockFormData.append('owner', uid);
				blockFormData.append('type', blData.type);
				blockFormData.append('order', String(blData.order));
				blockFormData.append('data', JSON.stringify(blData.data));

				if (blData.mediaFiles.imageFile) {
					const imgBytes = zipData[blData.mediaFiles.imageFile];
					if (imgBytes) {
						const fname = blData.mediaFiles.imageFile.split('/').pop() ?? 'image.jpg';
						blockFormData.append('imageFile', new File([imgBytes], fname));
					}
				}
				if (blData.mediaFiles.audioFile) {
					const audBytes = zipData[blData.mediaFiles.audioFile];
					if (audBytes) {
						const fname = blData.mediaFiles.audioFile.split('/').pop() ?? 'audio.wav';
						blockFormData.append('audioFile', new File([audBytes], fname));
					}
				}

				await pb.collection('chapter_blocks').create(blockFormData, { requestKey: null });
			}

			// Create chapter flashcards
			for (const cardData of chData.flashcards) {
				await importFlashcard(cardData, uid, zipData, { chapter: newCh.id });
			}
		}

		textbooksImported++;
	}

	// ── Import categories ──────────────────────────────────────────────────────
	const totalCategories = manifest.flashcard_categories.length;
	for (let ci = 0; ci < totalCategories; ci++) {
		const catData = manifest.flashcard_categories[ci];
		onProgress({ step: `Importing deck "${catData.name}"`, current: ci + 1, total: totalCategories });

		// Check for existing category with same name and delete it
		const existing = await pb.collection('flashcard_categories').getFullList({
			filter: `owner = "${uid}" && name = "${catData.name.replace(/"/g, '\\"')}"`,
			requestKey: null
		});
		for (const e of existing) {
			const existingCards = await listByCategory(e.id as string);
			for (const c of existingCards) await deleteFlashcard(c.id);
			await deleteCategory(e.id as string);
		}

		// Create category
		const newCat = await createCategory(catData.name, catData.description);

		// Create flashcards
		for (const cardData of catData.flashcards) {
			await importFlashcard(cardData, uid, zipData, { category: newCat.id });
		}

		categoriesImported++;
	}

	return { textbooksImported, categoriesImported };
}

/** Create a single flashcard from manifest data, uploading any media from zip */
async function importFlashcard(
	cardData: ManifestFlashcard,
	uid: string,
	zipData: Record<string, Uint8Array>,
	relation: { chapter?: string; category?: string }
): Promise<void> {
	const formData = new FormData();
	formData.append('owner', uid);
	formData.append('front_text', cardData.front_text);
	formData.append('back_text', cardData.back_text);
	formData.append('order', String(cardData.order));
	if (relation.chapter) formData.append('chapter', relation.chapter);
	if (relation.category) formData.append('category', relation.category);

	const fileFields: Array<[keyof ManifestFlashcardMedia, string]> = [
		['front_image', 'front_image'],
		['back_image', 'back_image'],
		['front_audio', 'front_audio'],
		['back_audio', 'back_audio']
	];

	for (const [key, field] of fileFields) {
		const path = cardData.mediaFiles[key];
		if (path) {
			const bytes = zipData[path];
			if (bytes) {
				const fname = path.split('/').pop() ?? field;
				formData.append(field, new File([bytes], fname));
			}
		}
	}

	await pb.collection('flashcards').create(formData, { requestKey: null });
}
