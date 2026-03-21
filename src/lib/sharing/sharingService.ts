import { pb } from '$lib/shared/pocketbase';
import { ClientResponseError } from 'pocketbase';
import type { SharedTextbook, SharedCategory, Install } from './sharingTypes';

// ── Share management ──────────────────────────────────────────────────────────

export async function shareTextbook(id: string, title: string, description: string): Promise<void> {
	try {
		await pb.collection('textbooks').update(id, {
			isShared: true,
			shareTitle: title,
			shareDescription: description
		});
	} catch (e) {
		if (e instanceof ClientResponseError) throw new Error(e.message);
		throw e;
	}
}

export async function unshareTextbook(id: string): Promise<void> {
	try {
		await pb.collection('textbooks').update(id, { isShared: false });
	} catch (e) {
		if (e instanceof ClientResponseError) throw new Error(e.message);
		throw e;
	}
}

export async function shareCategory(id: string, title: string, description: string): Promise<void> {
	try {
		await pb.collection('flashcard_categories').update(id, {
			isShared: true,
			shareTitle: title,
			shareDescription: description
		});
	} catch (e) {
		if (e instanceof ClientResponseError) throw new Error(e.message);
		throw e;
	}
}

export async function unshareCategory(id: string): Promise<void> {
	try {
		await pb.collection('flashcard_categories').update(id, { isShared: false });
	} catch (e) {
		if (e instanceof ClientResponseError) throw new Error(e.message);
		throw e;
	}
}

// ── Discovery ─────────────────────────────────────────────────────────────────

export async function getSharedTextbooks(query: string): Promise<SharedTextbook[]> {
	try {
		// Rule in PocketBase must be: @request.auth.id = owner || isShared = true
		// To verify: Admin UI → Collections → textbooks → API Rules → List rule
		const filter = query.trim()
			? `isShared = true && shareTitle ~ "${query}"`
			: 'isShared = true';
		const records = await pb.collection('textbooks').getFullList({
			requestKey: null,
			filter,
			expand: 'owner',
			sort: '-created'
		});
		return records.map((r) => ({
			id: r.id as string,
			title: r.title as string,
			description: (r.description as string) ?? '',
			shareTitle: (r.shareTitle as string) ?? '',
			shareDescription: (r.shareDescription as string) ?? '',
			owner: r.owner as string,
			ownerName: (r.expand?.owner as Record<string, unknown>)?.name as string ?? '',
			created: r.created as string
		}));
	} catch (e) {
		if (e instanceof ClientResponseError) throw new Error(e.message);
		throw e;
	}
}

export async function getSharedCategories(query: string): Promise<SharedCategory[]> {
	try {
		const filter = query.trim()
			? `isShared = true && shareTitle ~ "${query}"`
			: 'isShared = true';
		const records = await pb.collection('flashcard_categories').getFullList({
			requestKey: null,
			filter,
			expand: 'owner',
			sort: '-created'
		});
		return records.map((r) => ({
			id: r.id as string,
			name: r.name as string,
			shareTitle: (r.shareTitle as string) ?? '',
			shareDescription: (r.shareDescription as string) ?? '',
			owner: r.owner as string,
			ownerName: (r.expand?.owner as Record<string, unknown>)?.name as string ?? '',
			created: r.created as string
		}));
	} catch (e) {
		if (e instanceof ClientResponseError) throw new Error(e.message);
		throw e;
	}
}

// ── Installs ──────────────────────────────────────────────────────────────────

export async function installContent(
	contentType: 'textbook' | 'flashcard_category',
	contentId: string
): Promise<Install> {
	try {
		const r = await pb.collection('installs').create({
			user: pb.authStore.record?.id,
			contentType,
			contentId
		});
		return {
			id: r.id as string,
			user: r.user as string,
			contentType: r.contentType as 'textbook' | 'flashcard_category',
			contentId: r.contentId as string,
			installedAt: r.created as string
		};
	} catch (e) {
		if (e instanceof ClientResponseError) throw new Error(e.message);
		throw e;
	}
}

export async function uninstallContent(installId: string): Promise<void> {
	try {
		await pb.collection('installs').delete(installId);
	} catch (e) {
		if (e instanceof ClientResponseError) throw new Error(e.message);
		throw e;
	}
}

export async function getMyInstalls(): Promise<Install[]> {
	try {
		const records = await pb.collection('installs').getFullList({
			requestKey: null,
			filter: `user = "${pb.authStore.record?.id}"`,
			sort: '-created'
		});
		return records.map((r) => ({
			id: r.id as string,
			user: r.user as string,
			contentType: r.contentType as 'textbook' | 'flashcard_category',
			contentId: r.contentId as string,
			installedAt: r.created as string
		}));
	} catch (e) {
		if (e instanceof ClientResponseError) throw new Error(e.message);
		throw e;
	}
}

export async function isInstalled(contentId: string): Promise<string | null> {
	try {
		const records = await pb.collection('installs').getFullList({
			requestKey: null,
			filter: `user = "${pb.authStore.record?.id}" && contentId = "${contentId}"`
		});
		return records.length > 0 ? (records[0].id as string) : null;
	} catch (e) {
		if (e instanceof ClientResponseError) throw new Error(e.message);
		throw e;
	}
}

// ── Owner sharing state ───────────────────────────────────────────────────────

export interface OwnerSharingState {
	id: string;
	isShared: boolean;
	shareTitle: string;
	shareDescription: string;
}

export async function getTextbookSharingStates(): Promise<OwnerSharingState[]> {
	try {
		const records = await pb.collection('textbooks').getFullList({
			requestKey: null,
			filter: `owner = "${pb.authStore.record?.id}"`
		});
		return records.map((r) => ({
			id: r.id as string,
			isShared: (r.isShared as boolean) ?? false,
			shareTitle: (r.shareTitle as string) ?? '',
			shareDescription: (r.shareDescription as string) ?? ''
		}));
	} catch (e) {
		if (e instanceof ClientResponseError) throw new Error(e.message);
		throw e;
	}
}

export async function getCategorySharingStates(): Promise<OwnerSharingState[]> {
	try {
		const records = await pb.collection('flashcard_categories').getFullList({
			requestKey: null,
			filter: `owner = "${pb.authStore.record?.id}"`
		});
		return records.map((r) => ({
			id: r.id as string,
			isShared: (r.isShared as boolean) ?? false,
			shareTitle: (r.shareTitle as string) ?? '',
			shareDescription: (r.shareDescription as string) ?? ''
		}));
	} catch (e) {
		if (e instanceof ClientResponseError) throw new Error(e.message);
		throw e;
	}
}
