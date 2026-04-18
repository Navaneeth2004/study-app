import { writable } from 'svelte/store';
import type { PlayerTrack } from './audioTypes';

export const playerTrackStore = writable<PlayerTrack | null>(null);

export function playTrack(track: PlayerTrack): void {
	playerTrackStore.set(track);
}

export function closeTrack(): void {
	playerTrackStore.set(null);
}
