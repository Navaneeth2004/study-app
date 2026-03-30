import { pb } from '$lib/shared/pocketbase';
import { ClientResponseError } from 'pocketbase';
import type { UserProfile, PublicProfile, ProfileStats, Follow, FollowerUser, UpdateProfileData } from './profileTypes';

function avatarUrl(r: Record<string, unknown>): string {
	if (!r.avatar) return '';
	try { return pb.files.getURL(r as Parameters<typeof pb.files.getURL>[0], r.avatar as string); }
	catch { return ''; }
}

function toProfile(r: Record<string, unknown>): UserProfile {
	return {
		id: r.id as string,
		name: (r.name as string) ?? '',
		email: (r.email as string) ?? '',
		avatar: (r.avatar as string) ?? '',
		avatarUrl: avatarUrl(r),
		bio: (r.bio as string) ?? '',
		instagramUrl: (r.instagramUrl as string) ?? '',
		youtubeUrl: (r.youtubeUrl as string) ?? '',
		websiteUrl: (r.websiteUrl as string) ?? '',
		isProfilePublic: (r.isProfilePublic as boolean) ?? false,
		profileSetupDone: (r.profileSetupDone as boolean) ?? false,
		created: r.created as string,
		updated: r.updated as string
	};
}

function toPublicProfile(r: Record<string, unknown>): PublicProfile {
	return {
		id: r.id as string,
		name: (r.name as string) ?? '',
		avatarUrl: avatarUrl(r),
		bio: (r.bio as string) ?? '',
		instagramUrl: (r.instagramUrl as string) ?? '',
		youtubeUrl: (r.youtubeUrl as string) ?? '',
		websiteUrl: (r.websiteUrl as string) ?? '',
		isProfilePublic: (r.isProfilePublic as boolean) ?? false,
		isDeleted: (r.isDeleted as boolean) ?? false,
		created: r.created as string
	};
}

export async function getMyProfile(): Promise<UserProfile> {
	const id = pb.authStore.record?.id;
	if (!id) throw new Error('Not authenticated.');
	try {
		const r = await pb.collection('users').getOne(id, { requestKey: null });
		return toProfile(r);
	} catch (e) {
		if (e instanceof ClientResponseError) throw new Error(e.message);
		throw e;
	}
}

export async function updateProfile(data: UpdateProfileData): Promise<UserProfile> {
	const id = pb.authStore.record?.id;
	if (!id) throw new Error('Not authenticated.');
	try {
		const formData = new FormData();
		if (data.name !== undefined) formData.append('name', data.name);
		if (data.bio !== undefined) formData.append('bio', data.bio);
		if (data.instagramUrl !== undefined) formData.append('instagramUrl', data.instagramUrl);
		if (data.youtubeUrl !== undefined) formData.append('youtubeUrl', data.youtubeUrl);
		if (data.websiteUrl !== undefined) formData.append('websiteUrl', data.websiteUrl);
		if (data.isProfilePublic !== undefined) formData.append('isProfilePublic', String(data.isProfilePublic));
		if (data.profileSetupDone !== undefined) formData.append('profileSetupDone', String(data.profileSetupDone));
		if (data.avatarFile) formData.append('avatar', data.avatarFile);
		const r = await pb.collection('users').update(id, formData, { requestKey: null });
		return toProfile(r);
	} catch (e) {
		if (e instanceof ClientResponseError) throw new Error(e.message);
		throw e;
	}
}

export async function getPublicProfile(userId: string): Promise<PublicProfile | null> {
	try {
		const r = await pb.collection('users').getOne(userId, { requestKey: null });
		return toPublicProfile(r);
	} catch (e) {
		if (e instanceof ClientResponseError && e.status === 404) return null;
		if (e instanceof ClientResponseError) throw new Error(e.message);
		throw e;
	}
}

export async function searchUsers(query: string): Promise<PublicProfile[]> {
	try {
		// Use only isProfilePublic filter — isDeleted may not exist on all deployments
		// and causes a 400. We filter isDeleted client-side instead.
		const filter = query.trim()
			? `isProfilePublic = true && name ~ "${query.trim().replace(/"/g, '\\"')}"`
			: 'isProfilePublic = true';

		const records = await pb.collection('users').getFullList({
			requestKey: null,
			filter,
			fields: 'id,name,avatar,bio,instagramUrl,youtubeUrl,websiteUrl,isProfilePublic,isDeleted,created',
			sort: 'name'
		});

		// Filter out deleted accounts client-side
		return records
			.map(toPublicProfile)
			.filter((p) => !p.isDeleted);
	} catch (e) {
		if (e instanceof ClientResponseError) throw new Error(e.message);
		throw e;
	}
}

export async function getFollowerCount(userId: string): Promise<number> {
	try {
		const result = await pb.collection('follows').getList(1, 1, {
			requestKey: null, filter: `following = "${userId}"`, fields: 'id'
		});
		return result.totalItems;
	} catch { return 0; }
}

export async function getFollowingCount(userId: string): Promise<number> {
	try {
		const result = await pb.collection('follows').getList(1, 1, {
			requestKey: null, filter: `follower = "${userId}"`, fields: 'id'
		});
		return result.totalItems;
	} catch { return 0; }
}

export async function getFollowers(userId: string): Promise<FollowerUser[]> {
	try {
		const records = await pb.collection('follows').getFullList({
			requestKey: null,
			filter: `following = "${userId}"`,
			expand: 'follower',
			sort: '-created'
		});
		return records.map((r) => {
			const u = r.expand?.follower as Record<string, unknown> | undefined;
			const uRec = u ?? {};
			const id = (uRec.id as string) ?? (r.follower as string);
			if (!u || !(uRec.name || uRec.email)) {
				return { id, name: '[deleted]', avatarUrl: '', bio: '' };
			}
			return {
				id,
				name: ((uRec.name as string) || (uRec.email as string)) ?? '',
				avatarUrl: avatarUrl(uRec),
				bio: (uRec.bio as string) ?? ''
			};
		});
	} catch (e) {
		if (e instanceof ClientResponseError) throw new Error(e.message);
		throw e;
	}
}

export async function getFollowing(userId: string): Promise<FollowerUser[]> {
	try {
		const records = await pb.collection('follows').getFullList({
			requestKey: null,
			filter: `follower = "${userId}"`,
			expand: 'following',
			sort: '-created'
		});
		return records.map((r) => {
			const u = r.expand?.following as Record<string, unknown> | undefined;
			const uRec = u ?? {};
			const id = (uRec.id as string) ?? (r.following as string);
			if (!u || !(uRec.name || uRec.email)) {
				return { id, name: '[deleted]', avatarUrl: '', bio: '' };
			}
			return {
				id,
				name: ((uRec.name as string) || (uRec.email as string)) ?? '',
				avatarUrl: avatarUrl(uRec),
				bio: (uRec.bio as string) ?? ''
			};
		});
	} catch (e) {
		if (e instanceof ClientResponseError) throw new Error(e.message);
		throw e;
	}
}

export async function isFollowing(userId: string): Promise<string | null> {
	const me = pb.authStore.record?.id;
	if (!me || me === userId) return null;
	try {
		const records = await pb.collection('follows').getFullList({
			requestKey: null,
			filter: `follower = "${me}" && following = "${userId}"`
		});
		return records.length > 0 ? (records[0].id as string) : null;
	} catch { return null; }
}

export async function followUser(userId: string): Promise<Follow> {
	const me = pb.authStore.record?.id;
	if (!me) throw new Error('Not authenticated.');
	try {
		const r = await pb.collection('follows').create({
			follower: me, following: userId
		}, { requestKey: null });
		return { id: r.id as string, follower: r.follower as string, following: r.following as string, created: r.created as string };
	} catch (e) {
		if (e instanceof ClientResponseError) throw new Error(e.message);
		throw e;
	}
}

export async function unfollowUser(followId: string): Promise<void> {
	try {
		await pb.collection('follows').delete(followId, { requestKey: null });
	} catch (e) {
		if (e instanceof ClientResponseError) throw new Error(e.message);
		throw e;
	}
}

export async function getPublishedContent(userId: string): Promise<{
	textbooks: Array<{ id: string; title: string; description: string; shareTitle: string; shareDescription: string }>;
	categories: Array<{ id: string; name: string; description: string; shareTitle: string; shareDescription: string }>;
}> {
	try {
		const [tb, cats] = await Promise.all([
			pb.collection('textbooks').getFullList({
				requestKey: null,
				filter: `owner = "${userId}" && isShared = true`,
				sort: '-created'
			}),
			pb.collection('flashcard_categories').getFullList({
				requestKey: null,
				filter: `owner = "${userId}" && isShared = true`,
				sort: '-created'
			})
		]);
		return {
			textbooks: tb.map((r) => ({
				id: r.id as string, title: r.title as string,
				description: (r.description as string) ?? '',
				shareTitle: (r.shareTitle as string) ?? (r.title as string),
				shareDescription: (r.shareDescription as string) ?? ''
			})),
			categories: cats.map((r) => ({
				id: r.id as string, name: r.name as string,
				description: (r.description as string) ?? '',
				shareTitle: (r.shareTitle as string) ?? (r.name as string),
				shareDescription: (r.shareDescription as string) ?? ''
			}))
		};
	} catch (e) {
		if (e instanceof ClientResponseError) throw new Error(e.message);
		throw e;
	}
}

export async function getProfileStats(userId: string): Promise<ProfileStats> {
	try {
		const [tbList, catList, followersRes, followingRes] = await Promise.all([
			pb.collection('textbooks').getFullList({ requestKey: null, filter: `owner = "${userId}" && isShared = true`, fields: 'id,title,shareTitle' }),
			pb.collection('flashcard_categories').getFullList({ requestKey: null, filter: `owner = "${userId}" && isShared = true`, fields: 'id,name,shareTitle' }),
			pb.collection('follows').getList(1, 1, { requestKey: null, filter: `following = "${userId}"`, fields: 'id' }),
			pb.collection('follows').getList(1, 1, { requestKey: null, filter: `follower = "${userId}"`, fields: 'id' })
		]);

		const allContentIds = [...tbList.map((r) => r.id as string), ...catList.map((r) => r.id as string)];
		let totalInstalls = 0;
		const installCounts: Array<{ id: string; title: string; installs: number; type: 'textbook' | 'deck' }> = [];

		if (allContentIds.length > 0) {
			const filter = '(' + allContentIds.map((id) => `contentId = "${id}"`).join(' || ') + ')';
			const installs = await pb.collection('installs').getFullList({ requestKey: null, filter, fields: 'contentId' });
			const counts: Record<string, number> = {};
			for (const id of allContentIds) counts[id] = 0;
			for (const r of installs) { const id = r.contentId as string; if (id in counts) counts[id]++; }
			totalInstalls = Object.values(counts).reduce((a, b) => a + b, 0);
			for (const tb of tbList) { installCounts.push({ id: tb.id as string, title: (tb.shareTitle as string) || (tb.title as string), installs: counts[tb.id as string] ?? 0, type: 'textbook' }); }
			for (const cat of catList) { installCounts.push({ id: cat.id as string, title: (cat.shareTitle as string) || (cat.name as string), installs: counts[cat.id as string] ?? 0, type: 'deck' }); }
			installCounts.sort((a, b) => b.installs - a.installs);
		}

		let totalComments = 0;
		if (allContentIds.length > 0) {
			const cFilter = '(' + allContentIds.map((id) => `contentId = "${id}"`).join(' || ') + ')';
			const commentsRes = await pb.collection('content_comments').getList(1, 1, { requestKey: null, filter: cFilter, fields: 'id' });
			totalComments = commentsRes.totalItems;
		}

		const userRes = await pb.collection('users').getOne(userId, { requestKey: null, fields: 'created' });

		return {
			publishedTextbooks: tbList.length,
			publishedDecks: catList.length,
			totalInstalls,
			mostInstalledContent: installCounts.slice(0, 3),
			followers: followersRes.totalItems,
			following: followingRes.totalItems,
			totalComments,
			memberSince: userRes.created as string
		};
	} catch (e) {
		if (e instanceof ClientResponseError) throw new Error(e.message);
		throw e;
	}
}
