import { pb } from '$lib/shared/pocketbase';
import { ClientResponseError } from 'pocketbase';
import { getExcerpt, blockToText } from './searchUtils';
import type { SearchResultItem, SearchResults } from './searchTypes';

const MAX = 20;

function empty(): SearchResults {
	return { textbooks: [], chapters: [], blocks: [], categories: [], flashcards: [] };
}

/** Convert an array of IDs to PocketBase OR filter chain: (id = "a" || id = "b") */
function idsToOrFilter(field: string, ids: string[]): string {
	if (ids.length === 0) return 'id = ""'; // always-false sentinel
	return '(' + ids.map((id) => `${field} = "${id}"`).join(' || ') + ')';
}

// ── Textbooks ─────────────────────────────────────────────────────────────────

async function searchTextbooks(filter: string, query: string): Promise<SearchResultItem[]> {
	try {
		const records = await pb.collection('textbooks').getFullList({
			requestKey: null, filter, sort: 'title', fields: 'id,title,description'
		});
		return records.slice(0, MAX).map((r) => ({
			type: 'textbook' as const,
			id: r.id as string,
			title: r.title as string,
			subtitle: (r.description as string) || undefined,
			excerpt: getExcerpt((r.title as string) + ' ' + ((r.description as string) ?? ''), query),
			navigationPath: `/viewer/textbooks/${r.id}`
		}));
	} catch { return []; }
}

// ── Chapters ──────────────────────────────────────────────────────────────────

async function searchChapters(textbookIds: string[], query: string): Promise<SearchResultItem[]> {
	if (textbookIds.length === 0) return [];
	const q = query.replace(/"/g, '\\"');
	const filter = `${idsToOrFilter('textbook', textbookIds)} && title ~ "${q}"`;
	try {
		const records = await pb.collection('chapters').getFullList({
			requestKey: null, filter, sort: 'title', fields: 'id,title,textbook'
		});
		// Fetch textbook names for subtitles
		const tbMap = new Map<string, string>();
		try {
			const tbs = await pb.collection('textbooks').getFullList({
				requestKey: null,
				filter: idsToOrFilter('id', textbookIds),
				fields: 'id,title'
			});
			tbs.forEach((t) => tbMap.set(t.id as string, t.title as string));
		} catch { /* ignore */ }
		return records.slice(0, MAX).map((r) => ({
			type: 'chapter' as const,
			id: r.id as string,
			title: r.title as string,
			subtitle: tbMap.get(r.textbook as string),
			excerpt: getExcerpt(r.title as string, query),
			navigationPath: `/viewer/textbooks/${r.textbook}/chapters/${r.id}`
		}));
	} catch { return []; }
}

// ── Block content ─────────────────────────────────────────────────────────────

async function searchBlocks(textbookIds: string[], query: string): Promise<SearchResultItem[]> {
	if (textbookIds.length === 0) return [];
	try {
		const chapters = await pb.collection('chapters').getFullList({
			requestKey: null,
			filter: idsToOrFilter('textbook', textbookIds),
			fields: 'id,title,textbook'
		});
		if (chapters.length === 0) return [];
		const chapterIds = chapters.map((c) => c.id as string);
		const chMap = new Map(chapters.map((c) => [c.id as string, c]));
		const q = query.replace(/"/g, '\\"');
		const filter = `${idsToOrFilter('chapter', chapterIds)} && data ~ "${q}"`;
		const records = await pb.collection('chapter_blocks').getFullList({
			requestKey: null, filter, fields: 'id,chapter,type,data'
		});
		return records.slice(0, MAX).flatMap((r) => {
			const text = blockToText(r.type as string, r.data as Record<string, unknown>);
			if (!text.toLowerCase().includes(query.toLowerCase())) return [];
			const ch = chMap.get(r.chapter as string);
			if (!ch) return [];
			return [{
				type: 'block' as const,
				id: r.id as string,
				title: text.slice(0, 60) || `${r.type} block`,
				subtitle: ch.title as string,
				excerpt: getExcerpt(text, query),
				navigationPath: `/viewer/textbooks/${ch.textbook}/chapters/${ch.id}`
			}];
		});
	} catch { return []; }
}

// ── Categories ────────────────────────────────────────────────────────────────

async function searchCategories(filter: string, query: string): Promise<SearchResultItem[]> {
	try {
		const records = await pb.collection('flashcard_categories').getFullList({
			requestKey: null, filter, fields: 'id,name,description'
		});
		return records.slice(0, MAX).map((r) => ({
			type: 'category' as const,
			id: r.id as string,
			title: r.name as string,
			subtitle: (r.description as string) || undefined,
			excerpt: getExcerpt(r.name as string, query),
			navigationPath: `/viewer/flashcards/category/${r.id}`
		}));
	} catch { return []; }
}

// ── Flashcards ────────────────────────────────────────────────────────────────

async function searchFlashcards(categoryIds: string[], query: string): Promise<SearchResultItem[]> {
	if (categoryIds.length === 0) return [];
	const q = query.replace(/"/g, '\\"');
	const filter = `${idsToOrFilter('category', categoryIds)} && (front_text ~ "${q}" || back_text ~ "${q}")`;
	try {
		const records = await pb.collection('flashcards').getFullList({
			requestKey: null, filter, fields: 'id,front_text,back_text,category'
		});
		const catMap = new Map<string, string>();
		try {
			const cats = await pb.collection('flashcard_categories').getFullList({
				requestKey: null,
				filter: idsToOrFilter('id', categoryIds),
				fields: 'id,name'
			});
			cats.forEach((c) => catMap.set(c.id as string, c.name as string));
		} catch { /* ignore */ }
		return records.slice(0, MAX).map((r) => {
			const front = r.front_text as string;
			const back = r.back_text as string;
			return {
				type: 'flashcard' as const,
				id: r.id as string,
				title: front.slice(0, 80),
				subtitle: catMap.get(r.category as string),
				excerpt: getExcerpt(`${front} ${back}`, query),
				navigationPath: `/viewer/flashcards/category/${r.category}`
			};
		});
	} catch { return []; }
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function searchOwn(query: string): Promise<SearchResults> {
	if (!query.trim()) return empty();
	const uid = pb.authStore.record?.id ?? '';
	const q = query.trim().replace(/"/g, '\\"');
	try {
		const [ownTbs, ownCats] = await Promise.all([
			pb.collection('textbooks').getFullList({ requestKey: null, filter: `owner = "${uid}"`, fields: 'id' }),
			pb.collection('flashcard_categories').getFullList({ requestKey: null, filter: `owner = "${uid}"`, fields: 'id' })
		]);
		const tbIds = ownTbs.map((r) => r.id as string);
		const catIds = ownCats.map((r) => r.id as string);
		const ownTbFilter = tbIds.length > 0
			? `${idsToOrFilter('id', tbIds)} && (title ~ "${q}" || description ~ "${q}")`
			: `owner = "${uid}" && (title ~ "${q}" || description ~ "${q}")`;
		const ownCatFilter = catIds.length > 0
			? `${idsToOrFilter('id', catIds)} && (name ~ "${q}" || description ~ "${q}")`
			: `owner = "${uid}" && (name ~ "${q}" || description ~ "${q}")`;
		const [textbooks, chapters, blocks, categories, flashcards] = await Promise.all([
			searchTextbooks(ownTbFilter, query),
			searchChapters(tbIds, query),
			searchBlocks(tbIds, query),
			searchCategories(ownCatFilter, query),
			searchFlashcards(catIds, query)
		]);
		return { textbooks, chapters, blocks, categories, flashcards };
	} catch (e) {
		if (e instanceof ClientResponseError) throw new Error(e.message);
		throw e;
	}
}

export async function searchShared(query: string): Promise<SearchResults> {
	if (!query.trim()) return empty();
	const q = query.trim().replace(/"/g, '\\"');
	const sharedTbFilter = `isShared = true && (shareTitle ~ "${q}" || shareDescription ~ "${q}" || title ~ "${q}")`;
	const sharedCatFilter = `isShared = true && (shareTitle ~ "${q}" || shareDescription ~ "${q}" || name ~ "${q}")`;
	const [textbooks, categories] = await Promise.all([
		searchTextbooks(sharedTbFilter, query),
		searchCategories(sharedCatFilter, query)
	]);
	return { ...empty(), textbooks, categories };
}

export async function searchEverything(query: string): Promise<SearchResults> {
	if (!query.trim()) return empty();
	const uid = pb.authStore.record?.id ?? '';
	const q = query.trim().replace(/"/g, '\\"');
	try {
		const [ownTbs, ownCats, installs, catInstalls] = await Promise.all([
			pb.collection('textbooks').getFullList({ requestKey: null, filter: `owner = "${uid}"`, fields: 'id' }),
			pb.collection('flashcard_categories').getFullList({ requestKey: null, filter: `owner = "${uid}"`, fields: 'id' }),
			pb.collection('installs').getFullList({ requestKey: null, filter: `user = "${uid}" && contentType = "textbook"`, fields: 'contentId' }),
			pb.collection('installs').getFullList({ requestKey: null, filter: `user = "${uid}" && contentType = "flashcard_category"`, fields: 'contentId' })
		]);
		const allTbIds = [...new Set([...ownTbs.map((r) => r.id as string), ...installs.map((r) => r.contentId as string)])];
		const allCatIds = [...new Set([...ownCats.map((r) => r.id as string), ...catInstalls.map((r) => r.contentId as string)])];
		const tbFilter = allTbIds.length > 0
			? `${idsToOrFilter('id', allTbIds)} && (title ~ "${q}" || description ~ "${q}")`
			: `owner = "${uid}" && (title ~ "${q}" || description ~ "${q}")`;
		const catFilter = allCatIds.length > 0
			? `${idsToOrFilter('id', allCatIds)} && (name ~ "${q}" || description ~ "${q}")`
			: `owner = "${uid}" && (name ~ "${q}" || description ~ "${q}")`;
		const [textbooks, chapters, blocks, categories, flashcards] = await Promise.all([
			searchTextbooks(tbFilter, query),
			searchChapters(allTbIds, query),
			searchBlocks(allTbIds, query),
			searchCategories(catFilter, query),
			searchFlashcards(allCatIds, query)
		]);
		return { textbooks, chapters, blocks, categories, flashcards };
	} catch (e) {
		if (e instanceof ClientResponseError) throw new Error(e.message);
		throw e;
	}
}
