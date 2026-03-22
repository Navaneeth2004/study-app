import { pb } from '$lib/shared/pocketbase';
import { ClientResponseError } from 'pocketbase';
import type { RatingSummary } from './socialTypes';

export async function getRatingsForContent(
	contentType: string,
	contentId: string,
	contentOwnerId = ''
): Promise<RatingSummary> {
	try {
		const uid = pb.authStore.record?.id ?? '';
		// No user filter — fetch ALL ratings for this content
		// PocketBase rule must be: List → true (anyone can read ratings)
		const records = await pb.collection('content_ratings').getFullList({
			requestKey: null,
			filter: `contentType = "${contentType}" && contentId = "${contentId}"`
		});
		const count = records.length;
		const average = count > 0
			? Math.round((records.reduce((sum, r) => sum + (r.rating as number), 0) / count) * 10) / 10
			: 0;
		const userRecord = uid ? records.find((r) => (r.user as string) === uid) : undefined;
		const isOwner = !!contentOwnerId && contentOwnerId === uid;
		return {
			average,
			count,
			userRating: userRecord ? (userRecord.rating as number) : null,
			isOwner
		};
	} catch (e) {
		if (e instanceof ClientResponseError) throw new Error(e.message);
		throw e;
	}
}

export async function rateContent(
	contentType: string,
	contentId: string,
	rating: number
): Promise<void> {
	try {
		const uid = pb.authStore.record?.id ?? '';
		if (!uid) throw new Error('Not authenticated');
		const existing = await pb.collection('content_ratings').getFullList({
			requestKey: null,
			filter: `user = "${uid}" && contentType = "${contentType}" && contentId = "${contentId}"`
		});
		if (existing.length > 0) {
			await pb.collection('content_ratings').update(existing[0].id as string, { rating });
		} else {
			await pb.collection('content_ratings').create({ user: uid, contentType, contentId, rating });
		}
	} catch (e) {
		if (e instanceof ClientResponseError) throw new Error(e.message);
		throw e;
	}
}

export async function removeRating(contentType: string, contentId: string): Promise<void> {
	try {
		const uid = pb.authStore.record?.id ?? '';
		const existing = await pb.collection('content_ratings').getFullList({
			requestKey: null,
			filter: `user = "${uid}" && contentType = "${contentType}" && contentId = "${contentId}"`
		});
		await Promise.all(existing.map((r) => pb.collection('content_ratings').delete(r.id as string)));
	} catch (e) {
		if (e instanceof ClientResponseError) throw new Error(e.message);
		throw e;
	}
}
