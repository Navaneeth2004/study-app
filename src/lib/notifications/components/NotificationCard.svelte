<script lang="ts">
	import type { StudyNotification } from '$lib/notifications/notificationTypes';
	import { getIcon } from '$lib/notifications/notificationIcons';
	import { formatScheduleSummary, getNextFireTime, isOverdue, formatNextTime } from '$lib/notifications/notificationUtils';

	interface Props {
		notification: StudyNotification;
		onEdit: (n: StudyNotification) => void;
		onDelete: (id: string) => void;
		onToggle: (id: string, isActive: boolean) => void;
	}

	let { notification, onEdit, onDelete, onToggle }: Props = $props();

	let confirmDelete = $state(false);

	const icon = $derived(getIcon(notification.icon));
	const summary = $derived(formatScheduleSummary(notification));
	const nextTime = $derived(getNextFireTime(notification));
	const nextLabel = $derived.by(() => {
		if (!notification.isActive) return 'Inactive';
		if (isOverdue(notification)) return 'Completed';
		if (!nextTime) return notification.scheduleType === 'once' ? 'Completed' : '—';
		return `Next: ${formatNextTime(nextTime)}`;
	});
</script>

<div class="group flex items-start gap-3 rounded-xl border border-[var(--color-surface-700)]
            bg-[var(--color-surface-900)] px-4 py-3 transition-colors">
	<!-- Colour + icon -->
	<div class="shrink-0 flex h-10 w-10 items-center justify-center rounded-xl text-xl"
	     style="background: {notification.color}22; border: 1.5px solid {notification.color}55;">
		{icon.emoji}
	</div>

	<!-- Content -->
	<div class="flex-1 min-w-0">
		<div class="flex items-center gap-2 flex-wrap">
			<span class="text-sm font-medium text-[var(--color-text-primary)] truncate">{notification.title}</span>
			{#if !notification.isActive}
				<span class="rounded-full px-2 py-0.5 text-xs bg-[var(--color-surface-700)] text-[var(--color-text-muted)]">Off</span>
			{/if}
		</div>
		{#if notification.body}
			<p class="text-xs text-[var(--color-text-muted)] truncate">{notification.body}</p>
		{/if}
		<p class="text-xs text-[var(--color-text-secondary)] mt-0.5">{summary}</p>
		<p class="text-xs mt-0.5 {isOverdue(notification) && notification.scheduleType === 'once' ? 'text-[var(--color-text-muted)]' : 'text-[var(--color-accent-400)]'}">
			{nextLabel}
		</p>
	</div>

	<!-- Actions -->
	<div class="flex shrink-0 items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
		<!-- Toggle -->
		<button
			onclick={() => onToggle(notification.id, !notification.isActive)}
			aria-label="{notification.isActive ? 'Deactivate' : 'Activate'} notification"
			class="flex h-7 w-7 items-center justify-center rounded-lg transition-colors
			       {notification.isActive
				? 'text-[var(--color-success-500)] hover:bg-[var(--color-surface-800)]'
				: 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-800)] hover:text-[var(--color-success-500)]'}"
		>
			<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
				{#if notification.isActive}
					<path d="M18.36 6.64A9 9 0 1 1 5.64 19.36"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4"/>
				{:else}
					<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
				{/if}
			</svg>
		</button>

		<!-- Edit -->
		<button
			onclick={() => onEdit(notification)}
			aria-label="Edit notification"
			class="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-text-muted)]
			       hover:bg-[var(--color-surface-800)] hover:text-[var(--color-text-primary)] transition-colors"
		>
			<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
				<path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
				<path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
			</svg>
		</button>

		<!-- Delete -->
		{#if !confirmDelete}
			<button
				onclick={() => (confirmDelete = true)}
				aria-label="Delete notification"
				class="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-text-muted)]
				       hover:bg-[var(--color-surface-800)] hover:text-[var(--color-error-400)] transition-colors"
			>
				<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
					<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
				</svg>
			</button>
		{:else}
			<button onclick={() => { confirmDelete = false; onDelete(notification.id); }}
				class="rounded-lg bg-[var(--color-error-500)]/15 px-2 py-1 text-xs text-[var(--color-error-400)]
				       hover:bg-[var(--color-error-500)]/25 transition-colors">
				Delete
			</button>
			<button onclick={() => (confirmDelete = false)}
				class="rounded-lg border border-[var(--color-surface-600)] px-2 py-1 text-xs
				       text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
				Cancel
			</button>
		{/if}
	</div>
</div>
