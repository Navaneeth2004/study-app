<script lang="ts">
	import { onMount } from 'svelte';
	import { getReviewSettings, updateReviewSettings } from '$lib/review/reviewService';
	import type { ReviewSettings } from '$lib/review/reviewTypes';

	let settings = $state<ReviewSettings | null>(null);
	let saving = $state(false);
	let saved = $state(false);
	let error = $state('');

	let draftNewLimit = $state(20);
	let draftReviewLimit = $state(100);

	onMount(async () => {
		try {
			const s = await getReviewSettings();
			settings = s;
			draftNewLimit = s.dailyNewCardLimit;
			draftReviewLimit = s.dailyReviewLimit;
		} catch { /* silent */ }
	});

	const isDirty = $derived(
		settings !== null && (
			draftNewLimit !== settings.dailyNewCardLimit ||
			draftReviewLimit !== settings.dailyReviewLimit
		)
	);

	async function handleSave() {
		saving = true; error = ''; saved = false;
		try {
			settings = await updateReviewSettings({
				defaultAlgorithm: 'sm2',
				dailyNewCardLimit: Math.max(1, Math.min(50, draftNewLimit)),
				dailyReviewLimit: Math.max(10, Math.min(200, draftReviewLimit))
			});
			draftNewLimit = settings.dailyNewCardLimit;
			draftReviewLimit = settings.dailyReviewLimit;
			saved = true;
			setTimeout(() => (saved = false), 2000);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not save settings.';
		} finally { saving = false; }
	}
</script>

<section class="flex flex-col gap-4">
	<h2 class="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">Review Settings</h2>

	<div class="rounded-xl border border-[var(--color-surface-700)] bg-[var(--color-surface-900)] divide-y divide-[var(--color-surface-700)]">
		<!-- Daily new card limit -->
		<div class="flex items-center justify-between gap-4 px-5 py-4">
			<div class="flex flex-col gap-0.5">
				<span class="text-sm font-medium text-[var(--color-text-primary)]">Daily new cards</span>
				<span class="text-xs text-[var(--color-text-muted)]">Max new cards to introduce per day (1–50)</span>
			</div>
			<input
				type="number"
				bind:value={draftNewLimit}
				min={1}
				max={50}
				class="w-20 rounded-xl border border-[var(--color-surface-600)] bg-[var(--color-surface-800)]
				       px-3 py-2 text-sm text-[var(--color-text-primary)] text-right
				       focus:border-[var(--color-accent-500)] focus:outline-none transition-colors"
			/>
		</div>

		<!-- Daily review limit -->
		<div class="flex items-center justify-between gap-4 px-5 py-4">
			<div class="flex flex-col gap-0.5">
				<span class="text-sm font-medium text-[var(--color-text-primary)]">Daily review limit</span>
				<span class="text-xs text-[var(--color-text-muted)]">Max due cards to show per day (10–200)</span>
			</div>
			<input
				type="number"
				bind:value={draftReviewLimit}
				min={10}
				max={200}
				class="w-20 rounded-xl border border-[var(--color-surface-600)] bg-[var(--color-surface-800)]
				       px-3 py-2 text-sm text-[var(--color-text-primary)] text-right
				       focus:border-[var(--color-accent-500)] focus:outline-none transition-colors"
			/>
		</div>
	</div>

	{#if error}<p class="text-xs text-[var(--color-error-400)]">{error}</p>{/if}

	<button
		onclick={handleSave}
		disabled={saving || !isDirty}
		class="self-start rounded-xl bg-[var(--color-accent-500)] px-4 py-2 text-sm font-medium
		       text-white hover:bg-[var(--color-accent-400)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
	>
		{saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save'}
	</button>
</section>
