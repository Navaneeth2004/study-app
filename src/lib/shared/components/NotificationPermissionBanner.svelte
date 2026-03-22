<script lang="ts">
	import { onMount } from 'svelte';
	import { getPermissionStatus, requestPermission } from '$lib/notifications/notificationService';
	import type { NotificationPermissionStatus } from '$lib/notifications/notificationTypes';

	let status = $state<NotificationPermissionStatus | 'dismissed'>('default');
	let message = $state('');

	onMount(() => {
		const dismissed = sessionStorage.getItem('notif-banner-dismissed');
		if (dismissed) { status = 'dismissed'; return; }
		status = getPermissionStatus();
	});

	async function handleEnable() {
		const result = await requestPermission();
		if (result === 'granted') {
			message = 'Notifications enabled!';
			status = 'granted';
		} else if (result === 'denied') {
			message = 'You can enable notifications in your browser settings.';
			status = 'denied';
		}
	}

	function handleDismiss() {
		sessionStorage.setItem('notif-banner-dismissed', '1');
		status = 'dismissed';
	}
</script>

{#if status === 'default'}
	<div class="flex items-center gap-3 border-b border-[var(--color-surface-700)]
	            bg-[var(--color-surface-900)] px-4 py-2.5">
		<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
		     stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"
		     class="shrink-0 text-[var(--color-accent-400)]">
			<path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
			<path d="M13.73 21a2 2 0 01-3.46 0"/>
		</svg>
		<p class="flex-1 text-xs text-[var(--color-text-secondary)]">
			Enable notifications to get study reminders
		</p>
		<button
			onclick={handleEnable}
			class="shrink-0 rounded-lg bg-[var(--color-accent-500)] px-3 py-1 text-xs font-medium
			       text-white hover:bg-[var(--color-accent-400)] transition-colors"
		>
			Enable
		</button>
		<button
			onclick={handleDismiss}
			aria-label="Dismiss notification banner"
			class="shrink-0 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
		>
			Not now
		</button>
	</div>
{:else if message}
	<div class="border-b border-[var(--color-surface-700)] bg-[var(--color-surface-900)] px-4 py-2">
		<p class="text-xs {status === 'granted' ? 'text-[var(--color-success-500)]' : 'text-[var(--color-text-muted)]'}">{message}</p>
	</div>
{/if}
