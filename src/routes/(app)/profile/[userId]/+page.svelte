<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import {
		getPublicProfile, getProfileStats, getPublishedContent,
		isFollowing, followUser, unfollowUser, getFollowerCount, getFollowingCount
	} from '$lib/profile/profileService';
	import { getCurrentUser } from '$lib/auth/authService';
	import { triggerFollowMilestone } from '$lib/notifications/inAppNotificationService';
	import type { PublicProfile, ProfileStats } from '$lib/profile/profileTypes';

	const userId = $derived($page.params.userId as string);
	const user = getCurrentUser();

	let profile = $state<PublicProfile | null>(null);
	let stats = $state<ProfileStats | null>(null);
	let content = $state<{ textbooks: Array<{id:string;title:string;shareTitle:string;description:string;shareDescription:string}>; categories: Array<{id:string;name:string;shareTitle:string;description:string;shareDescription:string}> } | null>(null);
	let followId = $state<string | null>(null);
	let loading = $state(true);
	let error = $state('');
	let following = $state(false);

	const isOwnProfile = $derived(userId === user?.id);

	onMount(async () => {
		if (isOwnProfile) { goto('/profile'); return; }
		loading = true;
		try {
			const [p, s, c, fid] = await Promise.all([
				getPublicProfile(userId),
				getProfileStats(userId),
				getPublishedContent(userId),
				isFollowing(userId)
			]);
			profile = p;
			stats = s;
			content = c;
			followId = fid;
			following = !!fid;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not load profile.';
		} finally { loading = false; }
	});

	async function handleFollow() {
		try {
			const f = await followUser(userId);
			followId = f.id; following = true;
			const newCount = (stats?.followers ?? 0) + 1;
			if (stats) stats = { ...stats, followers: newCount };
			triggerFollowMilestone(userId, newCount);
		} catch { /* silent */ }
	}

	async function handleUnfollow() {
		if (!followId) return;
		try {
			await unfollowUser(followId);
			followId = null; following = false;
			if (stats) stats = { ...stats, followers: Math.max(0, stats.followers - 1) };
		} catch { /* silent */ }
	}

	function formatDate(iso: string) {
		return new Date(iso).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
	}
</script>

<svelte:head>
	<title>{profile?.name ?? 'Profile'} — StudyApp</title>
</svelte:head>

{#if loading}
	<div class="flex flex-col gap-6 max-w-2xl">
		<div class="h-24 rounded-xl bg-[var(--color-surface-800)]"></div>
		<div class="h-32 rounded-xl bg-[var(--color-surface-800)]"></div>
	</div>
{:else if error}
	<p class="text-sm text-[var(--color-error-400)]">{error}</p>
{:else if !profile || !profile.isProfilePublic}
	<div class="flex flex-col items-center gap-3 py-16 text-center">
		<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor"
		     stroke-width="1.3" stroke-linecap="round" class="text-[var(--color-text-muted)]">
			<path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
			<circle cx="12" cy="7" r="4"/>
		</svg>
		<h2 class="text-base font-medium text-[var(--color-text-secondary)]">This profile is private.</h2>
		<p class="text-sm text-[var(--color-text-muted)]">This user has not made their profile public.</p>
	</div>
{:else}
<div class="flex flex-col gap-8 max-w-2xl">

	<!-- Header card -->
	<div class="flex flex-col gap-4 rounded-2xl border border-[var(--color-surface-700)]
	            bg-[var(--color-surface-900)] p-6">
		<div class="flex items-start gap-5">
			<!-- Avatar -->
			{#if profile.avatarUrl}
				<img src={profile.avatarUrl} alt={profile.name}
				     class="h-20 w-20 shrink-0 rounded-full object-cover border-2 border-[var(--color-surface-700)]" />
			{:else}
				<div class="flex h-20 w-20 shrink-0 items-center justify-center rounded-full
				            bg-[var(--color-surface-700)] text-2xl font-bold text-[var(--color-text-muted)]">
					{profile.name ? profile.name[0].toUpperCase() : '?'}
				</div>
			{/if}

			<div class="flex-1 min-w-0 flex flex-col gap-1">
				<h1 class="text-xl font-semibold text-[var(--color-text-primary)]">{profile.name || 'Anonymous'}</h1>
				{#if profile.bio}<p class="text-sm text-[var(--color-text-secondary)]">{profile.bio}</p>{/if}
				{#if profile.instagramUrl || profile.youtubeUrl || profile.websiteUrl}
					<div class="flex items-center gap-3 mt-1">
						{#if profile.instagramUrl}
							<a href={profile.instagramUrl} target="_blank" rel="noopener" class="text-[var(--color-text-muted)] hover:text-[var(--color-accent-400)] transition-colors">
								<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="5"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>
							</a>
						{/if}
						{#if profile.youtubeUrl}
							<a href={profile.youtubeUrl} target="_blank" rel="noopener" class="text-[var(--color-text-muted)] hover:text-[var(--color-accent-400)] transition-colors">
								<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M22.54 6.42a2.78 2.78 0 00-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 00-1.95 1.96A29 29 0 001 12a29 29 0 00.46 5.58a2.78 2.78 0 001.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 001.95-1.96A29 29 0 0023 12a29 29 0 00-.46-5.58z"/><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="currentColor" stroke="none"/></svg>
							</a>
						{/if}
						{#if profile.websiteUrl}
							<a href={profile.websiteUrl} target="_blank" rel="noopener" class="text-[var(--color-text-muted)] hover:text-[var(--color-accent-400)] transition-colors">
								<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
							</a>
						{/if}
					</div>
				{/if}
				<p class="text-xs text-[var(--color-text-muted)] mt-1">Member since {formatDate(profile.created)}</p>
			</div>

			<!-- Follow button -->
			{#if !isOwnProfile}
				{#if following}
					<button onclick={handleUnfollow}
						class="shrink-0 rounded-xl border border-[var(--color-surface-600)] px-4 py-2 text-sm
						       text-[var(--color-text-secondary)] hover:text-[var(--color-error-400)]
						       hover:border-[var(--color-error-400)]/50 transition-colors">
						Unfollow
					</button>
				{:else}
					<button onclick={handleFollow}
						class="shrink-0 rounded-xl bg-[var(--color-accent-500)] px-4 py-2 text-sm font-medium
						       text-white hover:bg-[var(--color-accent-400)] transition-colors">
						Follow
					</button>
				{/if}
			{/if}
		</div>
	</div>

	<!-- Stats -->
	{#if stats}
		<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
			{#each [
				{ label: 'Followers', value: stats.followers },
				{ label: 'Following', value: stats.following },
				{ label: 'Textbooks', value: stats.publishedTextbooks },
				{ label: 'Decks', value: stats.publishedDecks }
			] as stat}
				<div class="flex flex-col items-center gap-0.5 rounded-xl border border-[var(--color-surface-700)]
				            bg-[var(--color-surface-900)] p-3">
					<span class="text-lg font-semibold text-[var(--color-text-primary)]">{stat.value}</span>
					<span class="text-xs text-[var(--color-text-muted)]">{stat.label}</span>
				</div>
			{/each}
		</div>
	{/if}

	<!-- Shared content -->
	{#if content && (content.textbooks.length > 0 || content.categories.length > 0)}
		<div class="flex flex-col gap-4">
			<h2 class="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">Published Content</h2>
			<div class="grid gap-3 sm:grid-cols-2">
				{#each content.textbooks as tb}
					<button onclick={() => goto(`/viewer/textbooks/${tb.id}`)}
						class="app-card app-card-clickable text-left">
						<div class="flex items-start gap-2">
							<div class="flex-1 min-w-0">
								<p class="app-card-title">{tb.shareTitle || tb.title}</p>
								{#if tb.shareDescription}<p class="text-xs text-[var(--color-text-muted)] line-clamp-2 mt-0.5">{tb.shareDescription}</p>{/if}
							</div>
							<div class="shrink-0 flex h-7 w-7 items-center justify-center rounded-lg"
							     style="background: color-mix(in srgb, var(--color-accent-500) 15%, transparent);">
								<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" style="color:var(--color-accent-400)">
									<path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
								</svg>
							</div>
						</div>
					</button>
				{/each}
				{#each content.categories as cat}
					<button onclick={() => goto(`/viewer/flashcards/category/${cat.id}`)}
						class="app-card app-card-clickable text-left">
						<div class="flex items-start gap-2">
							<div class="flex-1 min-w-0">
								<p class="app-card-title">{cat.shareTitle || cat.name}</p>
								{#if cat.shareDescription}<p class="text-xs text-[var(--color-text-muted)] line-clamp-2 mt-0.5">{cat.shareDescription}</p>{/if}
							</div>
							<div class="shrink-0 flex h-7 w-7 items-center justify-center rounded-lg"
							     style="background: color-mix(in srgb, var(--color-accent-500) 15%, transparent);">
								<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" style="color:var(--color-accent-400)">
									<rect x="2" y="4" width="14" height="10" rx="2"/><rect x="8" y="10" width="14" height="10" rx="2"/>
								</svg>
							</div>
						</div>
					</button>
				{/each}
			</div>
		</div>
	{/if}

</div>
{/if}
