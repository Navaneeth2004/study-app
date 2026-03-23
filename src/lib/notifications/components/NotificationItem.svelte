<script lang="ts">
	import type { InAppNotification } from '$lib/notifications/inAppNotificationService';

	interface Props {
		notification: InAppNotification;
		onRead: (id: string) => void;
		onDelete: (id: string) => void;
		onNavigate: (notification: InAppNotification) => void;
	}

	let { notification, onRead, onDelete, onNavigate }: Props = $props();

	function timeAgo(iso: string): string {
		const diff = Date.now() - new Date(iso).getTime();
		const mins = Math.floor(diff / 60000);
		if (mins < 1) return 'just now';
		if (mins < 60) return `${mins}m ago`;
		const hrs = Math.floor(mins / 60);
		if (hrs < 24) return `${hrs}h ago`;
		const days = Math.floor(hrs / 24);
		if (days < 7) return `${days}d ago`;
		return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
	}

	function handleClick() {
		if (!notification.isRead) onRead(notification.id);
		onNavigate(notification);
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div
	onclick={handleClick}
	class="group relative flex items-start gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-colors
	       {notification.isRead
		? 'border-[var(--color-surface-700)] bg-[var(--color-surface-900)] hover:border-[var(--color-surface-600)]'
		: 'border-[var(--color-accent-500)]/30 bg-[var(--color-accent-500)]/5 hover:bg-[var(--color-accent-500)]/8'}"
>
	<!-- Unread dot -->
	{#if !notification.isRead}
		<div class="absolute left-1.5 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-[var(--color-accent-500)]"></div>
	{/if}

	<!-- Content -->
	<div class="flex-1 min-w-0 pl-1">
		<p class="text-sm {notification.isRead ? 'text-[var(--color-text-secondary)]' : 'text-[var(--color-text-primary)] font-medium'}">
			{notification.title}
		</p>
		{#if notification.body}
			<p class="text-xs text-[var(--color-text-muted)] mt-0.5">{notification.body}</p>
		{/if}
		<p class="text-xs text-[var(--color-text-muted)] mt-1">{timeAgo(notification.created)}</p>
	</div>

	<!-- Delete -->
	<button
		onclick={(e) => { e.stopPropagation(); onDelete(notification.id); }}
		class="shrink-0 flex h-6 w-6 items-center justify-center rounded-lg
		       text-[var(--color-text-muted)] hover:text-[var(--color-error-400)]
		       opacity-0 group-hover:opacity-100 transition-all"
		aria-label="Delete notification"
	>
		<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
			<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
		</svg>
	</button>
</div>
