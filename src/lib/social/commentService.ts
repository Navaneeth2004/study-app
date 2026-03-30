import { pb } from '$lib/shared/pocketbase';
import { triggerCommentNotification, triggerReplyNotification, triggerUpvoteMilestone } from '$lib/notifications/inAppNotificationService';
import { ClientResponseError } from 'pocketbase';
import type { Comment, CommentVote } from './socialTypes';

function toComment(r: Record<string, unknown>): Comment {
	return {
		id: r.id as string,
		user: r.user as string,
		contentType: r.contentType as string,
		contentId: r.contentId as string,
		parentComment: (r.parentId as string) || null,
		text: r.text as string,
		isDeleted: (r.isDeleted as boolean) ?? false,
		isPinned: (r.isPinned as boolean) ?? false,
		created: r.created as string,
		updated: r.updated as string,
		upvotes: 0,
		downvotes: 0,
		userVote: null,
		expand: r.expand as Comment['expand'],
		replies: []
	};
}

async function loadVotes(comments: Comment[]): Promise<Comment[]> {
	const uid = pb.authStore.record?.id ?? '';
	const allIds = [
		...comments.map((c) => c.id),
		...comments.flatMap((c) => (c.replies ?? []).map((r) => r.id))
	];
	if (allIds.length === 0) return comments;

	let votes: CommentVote[] = [];
	try {
		const idFilter = '(' + allIds.map((id) => `comment = "${id}"`).join(' || ') + ')';
		const records = await pb.collection('comment_votes').getFullList({
			requestKey: null, filter: idFilter
		});
		votes = records.map((r) => ({
			id: r.id as string,
			user: r.user as string,
			comment: r.comment as string,
			vote: r.vote as 1 | -1
		}));
	} catch { /* votes collection may not exist yet */ }

	function applyVotes(c: Comment): Comment {
		const cv = votes.filter((v) => v.comment === c.id);
		const upvotes = cv.filter((v) => v.vote === 1).length;
		const downvotes = cv.filter((v) => v.vote === -1).length;
		const userVoteRecord = uid ? cv.find((v) => v.user === uid) : undefined;
		return {
			...c,
			upvotes,
			downvotes,
			userVote: userVoteRecord ? userVoteRecord.vote : null,
			replies: (c.replies ?? []).map(applyVotes)
		};
	}
	return comments.map(applyVotes);
}

export async function getComments(
	contentType: string,
	contentId: string,
	page = 1,
	perPage = 10
): Promise<{ comments: Comment[]; totalPages: number }> {
	try {
		const result = await pb.collection('content_comments').getList(page, perPage, {
			requestKey: null,
			filter: `contentType = "${contentType}" && contentId = "${contentId}" && (parentId = "" || parentId = null)`,
			sort: '-created',
			expand: 'user'
		});
		const topLevel = result.items.map(toComment);

		for (const comment of topLevel) {
			const replies = await pb.collection('content_comments').getFullList({
				requestKey: null,
				filter: `parentId = "${comment.id}"`,
				sort: 'created',
				expand: 'user'
			});
			comment.replies = replies.map(toComment);
		}

		const withVotes = await loadVotes(topLevel);
		// Pinned comments float to top, then sort by net votes
		withVotes.sort((a, b) => {
			if (a.isPinned && !b.isPinned) return -1;
			if (!a.isPinned && b.isPinned) return 1;
			return (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes);
		});

		return { comments: withVotes, totalPages: result.totalPages };
	} catch (e) {
		if (e instanceof ClientResponseError) throw new Error(e.message);
		throw e;
	}
}

export async function createComment(
	contentType: string,
	contentId: string,
	text: string,
	parentId?: string
): Promise<Comment> {
	try {
		const r = await pb.collection('content_comments').create({
			user: pb.authStore.record?.id,
			contentType,
			contentId,
			text,
			parentId: parentId || '',
			isDeleted: false,
			isPinned: false
		}, { expand: 'user', requestKey: null });
		const comment = toComment(r);
		// Trigger notification (fire-and-forget)
		try {
			const commenterName = r.expand?.user?.name || r.expand?.user?.email || 'Someone';
			const collection = contentType === 'textbook' ? 'textbooks' : 'flashcard_categories';
			const content = await pb.collection(collection).getOne(contentId, { requestKey: null, fields: 'owner,title,name,shareTitle' });
			const ownerId = content.owner as string;
			const title = (content.shareTitle as string) || (content.title as string) || (content.name as string) || '';
			if (ownerId && ownerId !== pb.authStore.record?.id) {
				if (parentId) {
					const parent = await pb.collection('content_comments').getOne(parentId, { requestKey: null, fields: 'user' });
					if ((parent.user as string) !== pb.authStore.record?.id) {
						triggerReplyNotification(parent.user as string, commenterName, title);
					}
				} else {
					triggerCommentNotification(ownerId, commenterName, title, contentType, contentId);
				}
			}
		} catch { /* notification errors never block */ }
		return comment;
	} catch (e) {
		if (e instanceof ClientResponseError) throw new Error(e.message);
		throw e;
	}
}

export async function updateComment(id: string, text: string): Promise<void> {
	try {
		await pb.collection('content_comments').update(id, { text });
	} catch (e) {
		if (e instanceof ClientResponseError) throw new Error(e.message);
		throw e;
	}
}

export async function softDeleteComment(id: string): Promise<void> {
	try {
		await pb.collection('content_comments').update(id, { isDeleted: true });
	} catch (e) {
		if (e instanceof ClientResponseError) throw new Error(e.message);
		throw e;
	}
}

export async function pinComment(id: string, pinned: boolean): Promise<void> {
	try {
		await pb.collection('content_comments').update(id, { isPinned: pinned });
	} catch (e) {
		if (e instanceof ClientResponseError) throw new Error(e.message);
		throw e;
	}
}

export async function voteComment(commentId: string, vote: 1 | -1): Promise<void> {
	try {
		const uid = pb.authStore.record?.id ?? '';
		const existing = await pb.collection('comment_votes').getFullList({
			requestKey: null, filter: `user = "${uid}" && comment = "${commentId}"`
		});
		if (existing.length > 0) {
			if ((existing[0].vote as number) === vote) {
				await pb.collection('comment_votes').delete(existing[0].id as string);
			} else {
				await pb.collection('comment_votes').update(existing[0].id as string, { vote });
			}
		} else {
			await pb.collection('comment_votes').create({ user: uid, comment: commentId, vote });
		}

		// Trigger upvote milestone notification when upvoting
		if (vote === 1) {
			try {
				const allVotes = await pb.collection('comment_votes').getFullList({
					requestKey: null,
					filter: `comment = "${commentId}" && vote = 1`,
					fields: 'id'
				});
				const upvoteCount = allVotes.length;
				const commentRecord = await pb.collection('content_comments').getOne(commentId, { requestKey: null, fields: 'user,contentId,contentType' });
				const commentOwnerId = commentRecord.user as string;
				if (commentOwnerId && commentOwnerId !== uid) {
					const contentId = commentRecord.contentId as string;
					const contentType = commentRecord.contentType as string;
					const collection = contentType === 'textbook' ? 'textbooks' : 'flashcard_categories';
					const content = await pb.collection(collection).getOne(contentId, { requestKey: null, fields: 'title,name,shareTitle' });
					const title = (content.shareTitle as string) || (content.title as string) || (content.name as string) || '';
					triggerUpvoteMilestone(commentOwnerId, upvoteCount, title);
				}
			} catch { /* milestone notifications never block */ }
		}
	} catch (e) {
		if (e instanceof ClientResponseError) throw new Error(e.message);
		throw e;
	}
}

export function getUserName(comment: Comment): string {
	const u = comment.expand?.user;
	if (!u) return 'Anonymous';
	return u.name || u.email || 'Anonymous';
}
