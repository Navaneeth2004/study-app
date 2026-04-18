<script lang="ts">
	import { unlockCreator } from '$lib/auth/authService';
	import { roleStore } from '$lib/shared/stores/roleStore';
	import PasswordInput from '$lib/shared/components/PasswordInput.svelte';
	import type { UnlockCreatorState } from '$lib/settings/settingsTypes';

	let password = $state('');
	let unlockState = $state<UnlockCreatorState>({ loading: false, error: '' });

	async function handleUnlock() {
		if (!password) { unlockState = { ...unlockState, error: 'Password is required.' }; return; }
		unlockState = { loading: true, error: '' };
		try {
			await unlockCreator(password);
			password = '';
			unlockState = { loading: false, error: '' };
		} catch (e) {
			unlockState = { loading: false, error: e instanceof Error ? e.message : 'Could not verify password.' };
		}
	}

	function handleSwitchToViewer() { roleStore.setViewer(); }
</script>

<section class="flex flex-col gap-4">
	<h2 class="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">Role</h2>

	{#if $roleStore === 'creator'}
		<div class="rounded-xl border border-[var(--color-surface-700)] bg-[var(--color-surface-900)] p-5">
			<div class="flex items-center justify-between gap-4">
				<div class="flex flex-col gap-1">
					<div class="flex items-center gap-2">
						<div class="h-2 w-2 rounded-full bg-[var(--color-success-500)]"></div>
						<span class="text-sm font-medium text-[var(--color-text-primary)]">Creator mode active</span>
					</div>
					<p class="text-sm text-[var(--color-text-secondary)]">You can create and manage study content.</p>
				</div>
				<span class="shrink-0 rounded-full bg-[var(--color-success-500)]/15 px-3 py-1 text-xs font-medium text-[var(--color-success-500)]">Creator</span>
			</div>
			<div class="mt-5 border-t border-[var(--color-surface-700)] pt-5">
				<button onclick={handleSwitchToViewer}
					class="rounded-lg border border-[var(--color-surface-600)] px-4 py-2 text-sm text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-surface-500)] hover:text-[var(--color-text-primary)]">
					Switch back to Viewer
				</button>
			</div>
		</div>
	{:else}
		<div class="rounded-xl border border-[var(--color-surface-700)] bg-[var(--color-surface-900)] p-5">
			<div class="flex items-center justify-between gap-4">
				<div class="flex flex-col gap-1">
					<span class="text-sm font-medium text-[var(--color-text-primary)]">Unlock Creator mode</span>
					<p class="text-sm text-[var(--color-text-secondary)]">Enter your password to enable content creation.</p>
				</div>
				<span class="shrink-0 rounded-full bg-[var(--color-surface-700)] px-3 py-1 text-xs font-medium text-[var(--color-text-secondary)]">Viewer</span>
			</div>
			<div class="mt-5 flex flex-col gap-3 border-t border-[var(--color-surface-700)] pt-5">
				<PasswordInput id="unlock-password" label="Your password" bind:value={password}
					placeholder="Enter your password" disabled={unlockState.loading} error={unlockState.error} />
				<button onclick={handleUnlock}
					disabled={unlockState.loading || !password.trim()}
					class="self-start rounded-xl bg-[var(--color-accent-500)] px-5 py-2.5 text-sm font-medium
					       text-white transition-all hover:bg-[var(--color-accent-400)]
					       disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]">
					{unlockState.loading ? 'Verifying…' : 'Unlock Creator mode'}
				</button>
			</div>
		</div>
	{/if}
</section>
