<script lang="ts">
	import type { SharedCategory } from '$lib/sharing/sharingTypes';
	import type { FlashcardCategory } from '$lib/creator/flashcardTypes';
	import StarRating from '$lib/shared/components/StarRating.svelte';

	interface Props {
		item: SharedCategory | FlashcardCategory;
		installId: string | null;
		universal: boolean;
		onInstall?: () => void;
		onUninstall?: () => void;
		onClick?: () => void;
	}

	let { item, installId, universal, onInstall, onUninstall, onClick }: Props = $props();
	let confirmUninstall = $state(false);

	const displayTitle = $derived(
		universal ? ('shareTitle' in item ? item.shareTitle : '') || item.name : item.name
	);
	const displayDesc = $derived(
		universal ? ('shareDescription' in item ? item.shareDescription : '') : item.description
	);
	const ownerName = $derived('ownerName' in item ? item.ownerName : '');
</script>

<div class="group flex flex-col gap-2 rounded-xl border border-[var(--color-surface-700)]
            bg-[var(--color-surface-900)] p-4 transition-colors hover:border-[var(--color-surface-600)]">
	<!-- Always clickable -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div onclick={onClick} class="flex flex-col gap-1 cursor-pointer">
		<span class="font-medium text-sm text-[var(--color-text-primary)] group-hover:text-[var(--color-accent-400)] transition-colors">
			{displayTitle}
		</span>
		{#if displayDesc}
			<p class="text-xs text-[var(--color-text-secondary)] line-clamp-2">{displayDesc}</p>
		{/if}
		{#if universal && ownerName}
			<span class="text-xs text-[var(--color-text-muted)]">by {ownerName}</span>
		{/if}
	</div>

	{#if universal}
		<StarRating contentType="flashcard_category" contentId={item.id} readonly={true} showCount={true} />

		<div class="flex items-center justify-between gap-2 pt-1">
			<button
				onclick={onClick}
				class="text-xs text-[var(--color-accent-400)] hover:underline transition-colors"
			>
				View →
			</button>

			<div class="flex items-center gap-2">
				{#if !confirmUninstall}
					{#if installId}
						<button onclick={() => (confirmUninstall = true)}
							class="rounded-lg border border-[var(--color-surface-600)] px-3 py-1 text-xs
							       text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
							Installed
						</button>
					{:else}
						<button onclick={onInstall}
							class="rounded-lg bg-[var(--color-accent-500)] px-3 py-1 text-xs font-medium
							       text-[var(--color-text-primary)] hover:bg-[var(--color-accent-400)] transition-colors">
							Get
						</button>
					{/if}
				{:else}
					<div class="flex items-center gap-2">
						<span class="text-xs text-[var(--color-text-muted)]">Remove?</span>
						<button onclick={() => { confirmUninstall = false; onUninstall?.(); }}
							class="rounded-lg bg-[var(--color-error-500)]/15 px-2 py-1 text-xs
							       text-[var(--color-error-400)] hover:bg-[var(--color-error-500)]/25 transition-colors">
							Yes
						</button>
						<button onclick={() => (confirmUninstall = false)}
							class="rounded-lg border border-[var(--color-surface-600)] px-2 py-1 text-xs
							       text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
							Cancel
						</button>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>
