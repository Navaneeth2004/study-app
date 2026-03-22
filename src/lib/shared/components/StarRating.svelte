<script lang="ts">
	import { onMount } from 'svelte';
	import { getRatingsForContent, rateContent, removeRating } from '$lib/social/ratingService';
	import type { RatingSummary } from '$lib/social/socialTypes';

	interface Props {
		contentType: string;
		contentId: string;
		contentOwnerId?: string;
		showCount?: boolean;
		readonly?: boolean;
	}

	let { contentType, contentId, contentOwnerId = '', showCount = true, readonly = false }: Props = $props();

	let summary = $state<RatingSummary>({ average: 0, count: 0, userRating: null, isOwner: false });
	let loading = $state(true);
	let working = $state(false);
	let hovered = $state(0);
	let confirmRemove = $state(false);

	// If isOwner or readonly, stars are display-only
	const isInteractive = $derived(!readonly && !summary.isOwner);

	onMount(async () => {
		try {
			summary = await getRatingsForContent(contentType, contentId, contentOwnerId);
		} finally { loading = false; }
	});

	async function handleRate(star: number) {
		if (!isInteractive || working) return;
		working = true;
		try {
			await rateContent(contentType, contentId, star);
			summary = await getRatingsForContent(contentType, contentId, contentOwnerId);
		} finally { working = false; }
	}

	async function handleRemove() {
		working = true; confirmRemove = false;
		try {
			await removeRating(contentType, contentId);
			summary = await getRatingsForContent(contentType, contentId, contentOwnerId);
		} finally { working = false; }
	}

	// What to fill up to: in non-interactive / owner mode → average; interactive → hover or user rating
	const fillUpTo = $derived(
		!isInteractive
			? Math.round(summary.average)
			: hovered > 0
			? hovered
			: (summary.userRating ?? 0)
	);

	// Star colour: user's own rating = accent, others' average = warning gold
	function starColor(star: number): string {
		if (star > fillUpTo) return 'var(--color-surface-600)';
		if (!isInteractive) return 'var(--color-warning-400)';
		// Interactive: if this star is within user's rating highlight differently
		if (hovered > 0) return 'var(--color-warning-400)';
		if (summary.userRating && star <= summary.userRating) return 'var(--color-accent-400)';
		return 'var(--color-warning-400)';
	}
</script>

{#if !loading}
	<div class="flex flex-col gap-1">
		<div class="flex items-center gap-2 flex-wrap">
			<div class="flex items-center gap-0.5">
				{#each [1, 2, 3, 4, 5] as star}
					<button
						onclick={() => handleRate(star)}
						onmouseenter={() => { if (isInteractive) hovered = star; }}
						onmouseleave={() => { if (isInteractive) hovered = 0; }}
						disabled={!isInteractive || working}
						aria-label="Rate {star} star{star !== 1 ? 's' : ''}"
						style="padding: 2px; cursor: {isInteractive ? 'pointer' : 'default'};"
						class="transition-transform {isInteractive ? 'hover:scale-110' : ''}"
					>
						<svg width="16" height="16" viewBox="0 0 24 24"
						     fill={star <= fillUpTo ? 'currentColor' : 'none'}
						     stroke="currentColor" stroke-width="1.8"
						     stroke-linecap="round" stroke-linejoin="round"
						     style="color: {starColor(star)};">
							<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
						</svg>
					</button>
				{/each}
			</div>

			{#if showCount}
				{#if summary.count > 0}
					<span class="text-xs text-[var(--color-text-muted)]">
						{summary.average} · {summary.count} {summary.count === 1 ? 'rating' : 'ratings'}
					</span>
				{:else}
					<span class="text-xs text-[var(--color-text-muted)]">No ratings yet</span>
				{/if}
			{/if}

			{#if isInteractive && summary.userRating && !confirmRemove}
				<button
					onclick={() => (confirmRemove = true)}
					class="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-error-400)] transition-colors"
				>
					Remove
				</button>
			{:else if confirmRemove}
				<span class="text-xs text-[var(--color-text-secondary)]">Remove rating?</span>
				<button onclick={handleRemove} class="text-xs text-[var(--color-error-400)] hover:underline">Yes</button>
				<button onclick={() => (confirmRemove = false)} class="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]">No</button>
			{/if}
		</div>

		{#if summary.isOwner}
			<p class="text-xs text-[var(--color-text-muted)]">You can't rate your own content.</p>
		{/if}
	</div>
{/if}
