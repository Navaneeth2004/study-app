<script lang="ts">
	import { onMount } from 'svelte';
	import { setKey, clearKey, hasKey, getKey } from '$lib/settings/aiKeyStore';
	import { verifyPassword } from '$lib/auth/authService';
	import type { AIProvider } from '$lib/ai/aiTypes';

	const PROVIDERS: { id: AIProvider; label: string }[] = [
		{ id: 'openai', label: 'OpenAI' },
		{ id: 'anthropic', label: 'Anthropic (Claude)' },
		{ id: 'gemini', label: 'Google (Gemini)' },
		{ id: 'groq', label: 'Groq' }
	];

	let drafts = $state<Record<AIProvider, string>>({
		openai: '', anthropic: '', gemini: '', groq: ''
	});
	let saved = $state<Record<AIProvider, boolean>>({
		openai: false, anthropic: false, gemini: false, groq: false
	});

	// View key password gate
	let viewingProvider = $state<AIProvider | null>(null);
	let viewPassword = $state('');
	let viewError = $state('');
	let viewVerifying = $state(false);
	let revealedKey = $state('');

	onMount(() => {
		saved = {
			openai: hasKey('openai'),
			anthropic: hasKey('anthropic'),
			gemini: hasKey('gemini'),
			groq: hasKey('groq')
		};
	});

	function handleSave(id: AIProvider) {
		const key = drafts[id].trim();
		if (!key) return;
		setKey(id, key);
		saved[id] = true;
		drafts[id] = '';
	}

	function handleClear(id: AIProvider) {
		clearKey(id);
		saved[id] = false;
	}

	function openViewModal(id: AIProvider) {
		viewingProvider = id;
		viewPassword = '';
		viewError = '';
		revealedKey = '';
	}

	function closeViewModal() {
		viewingProvider = null;
		viewPassword = '';
		viewError = '';
		revealedKey = '';
	}

	async function handleViewConfirm() {
		if (!viewingProvider || !viewPassword.trim()) return;
		viewVerifying = true;
		viewError = '';
		try {
			const ok = await verifyPassword(viewPassword);
			if (!ok) {
				viewError = 'Incorrect password.';
				return;
			}
			revealedKey = getKey(viewingProvider);
		} catch {
			viewError = 'Could not verify password.';
		} finally {
			viewVerifying = false;
		}
	}
</script>

<!-- View key modal -->
{#if viewingProvider}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4"
		style="background: rgba(0,0,0,0.75);"
		role="dialog"
		aria-modal="true"
	>
		<div class="flex w-full max-w-sm flex-col gap-5 rounded-2xl border
		            border-[var(--color-surface-700)] bg-[var(--color-surface-900)] p-6 shadow-2xl">
			<div class="flex items-center justify-between">
				<h2 class="text-sm font-semibold text-[var(--color-text-primary)]">View API Key</h2>
				<button
					onclick={closeViewModal}
					aria-label="Close"
					class="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-text-muted)]
					       hover:bg-[var(--color-surface-800)] hover:text-[var(--color-text-primary)] transition-colors"
				>
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
						<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
					</svg>
				</button>
			</div>

			{#if revealedKey}
				<div class="flex flex-col gap-2">
					<p class="text-xs text-[var(--color-text-muted)]">Your API key:</p>
					<div class="break-all rounded-lg border border-[var(--color-surface-600)]
					            bg-[var(--color-surface-800)] px-3 py-2 font-mono text-xs
					            text-[var(--color-text-primary)] select-all">
						{revealedKey}
					</div>
				</div>
				<button
					onclick={closeViewModal}
					class="w-full rounded-xl border border-[var(--color-surface-600)] px-4 py-2 text-sm
					       text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
				>
					Close
				</button>
			{:else}
				<p class="text-sm text-[var(--color-text-secondary)]">
					Enter your account password to view this key.
				</p>
				<div class="flex flex-col gap-1.5">
					<input
						type="password"
						bind:value={viewPassword}
						placeholder="Your password"
						onkeydown={(e) => e.key === 'Enter' && handleViewConfirm()}
						class="w-full rounded-xl border border-[var(--color-surface-600)]
						       bg-[var(--color-surface-800)] px-3 py-2 text-sm
						       text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]
						       focus:border-[var(--color-accent-500)] focus:outline-none
						       focus:ring-2 focus:ring-[var(--color-accent-500)]/20 transition-colors"
					/>
					{#if viewError}
						<p class="text-xs text-[var(--color-error-400)]">{viewError}</p>
					{/if}
				</div>
				<div class="flex gap-2">
					<button
						onclick={handleViewConfirm}
						disabled={viewVerifying || !viewPassword.trim()}
						class="flex-1 rounded-xl bg-[var(--color-accent-500)] px-4 py-2 text-sm font-medium
						       text-white hover:bg-[var(--color-accent-400)]
						       disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
					>
						{viewVerifying ? 'Checking…' : 'Confirm'}
					</button>
					<button
						onclick={closeViewModal}
						class="rounded-xl border border-[var(--color-surface-600)] px-4 py-2 text-sm
						       text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
					>
						Cancel
					</button>
				</div>
			{/if}
		</div>
	</div>
{/if}

<section class="flex flex-col gap-4">
	<h2 class="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
		AI Settings
	</h2>

	<div class="rounded-xl border border-[var(--color-surface-700)] bg-[var(--color-surface-900)]
	            divide-y divide-[var(--color-surface-700)]">
		{#each PROVIDERS as { id, label }}
			<div class="flex flex-col gap-3 px-5 py-4">
				<div class="flex items-center justify-between">
					<span class="text-sm font-medium text-[var(--color-text-primary)]">{label}</span>
					{#if saved[id]}
						<span class="text-xs font-medium text-[var(--color-success-500)]">Saved</span>
					{/if}
				</div>

				<div class="flex gap-2">
					<input
						type="password"
						bind:value={drafts[id]}
						placeholder={saved[id] ? '••••••••••••••••' : 'Paste API key…'}
						class="flex-1 rounded-xl border border-[var(--color-surface-600)]
						       bg-[var(--color-surface-800)] px-3 py-2 text-sm
						       text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]
						       focus:border-[var(--color-accent-500)] focus:outline-none
						       focus:ring-2 focus:ring-[var(--color-accent-500)]/20 transition-colors"
					/>

					<button
						onclick={() => handleSave(id)}
						disabled={!drafts[id].trim()}
						class="rounded-xl bg-[var(--color-accent-500)] px-3 py-2 text-sm font-medium
						       text-white hover:bg-[var(--color-accent-400)]
						       disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
					>
						Save
					</button>

					{#if saved[id]}
						<button
							onclick={() => openViewModal(id)}
							class="rounded-xl border border-[var(--color-surface-600)] px-3 py-2 text-sm
							       text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]
							       transition-colors"
						>
							View
						</button>
						<button
							onclick={() => handleClear(id)}
							class="rounded-xl border border-[var(--color-surface-600)] px-3 py-2 text-sm
							       text-[var(--color-text-secondary)] hover:text-[var(--color-error-400)]
							       transition-colors"
						>
							Clear
						</button>
					{/if}
				</div>
			</div>
		{/each}
	</div>
</section>
