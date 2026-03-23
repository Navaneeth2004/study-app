import { pb } from '$lib/shared/pocketbase';
import { ClientResponseError } from 'pocketbase';
import { triggerCommentLikeMilestone } from '$lib/notifications/inAppNotificationService';

export async function getLikeCount(commentId: string): Promise<number> {
	try {
		const result = await pb.collection('comment_likes').getList(1, 1, {
			requestKey: null, filter: `comment = "${commentId}"`, fields: 'id'
		});
		return result.totalItems;
	} catch { return 0; }
}

export async function isLiked(commentId: string): Promise<string | null> {
	const uid = pb.authStore.record?.id;
	if (!uid) return null;
	try {
		const records = await pb.collection('comment_likes').getFullList({
			requestKey: null, filter: `user = "${uid}" && comment = "${commentId}"`
		});
		return records.length > 0 ? (records[0].id as string) : null;
	} catch { return null; }
}

export async function likeComment(
	commentId: string,
	commentOwnerId: string,
	contentTitle: string
): Promise<{ likeId: string; likeCount: number }> {
	const uid = pb.authStore.record?.id;
	if (!uid) throw new Error('Not authenticated.');
	try {
		const r = await pb.collection('comment_likes').create(
			{ user: uid, comment: commentId },
			{ requestKey: null }
		);
		// Get updated count
		const result = await pb.collection('comment_likes').getList(1, 1, {
			requestKey: null, filter: `comment = "${commentId}"`, fields: 'id'
		});
		const count = result.totalItems;
		// Trigger milestone (fire-and-forget)
		if (commentOwnerId && commentOwnerId !== uid) {
			triggerCommentLikeMilestone(commentOwnerId, count, contentTitle);
		}
		return { likeId: r.id as string, likeCount: count };
	} catch (e) {
		if (e instanceof ClientResponseError) throw new Error(e.message);
		throw e;
	}
}

export async function unlikeComment(likeId: string): Promise<void> {
	try {
		await pb.collection('comment_likes').delete(likeId, { requestKey: null });
	} catch (e) {
		if (e instanceof ClientResponseError) throw new Error(e.message);
		throw e;
	}
}
