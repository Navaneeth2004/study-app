<script lang="ts">
	import type { PublicProfile } from '$lib/profile/profileTypes';

	interface Props {
		profile: PublicProfile;
		followerCount?: number;
		publishedCount?: number;
		isFollowing?: boolean;
		onFollow?: () => void;
		onUnfollow?: () => void;
		onNavigate: () => void;
	}

	let { profile, followerCount = 0, publishedCount = 0, isFollowing = false, onFollow, onUnfollow, onNavigate }: Props = $props();
</script>

<div class="flex items-center gap-3 rounded-xl border border-[var(--color-surface-700)]
            bg-[var(--color-surface-900)] p-4 transition-colors hover:border-[var(--color-surface-600)]">
	<!-- Avatar -->
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div onclick={onNavigate} class="shrink-0 cursor-pointer">
		{#if profile.avatarUrl}
			<img src={profile.avatarUrl} alt={profile.name}
			     class="h-11 w-11 rounded-full object-cover border border-[var(--color-surface-700)]" />
		{:else}
			<div class="flex h-11 w-11 items-center justify-center rounded-full
			            bg-[var(--color-surface-700)] text-[var(--color-text-secondary)] text-base font-semibold">
				{profile.name ? profile.name[0].toUpperCase() : '?'}
			</div>
		{/if}
	</div>

	<!-- Info -->
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="flex-1 min-w-0 cursor-pointer" onclick={onNavigate}>
		<p class="text-sm font-medium text-[var(--color-text-primary)] hover:text-[var(--color-accent-400)] transition-colors truncate">
			{profile.name || 'Unknown'}
		</p>
		{#if profile.bio}
			<p class="text-xs text-[var(--color-text-muted)] truncate mt-0.5">{profile.bio}</p>
		{/if}
		<div class="flex items-center gap-3 mt-1">
			{#if followerCount > 0}
				<span class="text-xs text-[var(--color-text-muted)]">{followerCount} follower{followerCount !== 1 ? 's' : ''}</span>
			{/if}
			{#if publishedCount > 0}
				<span class="text-xs text-[var(--color-text-muted)]">{publishedCount} published</span>
			{/if}
		</div>
	</div>

	<!-- Follow button -->
	{#if onFollow || onUnfollow}
		{#if isFollowing}
			<button onclick={onUnfollow}
				class="shrink-0 rounded-xl border border-[var(--color-surface-600)] px-4 py-1.5 text-xs font-medium
				       text-[var(--color-text-secondary)] hover:text-[var(--color-error-400)]
				       hover:border-[var(--color-error-400)]/50 transition-colors">
				Unfollow
			</button>
		{:else}
			<button onclick={onFollow}
				class="shrink-0 rounded-xl bg-[var(--color-accent-500)] px-4 py-1.5 text-xs font-medium
				       text-white hover:bg-[var(--color-accent-400)] transition-colors">
				Follow
			</button>
		{/if}
	{/if}
</div>
