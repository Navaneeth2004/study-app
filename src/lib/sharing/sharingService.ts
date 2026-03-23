import { pb } from '$lib/shared/pocketbase';
import { triggerNewContentNotification, triggerInstallMilestone } from '$lib/notifications/inAppNotificationService';
import { getFollowers } from '$lib/profile/profileService';
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
		// Notify followers (fire-and-forget)
		const me = pb.authStore.record;
		if (me) {
			getFollowers(me.id as string).then((followers) => {
				const creatorName = (me.name as string) || (me.email as string) || 'Someone';
				for (const f of followers) {
					triggerNewContentNotification(f.id, creatorName, title, 'textbook', id);
				}
			}).catch(() => {});
		}
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
		const me = pb.authStore.record;
		if (me) {
			getFollowers(me.id as string).then((followers) => {
				const creatorName = (me.name as string) || (me.email as string) || 'Someone';
				for (const f of followers) {
					triggerNewContentNotification(f.id, creatorName, title, 'flashcard_category', id);
				}
			}).catch(() => {});
		}
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
		// Trigger install milestone for content owner (fire-and-forget)
		try {
			const collection = contentType === 'textbook' ? 'textbooks' : 'flashcard_categories';
			const content = await pb.collection(collection).getOne(contentId, { requestKey: null, fields: 'owner,title,name,shareTitle' });
			const ownerId = content.owner as string;
			const title = (content.shareTitle as string) || (content.title as string) || (content.name as string) || '';
			const countRes = await pb.collection('installs').getList(1, 1, {
				requestKey: null, filter: `contentId = "${contentId}"`, fields: 'id'
			});
			triggerInstallMilestone(ownerId, countRes.totalItems, title);
		} catch { /* never block install */ }
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

// ── Install counts ────────────────────────────────────────────────────────────

/** Returns a map of contentId → install count for all owned shared items */
export async function getInstallCounts(
	contentIds: string[]
): Promise<Record<string, number>> {
	if (contentIds.length === 0) return {};
	try {
		const filter = '(' + contentIds.map((id) => `contentId = "${id}"`).join(' || ') + ')';
		const records = await pb.collection('installs').getFullList({
			requestKey: null,
			filter
		});
		const counts: Record<string, number> = {};
		for (const id of contentIds) counts[id] = 0;
		for (const r of records) {
			const id = r.contentId as string;
			if (id in counts) counts[id]++;
		}
		return counts;
	} catch (e) {
		if (e instanceof ClientResponseError) throw new Error(e.message);
		throw e;
	}
}
