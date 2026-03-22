import { pb } from '$lib/shared/pocketbase';
import { ClientResponseError } from 'pocketbase';
import type { Bookmark, BookmarkFolder, CreateBookmarkData, GroupedBookmarks, BookmarkContentType } from './bookmarkTypes';

function toFolder(r: Record<string, unknown>): BookmarkFolder {
	return {
		id: r.id as string,
		user: r.user as string,
		name: r.name as string,
		order: r.order as number,
		created: r.created as string
	};
}

function toBookmark(r: Record<string, unknown>): Bookmark {
	let meta: Record<string, string> = {};
	try {
		const raw = r.contentMeta;
		if (raw && typeof raw === 'object') meta = raw as Record<string, string>;
		else if (typeof raw === 'string' && raw) meta = JSON.parse(raw);
	} catch { /* ignore */ }
	return {
		id: r.id as string,
		user: r.user as string,
		folder: (r.folder as string) || null,
		contentType: r.contentType as BookmarkContentType,
		contentId: r.contentId as string,
		contentTitle: r.contentTitle as string,
		contentSubtitle: (r.contentSubtitle as string) ?? '',
		contentMeta: meta,
		order: r.order as number,
		created: r.created as string
	};
}

// ── Folders ───────────────────────────────────────────────────────────────────

export async function listFolders(): Promise<BookmarkFolder[]> {
	try {
		const records = await pb.collection('bookmark_folders').getFullList({
			requestKey: null,
			filter: `user = "${pb.authStore.record?.id}"`,
			sort: 'order,name'
		});
		return records.map(toFolder);
	} catch (e) {
		if (e instanceof ClientResponseError) throw new Error(e.message);
		throw e;
	}
}

export async function createFolder(name: string): Promise<BookmarkFolder> {
	try {
		const existing = await pb.collection('bookmark_folders').getFullList({
			requestKey: null,
			filter: `user = "${pb.authStore.record?.id}"`,
			fields: 'order',
			sort: '-order'
		});
		const maxOrder = existing.length > 0 ? (existing[0].order as number) + 1 : 1;
		const r = await pb.collection('bookmark_folders').create({
			user: pb.authStore.record?.id,
			name,
			order: maxOrder
		});
		return toFolder(r);
	} catch (e) {
		if (e instanceof ClientResponseError) throw new Error(e.message);
		throw e;
	}
}

export async function updateFolder(id: string, name: string): Promise<void> {
	try {
		await pb.collection('bookmark_folders').update(id, { name });
	} catch (e) {
		if (e instanceof ClientResponseError) throw new Error(e.message);
		throw e;
	}
}

export async function deleteFolder(id: string): Promise<void> {
	try {
		// Delete all bookmarks in the folder
		const bookmarks = await pb.collection('bookmarks').getFullList({
			requestKey: null,
			filter: `folder = "${id}"`
		});
		await Promise.all(bookmarks.map((b) => pb.collection('bookmarks').delete(b.id as string)));
		await pb.collection('bookmark_folders').delete(id);
	} catch (e) {
		if (e instanceof ClientResponseError) throw new Error(e.message);
		throw e;
	}
}

export async function reorderFolders(folders: BookmarkFolder[]): Promise<void> {
	try {
		await Promise.all(
			folders.map((f, i) => pb.collection('bookmark_folders').update(f.id, { order: i + 1 }))
		);
	} catch (e) {
		if (e instanceof ClientResponseError) throw new Error(e.message);
		throw e;
	}
}

// ── Bookmarks ─────────────────────────────────────────────────────────────────

export async function listBookmarks(folderId?: string | null): Promise<Bookmark[]> {
	try {
		const uid = pb.authStore.record?.id ?? '';
		let filter = `user = "${uid}"`;
		if (folderId === null) filter += ` && folder = ""`;
		else if (folderId) filter += ` && folder = "${folderId}"`;
		const records = await pb.collection('bookmarks').getFullList({
			requestKey: null,
			filter,
			sort: 'order,created'
		});
		return records.map(toBookmark);
	} catch (e) {
		if (e instanceof ClientResponseError) throw new Error(e.message);
		throw e;
	}
}

export async function listAllBookmarks(): Promise<GroupedBookmarks[]> {
	try {
		const [folders, allBM] = await Promise.all([listFolders(), listBookmarks()]);
		const result: GroupedBookmarks[] = [
			{ folder: null, bookmarks: allBM.filter((b) => !b.folder) },
			...folders.map((f) => ({ folder: f, bookmarks: allBM.filter((b) => b.folder === f.id) }))
		];
		return result;
	} catch (e) {
		if (e instanceof ClientResponseError) throw new Error(e.message);
		throw e;
	}
}

export async function createBookmark(data: CreateBookmarkData): Promise<Bookmark> {
	try {
		const uid = pb.authStore.record?.id ?? '';
		const existing = await pb.collection('bookmarks').getFullList({
			requestKey: null,
			filter: `user = "${uid}"`,
			fields: 'order',
			sort: '-order'
		});
		const maxOrder = existing.length > 0 ? (existing[0].order as number) + 1 : 1;
		const r = await pb.collection('bookmarks').create({
			user: uid,
			folder: data.folderId || '',
			contentType: data.contentType,
			contentId: data.contentId,
			contentTitle: data.contentTitle,
			contentSubtitle: data.contentSubtitle ?? '',
			contentMeta: data.contentMeta ?? {},
			order: maxOrder
		});
		return toBookmark(r);
	} catch (e) {
		if (e instanceof ClientResponseError) throw new Error(e.message);
		throw e;
	}
}

export async function deleteBookmark(id: string): Promise<void> {
	try {
		await pb.collection('bookmarks').delete(id);
	} catch (e) {
		if (e instanceof ClientResponseError) throw new Error(e.message);
		throw e;
	}
}

export async function moveBookmark(id: string, folderId: string | null): Promise<void> {
	try {
		await pb.collection('bookmarks').update(id, { folder: folderId || '' });
	} catch (e) {
		if (e instanceof ClientResponseError) throw new Error(e.message);
		throw e;
	}
}

export async function reorderBookmarks(bookmarks: Bookmark[]): Promise<void> {
	try {
		await Promise.all(
			bookmarks.map((b, i) => pb.collection('bookmarks').update(b.id, { order: i + 1 }))
		);
	} catch (e) {
		if (e instanceof ClientResponseError) throw new Error(e.message);
		throw e;
	}
}

export async function isBookmarked(
	contentType: BookmarkContentType,
	contentId: string
): Promise<string | null> {
	try {
		const uid = pb.authStore.record?.id ?? '';
		const records = await pb.collection('bookmarks').getFullList({
			requestKey: null,
			filter: `user = "${uid}" && contentType = "${contentType}" && contentId = "${contentId}"`
		});
		return records.length > 0 ? (records[0].id as string) : null;
	} catch (e) {
		if (e instanceof ClientResponseError) throw new Error(e.message);
		throw e;
	}
}
