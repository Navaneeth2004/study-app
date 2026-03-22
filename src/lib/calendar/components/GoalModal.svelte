<script lang="ts">
	import type { StudyGoal, GoalType } from '$lib/calendar/calendarTypes';
	import type { GoalData } from '$lib/calendar/calendarService';
	import UnsavedChangesModal from '$lib/shared/components/UnsavedChangesModal.svelte';

	interface Props {
		goal?: StudyGoal | null;
		onSave: (data: GoalData) => Promise<void>;
		onClose: () => void;
	}

	let { goal = null, onSave, onClose }: Props = $props();

	const DOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

	let title = $state(goal?.title ?? '');
	let type = $state<GoalType>(goal?.type ?? 'daily');
	let targetMinutes = $state(goal?.targetMinutes ? String(goal.targetMinutes) : '');
	let daysOfWeek = $state<number[]>(goal?.targetDaysOfWeek ?? []);
	let customDates = $state<string[]>(goal?.targetDays ?? []);
	let customDateInput = $state('');
	let startDate = $state(goal?.startDate ?? new Date().toISOString().slice(0, 10));
	let hasEndDate = $state(!!goal?.endDate);
	let endDate = $state(goal?.endDate ?? '');
	let saving = $state(false);
	let error = $state('');
	let showUnsaved = $state(false);

	const isDirty = $derived(
		title !== (goal?.title ?? '') ||
		type !== (goal?.type ?? 'daily') ||
		targetMinutes !== (goal?.targetMinutes ? String(goal.targetMinutes) : '')
	);

	function toggleDow(d: number) {
		daysOfWeek = daysOfWeek.includes(d) ? daysOfWeek.filter((x) => x !== d) : [...daysOfWeek, d];
	}
	function addDate() {
		const d = customDateInput.trim();
		if (d && !customDates.includes(d)) customDates = [...customDates, d].sort();
		customDateInput = '';
	}
	function removeDate(d: string) { customDates = customDates.filter((x) => x !== d); }

	function attemptClose() {
		if (isDirty) { showUnsaved = true; } else { onClose(); }
	}

	async function handleSave() {
		if (!title.trim()) { error = 'Title is required.'; return; }
		if (type === 'weekly' && daysOfWeek.length === 0) { error = 'Select at least one day.'; return; }
		if (type === 'custom' && customDates.length === 0) { error = 'Add at least one target date.'; return; }
		saving = true; error = '';
		try {
			await onSave({
				title: title.trim(), type,
				targetDays: type === 'custom' ? customDates : null,
				targetDaysOfWeek: type === 'weekly' ? daysOfWeek : null,
				targetMinutes: targetMinutes ? parseInt(targetMinutes) : null,
				startDate, endDate: hasEndDate && endDate ? endDate : null
			});
			onClose();
		} catch (e) { error = e instanceof Error ? e.message : 'Could not save goal.'; }
		finally { saving = false; }
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div class="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/70" onclick={attemptClose}>
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-[var(--color-surface-700)]
	            bg-[var(--color-surface-950)] shadow-2xl"
	     onclick={(e) => e.stopPropagation()}>

		<div class="flex items-center justify-between border-b border-[var(--color-surface-700)] px-5 py-4">
			<span class="text-sm font-semibold text-[var(--color-text-primary)]">{goal ? 'Edit Goal' : 'New Goal'}</span>
			<button onclick={attemptClose} aria-label="Close"
				class="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-text-muted)]
				       hover:bg-[var(--color-surface-800)] hover:text-[var(--color-text-primary)] transition-colors">
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
					<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
				</svg>
			</button>
		</div>

		<div class="flex flex-col gap-4 p-5">
			<div class="flex flex-col gap-1.5">
				<label for="goal-title" class="text-xs font-medium text-[var(--color-text-secondary)]">Title</label>
				<input id="goal-title" type="text" bind:value={title} placeholder="e.g. Study 1 hour daily"
					class="w-full rounded-xl border border-[var(--color-surface-600)] bg-[var(--color-surface-800)]
					       px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]
					       focus:border-[var(--color-accent-500)] focus:outline-none transition-colors" />
			</div>

			<div class="flex flex-col gap-1.5">
				<span class="text-xs font-medium text-[var(--color-text-secondary)]">Type</span>
				<div class="flex gap-2">
					{#each (['daily', 'weekly', 'custom'] as GoalType[]) as t}
						<button onclick={() => (type = t)}
							class="rounded-lg border px-3 py-1.5 text-xs font-medium capitalize transition-colors
							       {type === t ? 'border-[var(--color-accent-500)] bg-[var(--color-accent-500)]/10 text-[var(--color-accent-400)]' : 'border-[var(--color-surface-600)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}">
							{t}
						</button>
					{/each}
				</div>
			</div>

			{#if type === 'daily' || type === 'weekly'}
				<div class="flex flex-col gap-1.5">
					<label for="goal-minutes" class="text-xs font-medium text-[var(--color-text-secondary)]">Target minutes (optional)</label>
					<input id="goal-minutes" type="number" bind:value={targetMinutes} min={1} placeholder="e.g. 60"
						class="w-28 rounded-xl border border-[var(--color-surface-600)] bg-[var(--color-surface-800)]
						       px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]
						       focus:border-[var(--color-accent-500)] focus:outline-none transition-colors" />
				</div>
			{/if}

			{#if type === 'weekly'}
				<div class="flex flex-col gap-1.5">
					<span class="text-xs font-medium text-[var(--color-text-secondary)]">Days of the week</span>
					<div class="flex flex-wrap gap-2">
						{#each DOW as label, i}
							<button onclick={() => toggleDow(i)}
								class="rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors
								       {daysOfWeek.includes(i) ? 'border-[var(--color-accent-500)] bg-[var(--color-accent-500)]/10 text-[var(--color-accent-400)]' : 'border-[var(--color-surface-600)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}">
								{label}
							</button>
						{/each}
					</div>
				</div>
			{/if}

			{#if type === 'custom'}
				<div class="flex flex-col gap-2">
					<label for="goal-custom-date" class="text-xs font-medium text-[var(--color-text-secondary)]">Target dates</label>
					<div class="flex gap-2">
						<input id="goal-custom-date" type="date" bind:value={customDateInput}
							class="rounded-xl border border-[var(--color-surface-600)] bg-[var(--color-surface-800)]
							       px-3 py-2 text-sm text-[var(--color-text-primary)]
							       focus:border-[var(--color-accent-500)] focus:outline-none transition-colors" />
						<button onclick={addDate} disabled={!customDateInput}
							class="rounded-xl border border-[var(--color-surface-600)] px-3 py-2 text-sm
							       text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] disabled:opacity-40 transition-colors">
							Add
						</button>
					</div>
					{#if customDates.length > 0}
						<div class="flex flex-wrap gap-1.5">
							{#each customDates as d}
								<span class="flex items-center gap-1 rounded-lg bg-[var(--color-surface-800)] border border-[var(--color-surface-600)] px-2 py-1 text-xs text-[var(--color-text-secondary)]">
									{d}
									<button onclick={() => removeDate(d)} aria-label="Remove {d}"
										class="text-[var(--color-text-muted)] hover:text-[var(--color-error-400)] transition-colors">
										<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
											<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
										</svg>
									</button>
								</span>
							{/each}
						</div>
					{/if}
				</div>
			{/if}

			<div class="flex gap-4 flex-wrap">
				<div class="flex flex-col gap-1.5">
					<label for="goal-start" class="text-xs font-medium text-[var(--color-text-secondary)]">Start date</label>
					<input id="goal-start" type="date" bind:value={startDate}
						class="rounded-xl border border-[var(--color-surface-600)] bg-[var(--color-surface-800)]
						       px-3 py-2 text-sm text-[var(--color-text-primary)]
						       focus:border-[var(--color-accent-500)] focus:outline-none transition-colors" />
				</div>
				<div class="flex flex-col gap-1.5">
					<label class="flex items-center gap-2 text-xs font-medium text-[var(--color-text-secondary)] cursor-pointer">
						<input type="checkbox" bind:checked={hasEndDate} class="accent-[var(--color-accent-500)]" />
						End date
					</label>
					{#if hasEndDate}
						<input type="date" bind:value={endDate}
							class="rounded-xl border border-[var(--color-surface-600)] bg-[var(--color-surface-800)]
							       px-3 py-2 text-sm text-[var(--color-text-primary)]
							       focus:border-[var(--color-accent-500)] focus:outline-none transition-colors" />
					{/if}
				</div>
			</div>

			{#if error}<p class="text-xs text-[var(--color-error-400)]">{error}</p>{/if}

			<div class="flex gap-3 pt-1">
				<button onclick={handleSave} disabled={saving || !title.trim()}
					class="rounded-xl bg-[var(--color-accent-500)] px-4 py-2 text-sm font-medium text-white
					       hover:bg-[var(--color-accent-400)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
					{saving ? 'Saving…' : 'Save'}
				</button>
				<button onclick={attemptClose}
					class="rounded-xl border border-[var(--color-surface-600)] px-4 py-2 text-sm
					       text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
					Cancel
				</button>
			</div>
		</div>
	</div>
</div>

<UnsavedChangesModal
	isOpen={showUnsaved}
	{saving}
	onSave={handleSave}
	onLeave={() => { showUnsaved = false; onClose(); }}
	onStay={() => (showUnsaved = false)}
/>
