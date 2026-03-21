<script lang="ts">
	import type { StudyGoal, GoalStats } from '$lib/calendar/calendarTypes';

	interface Props {
		goal: StudyGoal;
		stats: GoalStats;
		onEdit: (goal: StudyGoal) => void;
		onDelete: (id: string) => void;
		onToggleActive: (id: string, isActive: boolean) => void;
	}

	let { goal, stats, onEdit, onDelete, onToggleActive }: Props = $props();

	let confirmDelete = $state(false);
	let expanded = $state(false);

	const TYPE_LABELS: Record<string, string> = { daily: 'Daily', weekly: 'Weekly', custom: 'Custom' };
	const pct = $derived(Math.round(stats.completionRate * 100));

	function formatDateLabel(dateStr: string): string {
		const d = new Date(dateStr + 'T00:00:00');
		return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
	}
</script>

<div class="flex flex-col gap-3 rounded-xl border border-[var(--color-surface-700)]
            bg-[var(--color-surface-900)] p-4 {goal.isActive ? '' : 'opacity-60'}">

	<!-- Header -->
	<div class="flex items-start justify-between gap-3">
		<div class="flex flex-col gap-1 min-w-0 flex-1">
			<span class="text-sm font-medium text-[var(--color-text-primary)] truncate">{goal.title}</span>
			<div class="flex items-center gap-2 flex-wrap">
				<span class="rounded px-1.5 py-0.5 text-xs font-medium"
				      style="background: color-mix(in srgb, var(--color-accent-500) 15%, transparent); color: var(--color-accent-400);">
					{TYPE_LABELS[goal.type]}
				</span>
				{#if goal.targetMinutes}
					<span class="text-xs text-[var(--color-text-muted)]">≥ {goal.targetMinutes} min/day</span>
				{/if}
				{#if !goal.isActive}
					<span class="text-xs text-[var(--color-text-muted)]">Inactive</span>
				{/if}
			</div>
		</div>

		<div class="flex shrink-0 items-center gap-1">
			<button
				onclick={() => onEdit(goal)}
				class="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-text-muted)]
				       hover:bg-[var(--color-surface-800)] hover:text-[var(--color-text-primary)] transition-colors"
				aria-label="Edit goal"
			>
				<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
					<path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
					<path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
				</svg>
			</button>
			{#if !confirmDelete}
				<button
					onclick={() => (confirmDelete = true)}
					class="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-text-muted)]
					       hover:bg-[var(--color-surface-800)] hover:text-[var(--color-error-400)] transition-colors"
					aria-label="Delete goal"
				>
					<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
						<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
						<path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
					</svg>
				</button>
			{/if}
		</div>
	</div>

	<!-- Progress bar -->
	<div class="flex flex-col gap-1">
		<div class="flex items-center justify-between text-xs text-[var(--color-text-muted)]">
			<span>
				{stats.completedDays} / {stats.totalTargetDays} days
				{#if stats.pendingDays > 0}
					<span class="text-[var(--color-text-muted)]">({stats.pendingDays} remaining)</span>
				{/if}
			</span>
			<span class="font-medium text-[var(--color-text-secondary)]">{pct}%</span>
		</div>
		<div class="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-surface-700)]">
			<div class="h-full rounded-full transition-all"
			     style="width: {pct}%; background: {pct >= 80 ? 'var(--color-success-500)' : pct >= 50 ? 'var(--color-accent-500)' : 'var(--color-warning-500)'};">
			</div>
		</div>
		<div class="flex gap-3 text-xs">
			{#if stats.completedDays > 0}
				<span class="text-[var(--color-success-500)]">✓ {stats.completedDays} done</span>
			{/if}
			{#if stats.missedDays > 0}
				<span class="text-[var(--color-error-400)]">✗ {stats.missedDays} missed</span>
			{/if}
		</div>
	</div>

	<!-- Expand/collapse detail -->
	{#if stats.completedDays > 0 || stats.missedDays > 0}
		<button
			onclick={() => (expanded = !expanded)}
			class="flex items-center gap-1.5 self-start text-xs text-[var(--color-text-muted)]
			       hover:text-[var(--color-text-secondary)] transition-colors"
		>
			<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
				{#if expanded}
					<polyline points="18 15 12 9 6 15"/>
				{:else}
					<polyline points="6 9 12 15 18 9"/>
				{/if}
			</svg>
			{expanded ? 'Hide details' : 'Show details'}
		</button>

		{#if expanded}
			<div class="flex flex-col gap-3 rounded-xl border border-[var(--color-surface-700)] bg-[var(--color-surface-800)] p-3">
				{#if stats.completedDates.length > 0}
					<div class="flex flex-col gap-1.5">
						<span class="text-xs font-semibold text-[var(--color-success-500)]">
							✓ Completed ({stats.completedDates.length})
						</span>
						<div class="flex flex-col gap-1 max-h-32 overflow-y-auto">
							{#each stats.completedDates as date}
								<span class="text-xs text-[var(--color-text-secondary)]">{formatDateLabel(date)}</span>
							{/each}
						</div>
					</div>
				{/if}

				{#if stats.missedDates.length > 0}
					<div class="flex flex-col gap-1.5">
						<span class="text-xs font-semibold text-[var(--color-error-400)]">
							✗ Missed ({stats.missedDates.length})
						</span>
						<div class="flex flex-col gap-1 max-h-32 overflow-y-auto">
							{#each stats.missedDates as date}
								<span class="text-xs text-[var(--color-text-secondary)]">{formatDateLabel(date)}</span>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		{/if}
	{/if}

	<!-- Footer -->
	<div class="flex items-center justify-between gap-2">
		<button
			onclick={() => onToggleActive(goal.id, !goal.isActive)}
			class="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
		>
			{goal.isActive ? 'Deactivate' : 'Activate'}
		</button>

		{#if confirmDelete}
			<div class="flex items-center gap-2">
				<span class="text-xs text-[var(--color-text-secondary)]">Delete this goal?</span>
				<button
					onclick={() => { confirmDelete = false; onDelete(goal.id); }}
					class="rounded-lg bg-[var(--color-error-500)]/15 px-2.5 py-1 text-xs font-medium
					       text-[var(--color-error-400)] hover:bg-[var(--color-error-500)]/25 transition-colors"
				>Yes</button>
				<button
					onclick={() => (confirmDelete = false)}
					class="rounded-lg border border-[var(--color-surface-600)] px-2.5 py-1 text-xs
					       text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
				>Cancel</button>
			</div>
		{/if}
	</div>
</div>
