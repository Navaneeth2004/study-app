<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import {
		getNotifications, markAsRead, markAllAsRead, deleteNotification,
		type InAppNotification
	} from '$lib/notifications/inAppNotificationService';
	import { refreshNow } from '$lib/notifications/notificationPoller';
	import NotificationItem from '$lib/notifications/components/NotificationItem.svelte';

	let notifications = $state<InAppNotification[]>([]);
	let loading = $state(true);
	let tab = $state<'all' | 'unread'>('all');

	const filtered = $derived(tab === 'unread' ? notifications.filter((n) => !n.isRead) : notifications);
	const unreadCount = $derived(notifications.filter((n) => !n.isRead).length);

	onMount(async () => {
		await load();
		const handleFocus = () => load();
		window.addEventListener('focus', handleFocus);
		return () => window.removeEventListener('focus', handleFocus);
	});

	async function load() {
		loading = true;
		try { notifications = await getNotifications(); }
		catch { /* silent */ } finally { loading = false; }
	}

	async function handleRead(id: string) {
		await markAsRead(id);
		notifications = notifications.map((n) => n.id === id ? { ...n, isRead: true } : n);
		refreshNow();
	}

	async function handleDelete(id: string) {
		await deleteNotification(id);
		notifications = notifications.filter((n) => n.id !== id);
		refreshNow();
	}

	async function handleMarkAll() {
		await markAllAsRead();
		notifications = notifications.map((n) => ({ ...n, isRead: true }));
		refreshNow();
	}

	function handleNavigate(notification: InAppNotification) {
		if (!notification.relatedContentId || !notification.relatedContentType) return;
		if (notification.relatedContentType === 'textbook') {
			goto(`/viewer/textbooks/${notification.relatedContentId}`);
		} else if (notification.relatedContentType === 'flashcard_category') {
			goto(`/viewer/flashcards/category/${notification.relatedContentId}`);
		} else if (notification.relatedContentType === 'comment') {
			goto('/viewer');
		}
	}
</script>

<svelte:head><title>Notifications — StudyApp</title></svelte:head>

<div class="flex flex-col gap-6 max-w-2xl">
	<!-- Header -->
	<div class="flex items-center justify-between gap-4 flex-wrap">
		<div class="flex items-center gap-3">
			<h1 class="font-display text-3xl text-[var(--color-text-primary)]">Notifications</h1>
			{#if unreadCount > 0}
				<span class="flex items-center justify-center rounded-full bg-[var(--color-accent-500)] px-2 py-0.5 text-xs font-bold text-white min-w-[1.5rem]">
					{unreadCount}
				</span>
			{/if}
		</div>
		<!-- Mark all read button - always visible when there are notifications -->
		{#if notifications.length > 0}
			<button onclick={handleMarkAll} disabled={unreadCount === 0}
				class="flex items-center gap-1.5 rounded-xl border border-[var(--color-surface-600)] px-4 py-2 text-sm
				       text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]
				       disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
				<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<polyline points="20 6 9 17 4 12"/>
				</svg>
				Read all
			</button>
		{/if}
	</div>

	<!-- Tabs -->
	<div class="flex gap-1 border-b border-[var(--color-surface-700)]">
		{#each (['all', 'unread'] as const) as t}
			<button onclick={() => (tab = t)}
				class="px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors capitalize
				       {tab === t
					? 'border-[var(--color-accent-500)] text-[var(--color-accent-400)]'
					: 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'}">
				{t}
				{#if t === 'unread' && unreadCount > 0}
					<span class="ml-1.5 rounded-full bg-[var(--color-accent-500)]/20 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-accent-400)]">
						{unreadCount}
					</span>
				{/if}
			</button>
		{/each}
	</div>

	{#if loading}
		<div class="flex flex-col gap-2">
			{#each Array(4) as _}
				<div class="h-16 rounded-xl bg-[var(--color-surface-800)]"></div>
			{/each}
		</div>
	{:else if filtered.length === 0}
		<div class="flex flex-col items-center gap-3 py-16 text-center">
			<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor"
			     stroke-width="1.3" stroke-linecap="round" class="text-[var(--color-text-muted)]">
				<path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
				<path d="M13.73 21a2 2 0 01-3.46 0"/>
			</svg>
			<p class="text-sm text-[var(--color-text-muted)]">
				{tab === 'unread' ? 'No unread notifications.' : 'No notifications yet.'}
			</p>
		</div>
	{:else}
		<div class="flex flex-col gap-2">
			{#each filtered as notification (notification.id)}
				<NotificationItem
					{notification}
					onRead={handleRead}
					onDelete={handleDelete}
					onNavigate={handleNavigate}
				/>
			{/each}
		</div>
	{/if}
</div>
