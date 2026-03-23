<script lang="ts">
	import type { FollowerUser } from '$lib/profile/profileTypes';

	interface Props {
		isOpen: boolean;
		title: string;
		users: FollowerUser[];
		currentUserId: string;
		onClose: () => void;
		onFollow?: (userId: string) => void;
		onUnfollow?: (userId: string, followId: string) => void;
		followingIds?: Set<string>;
		followMap?: Map<string, string>;
	}

	let { isOpen, title, users, currentUserId, onClose, onFollow, onUnfollow,
	      followingIds = new Set(), followMap = new Map() }: Props = $props();
</script>

{#if isOpen}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="fixed inset-0 z-40 bg-black/50" onclick={onClose}></div>
	<div class="fixed right-0 top-0 z-50 flex h-full w-80 flex-col border-l
	            border-[var(--color-surface-700)] bg-[var(--color-surface-900)] shadow-2xl">
		<div class="flex items-center justify-between border-b border-[var(--color-surface-700)] px-5 py-4">
			<span class="font-semibold text-[var(--color-text-primary)]">{title}</span>
			<button onclick={onClose} aria-label="Close"
				class="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-text-muted)]
				       hover:bg-[var(--color-surface-800)] hover:text-[var(--color-text-primary)] transition-colors">
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
					<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
				</svg>
			</button>
		</div>
		<div class="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
			{#if users.length === 0}
				<p class="text-sm text-[var(--color-text-muted)] text-center py-8">No users yet.</p>
			{:else}
				{#each users as user (user.id)}
					{@const isDeleted = !user.name || user.name === '[deleted]'}
					<div class="flex items-center gap-3">
						{#if !isDeleted}
							<a href="/profile/{user.id}" class="shrink-0">
								{#if user.avatarUrl}
									<img src={user.avatarUrl} alt={user.name}
									     class="h-9 w-9 rounded-full object-cover border border-[var(--color-surface-700)]" />
								{:else}
									<div class="flex h-9 w-9 items-center justify-center rounded-full
									            bg-[var(--color-surface-700)] text-sm font-medium text-[var(--color-text-muted)]">
										{user.name ? user.name[0].toUpperCase() : '?'}
									</div>
								{/if}
							</a>
						{:else}
							<div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-700)]">
								<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
								     stroke-width="1.8" stroke-linecap="round" class="text-[var(--color-text-muted)]">
									<path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
								</svg>
							</div>
						{/if}
						<div class="flex-1 min-w-0">
							{#if !isDeleted}
								<a href="/profile/{user.id}"
								   class="text-sm font-medium text-[var(--color-text-primary)] hover:text-[var(--color-accent-400)] transition-colors truncate block">
									{user.name}
								</a>
								{#if user.bio}
									<p class="text-xs text-[var(--color-text-muted)] truncate">{user.bio}</p>
								{/if}
							{:else}
								<span class="text-sm text-[var(--color-text-muted)] italic">Deleted account</span>
							{/if}
						</div>
						{#if !isDeleted && user.id !== currentUserId && onFollow && onUnfollow}
							{@const fid = followMap.get(user.id)}
							{#if fid}
								<button onclick={() => onUnfollow!(user.id, fid)}
									class="shrink-0 rounded-lg border border-[var(--color-surface-600)] px-3 py-1 text-xs
									       text-[var(--color-text-secondary)] hover:text-[var(--color-error-400)]
									       hover:border-[var(--color-error-400)]/50 transition-colors">Unfollow</button>
							{:else}
								<button onclick={() => onFollow!(user.id)}
									class="shrink-0 rounded-lg bg-[var(--color-accent-500)] px-3 py-1 text-xs font-medium
									       text-white hover:bg-[var(--color-accent-400)] transition-colors">Follow</button>
							{/if}
						{/if}
					</div>
				{/each}
			{/if}
		</div>
	</div>
{/if}
