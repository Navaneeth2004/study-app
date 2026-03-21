<script lang="ts">
	import type { CalendarDay, MoodRating } from '$lib/calendar/calendarTypes';

	export interface SaveData {
		description: string;
		mood: MoodRating | null;
		duration: number | null;
	}

	interface Props {
		day: CalendarDay;
		saving?: boolean;
		onSave: (data: SaveData) => Promise<void>;
		onDelete: () => Promise<void>;
		onClose: () => void;
		onDirtyChange?: (dirty: boolean) => void;
	}

	let { day, saving = false, onSave, onDelete, onClose, onDirtyChange }: Props = $props();

	const MOODS: { value: MoodRating; emoji: string; label: string }[] = [
		{ value: 1, emoji: '😔', label: 'Rough' },
		{ value: 2, emoji: '😐', label: 'Okay' },
		{ value: 3, emoji: '🙂', label: 'Good' },
		{ value: 4, emoji: '😊', label: 'Great' },
		{ value: 5, emoji: '🤩', label: 'Amazing' }
	];

	let isMarked = $state(day.log !== null);
	let description = $state(day.log?.description ?? '');
	let mood = $state<MoodRating | null>(day.log?.mood ?? null);
	let duration = $state<number | null>(day.log?.duration ?? null);
	let confirmDelete = $state(false);
	let error = $state('');

	const originalDescription = day.log?.description ?? '';
	const originalMood = day.log?.mood ?? null;
	const originalDuration = day.log?.duration ?? null;
	const originalMarked = day.log !== null;

	$effect(() => {
		const dirty =
			isMarked !== originalMarked ||
			description !== originalDescription ||
			mood !== originalMood ||
			duration !== originalDuration;
		onDirtyChange?.(dirty);
	});

	const dateLabel = $derived.by(() => {
		const dt = new Date(day.date + 'T00:00:00');
		return dt.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
	});

	async function handleSave() {
		error = '';
		try {
			await onSave({ description, mood, duration });
			onClose(); // close modal after successful save
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not save.';
		}
	}

	async function handleDelete() {
		error = '';
		try {
			await onDelete();
			onClose(); // close modal after successful delete
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not delete.';
		}
	}
</script>

<div class="flex flex-col gap-4">
	<div class="flex flex-col gap-0.5">
		<span class="text-base font-semibold text-[var(--color-text-primary)]">{dateLabel}</span>
		{#if day.isToday}
			<span class="text-xs text-[var(--color-accent-400)]">Today</span>
		{/if}
	</div>

	{#if day.isFuture}
		<p class="text-sm text-[var(--color-text-muted)]">You can't log future dates.</p>

	{:else if !isMarked}
		<button
			onclick={() => (isMarked = true)}
			class="flex items-center gap-2 self-start rounded-xl bg-[var(--color-accent-500)] px-4 py-2
			       text-sm font-medium text-white hover:bg-[var(--color-accent-400)] transition-colors"
		>
			<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
				<polyline points="20 6 9 17 4 12"/>
			</svg>
			Mark as studied
		</button>

	{:else}
		<div class="flex items-center gap-2">
			<span class="flex items-center gap-1.5 text-sm font-medium text-[var(--color-success-500)]">
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
					<polyline points="20 6 9 17 4 12"/>
				</svg>
				Studied
			</span>
			{#if !day.log}
				<button
					onclick={() => (isMarked = false)}
					class="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
				>
					Undo
				</button>
			{/if}
		</div>

		<div class="flex flex-col gap-3">
			<div class="flex flex-col gap-1.5">
				<label for="log-desc" class="text-xs font-medium text-[var(--color-text-secondary)]">What did you study?</label>
				<textarea
					id="log-desc"
					bind:value={description}
					rows={2}
					placeholder="e.g. Chapter 3 of calculus, flashcard review…"
					class="w-full resize-none rounded-xl border border-[var(--color-surface-600)]
					       bg-[var(--color-surface-800)] px-3 py-2 text-sm
					       text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]
					       focus:border-[var(--color-accent-500)] focus:outline-none transition-colors"
				></textarea>
			</div>

			<div class="flex flex-col gap-1.5">
				<label for="log-duration" class="text-xs font-medium text-[var(--color-text-secondary)]">Duration (minutes)</label>
				<input
					id="log-duration"
					type="number"
					bind:value={duration}
					min={1}
					max={600}
					placeholder="e.g. 45"
					class="w-28 rounded-xl border border-[var(--color-surface-600)]
					       bg-[var(--color-surface-800)] px-3 py-2 text-sm
					       text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]
					       focus:border-[var(--color-accent-500)] focus:outline-none transition-colors"
				/>
			</div>

			<div class="flex flex-col gap-1.5">
				<span class="text-xs font-medium text-[var(--color-text-secondary)]">How was the session?</span>
				<div class="flex gap-2">
					{#each MOODS as m}
						<button
							onclick={() => (mood = mood === m.value ? null : m.value)}
							title={m.label}
							class="flex h-9 w-9 items-center justify-center rounded-lg border text-base transition-colors
							       {mood === m.value
								? 'border-[var(--color-accent-500)] bg-[var(--color-accent-500)]/15'
								: 'border-[var(--color-surface-600)] hover:border-[var(--color-surface-500)]'}"
						>
							{m.emoji}
						</button>
					{/each}
				</div>
			</div>

			{#if error}
				<p class="text-xs text-[var(--color-error-400)]">{error}</p>
			{/if}

			<div class="flex items-center gap-2">
				<button
					onclick={handleSave}
					disabled={saving}
					class="rounded-xl bg-[var(--color-accent-500)] px-4 py-2 text-sm font-medium
					       text-white hover:bg-[var(--color-accent-400)]
					       disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
				>
					{saving ? 'Saving…' : 'Save'}
				</button>

				{#if day.log}
					{#if !confirmDelete}
						<button
							onclick={() => (confirmDelete = true)}
							class="rounded-xl border border-[var(--color-surface-600)] px-4 py-2 text-sm
							       text-[var(--color-text-secondary)] hover:text-[var(--color-error-400)] transition-colors"
						>
							Delete log
						</button>
					{:else}
						<button
							onclick={handleDelete}
							disabled={saving}
							class="rounded-xl bg-[var(--color-error-500)]/15 px-3 py-2 text-sm
							       text-[var(--color-error-400)] hover:bg-[var(--color-error-500)]/25 transition-colors"
						>
							Confirm delete
						</button>
						<button
							onclick={() => (confirmDelete = false)}
							class="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
						>
							Cancel
						</button>
					{/if}
				{/if}
			</div>
		</div>
	{/if}
</div>
