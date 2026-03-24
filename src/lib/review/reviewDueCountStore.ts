import { writable } from 'svelte/store';
import { getDueCount } from './reviewService';

export const reviewDueCountStore = writable<number>(0);

let pollInterval: ReturnType<typeof setInterval> | null = null;

export async function refreshReviewCount(): Promise<void> {
	try {
		const count = await getDueCount();
		reviewDueCountStore.set(count);
	} catch { /* silent */ }
}

export function startReviewPolling(): void {
	refreshReviewCount();
	if (pollInterval) clearInterval(pollInterval);
	pollInterval = setInterval(refreshReviewCount, 60000); // every minute
}

export function stopReviewPolling(): void {
	if (pollInterval) {
		clearInterval(pollInterval);
		pollInterval = null;
	}
}
