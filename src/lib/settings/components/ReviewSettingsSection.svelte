<script lang="ts">
	import { onMount } from 'svelte';
	import { getReviewSettings, updateReviewSettings } from '$lib/review/reviewService';
	import { pb } from '$lib/shared/pocketbase';
	import { refreshReviewCount } from '$lib/review/reviewDueCountStore';
	import type { ReviewSettings } from '$lib/review/reviewTypes';

	let settings = $state<ReviewSettings | null>(null);
	let saving = $state(false);
	let saved = $state(false);
	let error = $state('');
	let draftNewLimit = $state(20);
	let draftReviewLimit = $state(100);
	let showResetConfirm = $state(false);
	let resetting = $state(false);
	let resetDone = $state(false);

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

	async function handleResetAll() {
		resetting = true; error = '';
		try {
			const uid = pb.authStore.record?.id ?? '';
			const [schedules, reviews] = await Promise.all([
				pb.collection('card_schedules').getFullList({ requestKey: null, filter: `user = "${uid}"`, fields: 'id' }),
				pb.collection('card_reviews').getFullList({ requestKey: null, filter: `user = "${uid}"`, fields: 'id' })
			]);
			await Promise.all([
				...schedules.map((r) => pb.collection('card_schedules').delete(r.id as string, { requestKey: null })),
				...reviews.map((r) => pb.collection('card_reviews').delete(r.id as string, { requestKey: null }))
			]);
			settings = await updateReviewSettings({ defaultAlgorithm: 'sm2', dailyNewCardLimit: 20, dailyReviewLimit: 100 });
			draftNewLimit = settings.dailyNewCardLimit;
			draftReviewLimit = settings.dailyReviewLimit;
			showResetConfirm = false;
			resetDone = true;
			// Immediately clear the sidebar badge
			await refreshReviewCount();
			setTimeout(() => (resetDone = false), 3000);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not reset. Try again.';
		} finally { resetting = false; }
	}
</script>

<section class="flex flex-col gap-4">
	<h2 class="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">Review Settings</h2>

	<div class="rounded-xl border border-[var(--color-surface-700)] bg-[var(--color-surface-900)] divide-y divide-[var(--color-surface-700)]">
		<div class="flex items-center justify-between gap-4 px-5 py-4">
			<div class="flex flex-col gap-0.5">
				<span class="text-sm font-medium text-[var(--color-text-primary)]">Daily new cards</span>
				<span class="text-xs text-[var(--color-text-muted)]">Max new cards to introduce per day (1–50)</span>
			</div>
			<input type="number" bind:value={draftNewLimit} min={1} max={50}
				class="w-20 rounded-xl border border-[var(--color-surface-600)] bg-[var(--color-surface-800)]
				       px-3 py-2 text-sm text-[var(--color-text-primary)] text-right
				       focus:border-[var(--color-accent-500)] focus:outline-none transition-colors" />
		</div>
		<div class="flex items-center justify-between gap-4 px-5 py-4">
			<div class="flex flex-col gap-0.5">
				<span class="text-sm font-medium text-[var(--color-text-primary)]">Daily review limit</span>
				<span class="text-xs text-[var(--color-text-muted)]">Max due cards to show per day (10–200)</span>
			</div>
			<input type="number" bind:value={draftReviewLimit} min={10} max={200}
				class="w-20 rounded-xl border border-[var(--color-surface-600)] bg-[var(--color-surface-800)]
				       px-3 py-2 text-sm text-[var(--color-text-primary)] text-right
				       focus:border-[var(--color-accent-500)] focus:outline-none transition-colors" />
		</div>
	</div>

	{#if error}<p class="text-xs text-[var(--color-error-400)]">{error}</p>{/if}

	<div class="flex items-center gap-3 flex-wrap">
		<button onclick={handleSave} disabled={saving || !isDirty}
			class="self-start rounded-xl bg-[var(--color-accent-500)] px-4 py-2 text-sm font-medium
			       text-white hover:bg-[var(--color-accent-400)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
			{saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save'}
		</button>
		<button onclick={() => (showResetConfirm = true)}
			class="self-start rounded-xl border border-[var(--color-error-500)]/40 px-4 py-2 text-sm
			       text-[var(--color-error-400)] hover:bg-[var(--color-error-500)]/10 transition-colors">
			Reset all progress
		</button>
	</div>

	{#if resetDone}
		<p class="text-sm text-[var(--color-success-500)]">✓ All review progress reset. Cards are fresh again.</p>
	{/if}

	{#if showResetConfirm}
		<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
		<div class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background:rgba(0,0,0,0.7);"
		     onclick={() => !resetting && (showResetConfirm = false)}>
			<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
			<div class="w-full max-w-sm flex flex-col gap-5 rounded-2xl border border-[var(--color-error-500)]/40
			            bg-[var(--color-surface-900)] p-6 shadow-2xl"
			     onclick={(e) => e.stopPropagation()}>
				<div class="flex flex-col gap-2">
					<div class="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-error-500)]/15">
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" class="text-[var(--color-error-400)]">
							<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
							<line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
						</svg>
					</div>
					<h2 class="text-base font-semibold text-[var(--color-text-primary)]">Reset all review progress?</h2>
					<p class="text-sm text-[var(--color-text-secondary)]">
						This permanently deletes all card schedules, review history, and streaks.
						All cards start fresh. <strong class="text-[var(--color-text-primary)]">Cannot be undone.</strong>
					</p>
				</div>
				<div class="flex flex-col gap-2">
					<button onclick={handleResetAll} disabled={resetting}
						class="w-full rounded-xl bg-[var(--color-error-500)] px-4 py-2.5 text-sm font-medium text-white
						       hover:bg-[var(--color-error-400)] disabled:opacity-50 transition-colors">
						{resetting ? 'Resetting…' : 'Yes, reset everything'}
					</button>
					<button onclick={() => (showResetConfirm = false)} disabled={resetting}
						class="w-full rounded-xl border border-[var(--color-surface-600)] px-4 py-2.5 text-sm
						       text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] disabled:opacity-50 transition-colors">
						Cancel
					</button>
				</div>
			</div>
		</div>
	{/if}
</section>
