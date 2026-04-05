import { pb } from '$lib/shared/pocketbase';
import { ClientResponseError } from 'pocketbase';

export type InAppNotificationType =
	| 'new_follower_milestone'
	| 'install_milestone'
	| 'comment_on_content'
	| 'reply_to_comment'
	| 'new_shared_content'
	| 'comment_like_milestone'
	| 'comment_upvote_milestone';

export interface InAppNotification {
	id: string;
	user: string;
	type: InAppNotificationType;
	title: string;
	body: string;
	relatedContentType: string;
	relatedContentId: string;
	relatedUserId: string;
	relatedUserName: string;
	isRead: boolean;
	created: string;
}

export const FOLLOWER_MILESTONES = [1, 10, 100, 1000, 10000];
export const INSTALL_MILESTONES = [1, 10, 100, 1000, 10000];
export const LIKE_MILESTONES = [1, 10, 100, 1000];
export const UPVOTE_MILESTONES = [1, 10, 100, 1000];

function toNotification(r: Record<string, unknown>): InAppNotification {
	return {
		id: r.id as string,
		user: r.user as string,
		type: r.type as InAppNotificationType,
		title: r.title as string,
		body: (r.body as string) ?? '',
		relatedContentType: (r.relatedContentType as string) ?? '',
		relatedContentId: (r.relatedContentId as string) ?? '',
		relatedUserId: (r.relatedUserId as string) ?? '',
		relatedUserName: (r.relatedUserName as string) ?? '',
		isRead: (r.isRead as boolean) ?? false,
		created: r.created as string
	};
}

export async function getNotifications(): Promise<InAppNotification[]> {
	const uid = pb.authStore.record?.id;
	if (!uid) return [];
	try {
		const records = await pb.collection('in_app_notifications').getFullList({
			requestKey: null, filter: `user = "${uid}"`, sort: '-created'
		});
		return records.map(toNotification);
	} catch { return []; }
}

export async function getUnreadCount(): Promise<number> {
	const uid = pb.authStore.record?.id;
	if (!uid) return 0;
	try {
		const result = await pb.collection('in_app_notifications').getList(1, 1, {
			requestKey: null, filter: `user = "${uid}" && isRead = false`, fields: 'id'
		});
		return result.totalItems;
	} catch { return 0; }
}

export async function markAsRead(id: string): Promise<void> {
	try { await pb.collection('in_app_notifications').update(id, { isRead: true }, { requestKey: null }); }
	catch { /* silent */ }
}

export async function markAllAsRead(): Promise<void> {
	const uid = pb.authStore.record?.id;
	if (!uid) return;
	try {
		const unread = await pb.collection('in_app_notifications').getFullList({
			requestKey: null, filter: `user = "${uid}" && isRead = false`, fields: 'id'
		});
		await Promise.all(unread.map((r) =>
			pb.collection('in_app_notifications').update(r.id as string, { isRead: true }, { requestKey: null })
		));
	} catch { /* silent */ }
}

export async function deleteNotification(id: string): Promise<void> {
	try { await pb.collection('in_app_notifications').delete(id, { requestKey: null }); }
	catch { /* silent */ }
}

/** Check if a milestone notification of this type + milestone count was already sent */
async function milestoneAlreadySent(
	userId: string,
	type: InAppNotificationType,
	milestoneCount: number
): Promise<boolean> {
	try {
		const countStr = milestoneCount.toLocaleString();
		const records = await pb.collection('in_app_notifications').getList(1, 1, {
			requestKey: null,
			filter: `user = "${userId}" && type = "${type}"`,
			fields: 'id,title'
		});
		// Check if any existing notification title contains this milestone number
		return records.items.some((r) =>
			(r.title as string).includes(countStr)
		);
	} catch { return false; }
}

async function createNotification(data: {
	user: string; type: InAppNotificationType; title: string; body?: string;
	relatedContentType?: string; relatedContentId?: string;
	relatedUserId?: string; relatedUserName?: string;
}): Promise<void> {
	try {
		await pb.collection('in_app_notifications').create({
			user: data.user, type: data.type, title: data.title,
			body: data.body ?? '', relatedContentType: data.relatedContentType ?? '',
			relatedContentId: data.relatedContentId ?? '',
			relatedUserId: data.relatedUserId ?? '', relatedUserName: data.relatedUserName ?? '',
			isRead: false
		}, { requestKey: null });
	} catch { /* fire-and-forget */ }
}

// ── Trigger functions (fire-and-forget) ──────────────────────────────────────

export function triggerFollowMilestone(userId: string, followerCount: number): void {
	if (!FOLLOWER_MILESTONES.includes(followerCount)) return;
	milestoneAlreadySent(userId, 'new_follower_milestone', followerCount).then((sent) => {
		if (sent) return;
		createNotification({
			user: userId, type: 'new_follower_milestone',
			title: `🎉 You reached ${followerCount.toLocaleString()} follower${followerCount > 1 ? 's' : ''}!`,
			body: 'Your content is growing in popularity.'
		});
	});
}

export function triggerInstallMilestone(userId: string, installCount: number, contentTitle: string): void {
	if (!INSTALL_MILESTONES.includes(installCount)) return;
	milestoneAlreadySent(userId, 'install_milestone', installCount).then((sent) => {
		if (sent) return;
		createNotification({
			user: userId, type: 'install_milestone',
			title: `📥 "${contentTitle}" reached ${installCount.toLocaleString()} install${installCount > 1 ? 's' : ''}!`,
			body: 'People love your content.'
		});
	});
}

export function triggerCommentNotification(
	contentOwnerId: string, commenterName: string,
	contentTitle: string, contentType: string, contentId: string
): void {
	createNotification({
		user: contentOwnerId, type: 'comment_on_content',
		title: `💬 ${commenterName} commented on "${contentTitle}"`,
		relatedContentType: contentType, relatedContentId: contentId,
		relatedUserName: commenterName
	});
}

export function triggerReplyNotification(
	commentOwnerId: string, replierName: string, contentTitle: string
): void {
	createNotification({
		user: commentOwnerId, type: 'reply_to_comment',
		title: `↩️ ${replierName} replied to your comment on "${contentTitle}"`,
		relatedUserName: replierName
	});
}

export function triggerNewContentNotification(
	followerId: string, creatorName: string,
	contentTitle: string, contentType: string, contentId: string
): void {
	createNotification({
		user: followerId, type: 'new_shared_content',
		title: `📚 ${creatorName} published "${contentTitle}"`,
		body: 'New content from someone you follow.',
		relatedContentType: contentType, relatedContentId: contentId,
		relatedUserName: creatorName
	});
}

export function triggerCommentLikeMilestone(
	commentOwnerId: string, likeCount: number, contentTitle: string
): void {
	if (!LIKE_MILESTONES.includes(likeCount)) return;
	milestoneAlreadySent(commentOwnerId, 'comment_like_milestone', likeCount).then((sent) => {
		if (sent) return;
		createNotification({
			user: commentOwnerId, type: 'comment_like_milestone',
			title: `❤️ Your comment on "${contentTitle}" reached ${likeCount} like${likeCount > 1 ? 's' : ''}!`,
		});
	});
}

export function triggerCommentUpvoteMilestone(
	commentOwnerId: string, upvoteCount: number, contentTitle: string,
	contentType: string, contentId: string
): void {
	if (!UPVOTE_MILESTONES.includes(upvoteCount)) return;
	milestoneAlreadySent(commentOwnerId, 'comment_upvote_milestone', upvoteCount).then((sent) => {
		if (sent) return;
		createNotification({
			user: commentOwnerId, type: 'comment_upvote_milestone',
			title: `👍 Your comment on "${contentTitle}" reached ${upvoteCount} upvote${upvoteCount > 1 ? 's' : ''}!`,
			relatedContentType: contentType,
			relatedContentId: contentId
		});
	});
}
