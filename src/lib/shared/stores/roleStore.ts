import { writable } from 'svelte/store';
import type { Role } from '$lib/shared/types/roleTypes';

function createRoleStore() {
	const { subscribe, set, update } = writable<Role>('viewer');

	return {
		subscribe,
		setViewer: () => set('viewer'),
		setCreator: () => set('creator'),
		reset: () => set('viewer')
	};
}

export const roleStore = createRoleStore();