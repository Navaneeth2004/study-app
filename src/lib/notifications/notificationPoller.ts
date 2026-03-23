import { writable } from 'svelte/store';
import { getUnreadCount } from './inAppNotificationService';

export const unreadCountStore = writable<number>(0);

let pollInterval: ReturnType<typeof setInterval> | null = null;

export async function refreshNow(): Promise<void> {
	try {
		const count = await getUnreadCount();
		unreadCountStore.set(count);
	} catch { /* silent */ }
}

export function startPolling(): void {
	refreshNow();
	if (pollInterval) clearInterval(pollInterval);
	pollInterval = setInterval(refreshNow, 30000);
}

export function stopPolling(): void {
	if (pollInterval) {
		clearInterval(pollInterval);
		pollInterval = null;
	}
}
