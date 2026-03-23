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
	let showDetails = $state(false);

	const DOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
	const TYPE_LABELS: Record<string, string> = { daily: 'Daily', weekly: 'Weekly', custom: 'Custom' };
	const pct = $derived(Math.round(stats.completionRate * 100));

	// Build a human-readable summary of the goal schedule
	const scheduleSummary = $derived.by(() => {
		if (goal.type === 'daily') return 'Every day';
		if (goal.type === 'weekly') {
			const days = (goal.targetDaysOfWeek ?? []).map((d) => DOW[d]).join(', ');
			return days ? `Every ${days}` : 'Weekly';
		}
		if (goal.type === 'custom') {
			const count = (goal.targetDays ?? []).length;
			return `${count} specific ${count === 1 ? 'date' : 'dates'}`;
		}
		return '';
	});
</script>

<div class="flex flex-col gap-3 rounded-xl border border-[var(--color-surface-700)]
            bg-[var(--color-surface-900)] p-4 {goal.isActive ? '' : 'opacity-60'}">
	<!-- Header -->
	<div class="flex items-start justify-between gap-3">
		<div class="flex flex-col gap-1 min-w-0 flex-1">
			<span class="text-sm font-medium text-[var(--color-text-primary)] truncate">{goal.title}</span>
			<div class="flex items-center gap-2">
				<span class="rounded px-1.5 py-0.5 text-xs font-medium"
				      style="background: color-mix(in srgb, var(--color-accent-500) 15%, transparent); color: var(--color-accent-400);">
					{TYPE_LABELS[goal.type]}
				</span>
				{#if !goal.isActive}
					<span class="text-xs text-[var(--color-text-muted)]">Inactive</span>
				{/if}
			</div>
		</div>

		<div class="flex shrink-0 items-center gap-1">
			<button onclick={() => onEdit(goal)} aria-label="Edit goal"
				class="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-text-muted)]
				       hover:bg-[var(--color-surface-800)] hover:text-[var(--color-text-primary)] transition-colors">
				<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
					<path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
					<path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
				</svg>
			</button>
			{#if !confirmDelete}
				<button onclick={() => (confirmDelete = true)} aria-label="Delete goal"
					class="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-text-muted)]
					       hover:bg-[var(--color-surface-800)] hover:text-[var(--color-error-400)] transition-colors">
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
			<span>{stats.completedDays} / {stats.totalTargetDays} days</span>
			<span class="font-medium text-[var(--color-text-secondary)]">{pct}%</span>
		</div>
		<div class="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-surface-700)]">
			<div class="h-full rounded-full bg-[var(--color-accent-500)] transition-all" style="width:{pct}%"></div>
		</div>
		<div class="flex gap-3 text-xs text-[var(--color-text-muted)]">
			{#if stats.missedDays > 0}
				<span class="text-[var(--color-error-400)]">{stats.missedDays} missed</span>
			{/if}
			{#if stats.pendingDays > 0}
				<span>{stats.pendingDays} remaining</span>
			{/if}
		</div>
	</div>

	<!-- Details panel -->
	{#if showDetails}
		<div class="flex flex-col gap-2 rounded-xl bg-[var(--color-surface-800)] px-4 py-3 text-xs">
			<div class="flex justify-between gap-2">
				<span class="text-[var(--color-text-muted)]">Schedule</span>
				<span class="text-[var(--color-text-secondary)]">{scheduleSummary}</span>
			</div>
			{#if goal.targetMinutes}
				<div class="flex justify-between gap-2">
					<span class="text-[var(--color-text-muted)]">Target</span>
					<span class="text-[var(--color-text-secondary)]">{goal.targetMinutes} min/session</span>
				</div>
			{/if}
			<div class="flex justify-between gap-2">
				<span class="text-[var(--color-text-muted)]">Started</span>
				<span class="text-[var(--color-text-secondary)]">{goal.startDate}</span>
			</div>
			{#if goal.endDate}
				<div class="flex justify-between gap-2">
					<span class="text-[var(--color-text-muted)]">Ends</span>
					<span class="text-[var(--color-text-secondary)]">{goal.endDate}</span>
				</div>
			{/if}
			{#if goal.type === 'custom' && (goal.targetDays ?? []).length > 0}
				<div class="flex flex-col gap-1">
					<span class="text-[var(--color-text-muted)]">Target dates</span>
					<div class="flex flex-wrap gap-1">
						{#each (goal.targetDays ?? []) as d}
							<span class="rounded bg-[var(--color-surface-700)] px-2 py-0.5 text-[var(--color-text-secondary)]">{d}</span>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Footer -->
	<div class="flex items-center justify-between gap-2">
		<div class="flex items-center gap-3">
			<button onclick={() => (showDetails = !showDetails)}
				class="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors">
				{showDetails ? 'Hide details' : 'Show details'}
			</button>
			<button onclick={() => onToggleActive(goal.id, !goal.isActive)}
				class="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors">
				{goal.isActive ? 'Deactivate' : 'Activate'}
			</button>
		</div>

		{#if confirmDelete}
			<div class="flex items-center gap-2">
				<span class="text-xs text-[var(--color-text-secondary)]">Delete?</span>
				<button onclick={() => { confirmDelete = false; onDelete(goal.id); }}
					class="rounded-lg bg-[var(--color-error-500)]/15 px-2.5 py-1 text-xs font-medium
					       text-[var(--color-error-400)] hover:bg-[var(--color-error-500)]/25 transition-colors">
					Yes
				</button>
				<button onclick={() => (confirmDelete = false)}
					class="rounded-lg border border-[var(--color-surface-600)] px-2.5 py-1 text-xs
					       text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
					Cancel
				</button>
			</div>
		{/if}
	</div>
</div>
