<script lang="ts">
	import { onMount } from 'svelte';
	import {
		getMyProfile, updateProfile, getProfileStats,
		getFollowers, getFollowing, followUser, unfollowUser
	} from '$lib/profile/profileService';
	import FollowListPanel from '$lib/profile/components/FollowListPanel.svelte';
	import type { UserProfile, ProfileStats, FollowerUser } from '$lib/profile/profileTypes';
	import { getCurrentUser } from '$lib/auth/authService';

	const user = getCurrentUser();

	let profile = $state<UserProfile | null>(null);
	let stats = $state<ProfileStats | null>(null);
	let loading = $state(true);
	let error = $state('');
	let editing = $state(false);
	let draftName = $state('');
	let draftBio = $state('');
	let draftInstagram = $state('');
	let draftYoutube = $state('');
	let draftWebsite = $state('');
	let draftPublic = $state(false);
	let avatarFile = $state<File | null>(null);
	let avatarPreview = $state('');
	let saving = $state(false);
	let showFollowers = $state(false);
	let showFollowing = $state(false);
	let followers = $state<FollowerUser[]>([]);
	let following = $state<FollowerUser[]>([]);
	let followingIds = $state<Set<string>>(new Set());
	let followMap = $state<Map<string, string>>(new Map());

	onMount(async () => {
		loading = true;
		try {
			const [p, s] = await Promise.all([getMyProfile(), getProfileStats(user?.id ?? '')]);
			profile = p; stats = s;
			initDrafts(p);
		} catch (e) { error = e instanceof Error ? e.message : 'Could not load profile.'; }
		finally { loading = false; }
	});

	function initDrafts(p: UserProfile) {
		draftName = p.name; draftBio = p.bio;
		draftInstagram = p.instagramUrl; draftYoutube = p.youtubeUrl;
		draftWebsite = p.websiteUrl; draftPublic = p.isProfilePublic;
		avatarFile = null; avatarPreview = '';
	}

	function handleAvatarChange(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file) return;
		avatarFile = file; avatarPreview = URL.createObjectURL(file);
	}

	async function handleSave() {
		saving = true; error = '';
		try {
			const updated = await updateProfile({
				name: draftName.trim(), bio: draftBio.trim(),
				instagramUrl: draftInstagram.trim(), youtubeUrl: draftYoutube.trim(),
				websiteUrl: draftWebsite.trim(), isProfilePublic: draftPublic,
				avatarFile: avatarFile ?? undefined
			});
			profile = updated; editing = false; avatarFile = null;
		} catch (e) { error = e instanceof Error ? e.message : 'Could not save.'; }
		finally { saving = false; }
	}

	async function openFollowers() {
		showFollowers = true;
		if (!followers.length) {
			const [fl, fw] = await Promise.all([
				getFollowers(user?.id ?? ''), getFollowing(user?.id ?? '')
			]);
			followers = fl; following = fw;
			followingIds = new Set(fw.map((u) => u.id));
		}
	}

	async function openFollowing() {
		showFollowing = true;
		if (!following.length) {
			following = await getFollowing(user?.id ?? '');
			followingIds = new Set(following.map((u) => u.id));
		}
	}

	async function handleFollow(userId: string) {
		const f = await followUser(userId);
		followingIds = new Set([...followingIds, userId]);
		followMap = new Map([...followMap, [userId, f.id]]);
	}

	async function handleUnfollow(userId: string, followId: string) {
		await unfollowUser(followId);
		followingIds.delete(userId); followingIds = new Set(followingIds);
		followMap.delete(userId); followMap = new Map(followMap);
	}

	function formatDate(iso: string) {
		return new Date(iso).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
	}

	const avatarInitial = $derived(profile?.name ? profile.name[0].toUpperCase() : (user?.name ? user.name[0].toUpperCase() : '?'));
</script>

<svelte:head><title>My Profile — StudyApp</title></svelte:head>

<FollowListPanel isOpen={showFollowers} title="Followers" users={followers}
	currentUserId={user?.id ?? ''} onClose={() => (showFollowers = false)}
	onFollow={handleFollow} onUnfollow={handleUnfollow} {followingIds} {followMap} />
<FollowListPanel isOpen={showFollowing} title="Following" users={following}
	currentUserId={user?.id ?? ''} onClose={() => (showFollowing = false)}
	onFollow={handleFollow} onUnfollow={handleUnfollow} {followingIds} {followMap} />

{#if loading}
	<div class="flex flex-col gap-6 max-w-2xl">
		<div class="h-48 rounded-2xl bg-[var(--color-surface-800)]"></div>
		<div class="grid grid-cols-3 gap-3">{#each Array(6) as _}<div class="h-16 rounded-xl bg-[var(--color-surface-800)]"></div>{/each}</div>
	</div>
{:else if profile}
<div class="flex flex-col gap-6 max-w-2xl">

	<!-- Profile hero card -->
	<div class="rounded-2xl border border-[var(--color-surface-700)] bg-[var(--color-surface-900)] overflow-hidden">

		<!-- Accent banner -->
		<div class="h-20 w-full"
		     style="background: linear-gradient(135deg, color-mix(in srgb, var(--color-accent-500) 30%, transparent), color-mix(in srgb, var(--color-accent-300) 15%, transparent));"></div>

		<div class="px-6 pb-6">
			<!-- Avatar row -->
			<div class="flex items-end justify-between -mt-10 mb-4">
				<!-- Avatar -->
				<div class="relative">
					{#if editing}
						<label class="cursor-pointer group" aria-label="Change avatar">
							{#if avatarPreview || profile.avatarUrl}
								<img src={avatarPreview || profile.avatarUrl} alt="Avatar"
								     class="h-20 w-20 rounded-full object-cover border-4 border-[var(--color-surface-900)]" />
							{:else}
								<div class="flex h-20 w-20 items-center justify-center rounded-full border-4 border-[var(--color-surface-900)]
								            bg-[var(--color-surface-700)] text-2xl font-bold text-[var(--color-text-muted)]">
									{avatarInitial}
								</div>
							{/if}
							<div class="absolute inset-0 flex items-center justify-center rounded-full
							            bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
								<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round">
									<path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
									<circle cx="12" cy="13" r="4"/>
								</svg>
							</div>
							<input type="file" accept="image/*" onchange={handleAvatarChange} class="hidden" />
						</label>
					{:else if profile.avatarUrl}
						<img src={profile.avatarUrl} alt="Avatar"
						     class="h-20 w-20 rounded-full object-cover border-4 border-[var(--color-surface-900)]" />
					{:else}
						<div class="flex h-20 w-20 items-center justify-center rounded-full border-4 border-[var(--color-surface-900)]
						            text-2xl font-bold"
						     style="background: color-mix(in srgb, var(--color-accent-500) 20%, var(--color-surface-800)); color: var(--color-accent-400);">
							{avatarInitial}
						</div>
					{/if}
				</div>

				<!-- Edit / Save buttons -->
				{#if editing}
					<div class="flex gap-2">
						<button onclick={handleSave} disabled={saving}
							class="rounded-xl bg-[var(--color-accent-500)] px-4 py-1.5 text-sm font-medium text-white
							       hover:bg-[var(--color-accent-400)] disabled:opacity-50 transition-colors">
							{saving ? 'Saving…' : 'Save'}
						</button>
						<button onclick={() => { editing = false; initDrafts(profile!); }}
							class="rounded-xl border border-[var(--color-surface-600)] px-4 py-1.5 text-sm
							       text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
							Cancel
						</button>
					</div>
				{:else}
					<button onclick={() => (editing = true)}
						class="rounded-xl border border-[var(--color-surface-600)] px-4 py-1.5 text-sm
						       text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
						Edit Profile
					</button>
				{/if}
			</div>

			<!-- Name & bio -->
			{#if editing}
				<div class="flex flex-col gap-3">
					<input bind:value={draftName} type="text" placeholder="Your name"
						class="w-full rounded-xl border border-[var(--color-surface-600)] bg-[var(--color-surface-800)]
						       px-3 py-2 text-lg font-semibold text-[var(--color-text-primary)]
						       focus:border-[var(--color-accent-500)] focus:outline-none transition-colors" />
					<div class="relative">
						<textarea bind:value={draftBio} maxlength={200} rows={2} placeholder="Add a bio…"
							class="w-full resize-none rounded-xl border border-[var(--color-surface-600)] bg-[var(--color-surface-800)]
							       px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]
							       focus:border-[var(--color-accent-500)] focus:outline-none transition-colors pr-14"></textarea>
						<span class="absolute right-3 bottom-2 text-xs text-[var(--color-text-muted)]">{draftBio.length}/200</span>
					</div>
					<!-- Social links -->
					<div class="grid grid-cols-1 gap-2 sm:grid-cols-3">
						{#each [['Instagram', draftInstagram, 'instagram'], ['YouTube', draftYoutube, 'youtube'], ['Website', draftWebsite, 'website']] as [label, val, key]}
							<input type="url" value={val}
								oninput={(e) => { const v = (e.target as HTMLInputElement).value; if (key === 'instagram') draftInstagram = v; else if (key === 'youtube') draftYoutube = v; else draftWebsite = v; }}
								placeholder="{label} URL"
								class="w-full rounded-xl border border-[var(--color-surface-600)] bg-[var(--color-surface-800)]
								       px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]
								       focus:border-[var(--color-accent-500)] focus:outline-none transition-colors" />
						{/each}
					</div>
					<!-- Visibility -->
					<label class="flex items-center gap-3 cursor-pointer">
						<div class="relative shrink-0">
							<input type="checkbox" bind:checked={draftPublic} class="sr-only peer" />
							<div class="h-5 w-9 rounded-full border border-[var(--color-surface-600)] bg-[var(--color-surface-700)]
							            peer-checked:bg-[var(--color-accent-500)] peer-checked:border-[var(--color-accent-500)] transition-colors"></div>
							<div class="absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-[var(--color-text-muted)] transition-transform
							            peer-checked:translate-x-4 peer-checked:bg-white"></div>
						</div>
						<span class="text-sm text-[var(--color-text-secondary)]">Make profile public</span>
					</label>
				</div>
			{:else}
				<div class="flex flex-col gap-1">
					<h1 class="text-xl font-semibold text-[var(--color-text-primary)]">{profile.name || 'Anonymous'}</h1>
					{#if profile.bio}
						<p class="text-sm text-[var(--color-text-secondary)] leading-relaxed">{profile.bio}</p>
					{:else}
						<p class="text-sm text-[var(--color-text-muted)] italic">No bio yet. Click Edit Profile to add one.</p>
					{/if}
				</div>

				<!-- Meta row -->
				<div class="flex items-center gap-4 mt-3 flex-wrap">
					<span class="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
						<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
							<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
						</svg>
						Joined {formatDate(profile.created)}
					</span>
					<span class="flex items-center gap-1 text-xs {profile.isProfilePublic ? 'text-[var(--color-success-500)]' : 'text-[var(--color-text-muted)]'}">
						<div class="h-1.5 w-1.5 rounded-full {profile.isProfilePublic ? 'bg-[var(--color-success-500)]' : 'bg-[var(--color-text-muted)]'}"></div>
						{profile.isProfilePublic ? 'Public' : 'Private'}
					</span>
					{#if profile.instagramUrl || profile.youtubeUrl || profile.websiteUrl}
						<div class="flex items-center gap-2">
							{#if profile.instagramUrl}
								<a href={profile.instagramUrl} target="_blank" rel="noopener" class="text-[var(--color-text-muted)] hover:text-[var(--color-accent-400)] transition-colors">
									<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="5"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>
								</a>
							{/if}
							{#if profile.youtubeUrl}
								<a href={profile.youtubeUrl} target="_blank" rel="noopener" class="text-[var(--color-text-muted)] hover:text-[var(--color-accent-400)] transition-colors">
									<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M22.54 6.42a2.78 2.78 0 00-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 00-1.95 1.96A29 29 0 001 12a29 29 0 00.46 5.58a2.78 2.78 0 001.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 001.95-1.96A29 29 0 0023 12a29 29 0 00-.46-5.58z"/><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="currentColor" stroke="none"/></svg>
								</a>
							{/if}
							{#if profile.websiteUrl}
								<a href={profile.websiteUrl} target="_blank" rel="noopener" class="text-[var(--color-text-muted)] hover:text-[var(--color-accent-400)] transition-colors">
									<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
								</a>
							{/if}
						</div>
					{/if}
				</div>
			{/if}
			{#if error}<p class="text-sm text-[var(--color-error-400)] mt-2">{error}</p>{/if}
		</div>
	</div>

	<!-- Stats grid -->
	{#if stats}
		<div class="grid grid-cols-3 gap-3 sm:grid-cols-6">
			<button onclick={openFollowers}
				class="flex flex-col items-center gap-0.5 rounded-xl border border-[var(--color-surface-700)]
				       bg-[var(--color-surface-900)] p-4 hover:border-[var(--color-accent-500)]/50
				       hover:bg-[var(--color-accent-500)]/5 transition-colors cursor-pointer">
				<span class="text-xl font-bold text-[var(--color-text-primary)]">{stats.followers}</span>
				<span class="text-xs text-[var(--color-text-muted)]">Followers</span>
			</button>
			<button onclick={openFollowing}
				class="flex flex-col items-center gap-0.5 rounded-xl border border-[var(--color-surface-700)]
				       bg-[var(--color-surface-900)] p-4 hover:border-[var(--color-accent-500)]/50
				       hover:bg-[var(--color-accent-500)]/5 transition-colors cursor-pointer">
				<span class="text-xl font-bold text-[var(--color-text-primary)]">{stats.following}</span>
				<span class="text-xs text-[var(--color-text-muted)]">Following</span>
			</button>
			{#each [
				{ label: 'Textbooks', value: stats.publishedTextbooks, icon: '📚' },
				{ label: 'Decks', value: stats.publishedDecks, icon: '🃏' },
				{ label: 'Installs', value: stats.totalInstalls, icon: '📥' },
				{ label: 'Comments', value: stats.totalComments, icon: '💬' }
			] as s}
				<div class="flex flex-col items-center gap-0.5 rounded-xl border border-[var(--color-surface-700)]
				            bg-[var(--color-surface-900)] p-4">
					<span class="text-xl font-bold text-[var(--color-text-primary)]">{s.value}</span>
					<span class="text-xs text-[var(--color-text-muted)]">{s.label}</span>
				</div>
			{/each}
		</div>

		<!-- Most installed -->
		{#if stats.mostInstalledContent.length > 0}
			<div class="flex flex-col gap-3">
				<h2 class="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
					🏆 Top Content
				</h2>
				<div class="flex flex-col gap-2">
					{#each stats.mostInstalledContent as item, i}
						<div class="flex items-center gap-3 rounded-xl border border-[var(--color-surface-700)]
						            bg-[var(--color-surface-900)] px-4 py-3">
							<span class="text-sm font-bold text-[var(--color-text-muted)] w-5">{i + 1}</span>
							<div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
							     style="background: color-mix(in srgb, var(--color-accent-500) 15%, transparent);">
								<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
								     stroke-width="1.8" stroke-linecap="round" style="color:var(--color-accent-400)">
									{#if item.type === 'textbook'}
										<path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
									{:else}
										<rect x="2" y="4" width="14" height="10" rx="2"/><rect x="8" y="10" width="14" height="10" rx="2"/>
									{/if}
								</svg>
							</div>
							<span class="flex-1 text-sm font-medium text-[var(--color-text-primary)] truncate">{item.title}</span>
							<div class="flex items-center gap-1 shrink-0">
								<span class="text-xs font-semibold text-[var(--color-accent-400)]">{item.installs}</span>
								<span class="text-xs text-[var(--color-text-muted)]">installs</span>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}
	{/if}
</div>
{/if}
