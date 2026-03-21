<script lang="ts">
	import { onMount } from 'svelte';
	import { setKey, clearKey, hasKey } from '$lib/settings/aiKeyStore';
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
	let visible = $state<Record<AIProvider, boolean>>({
		openai: false, anthropic: false, gemini: false, groq: false
	});
	let saved = $state<Record<AIProvider, boolean>>({
		openai: false, anthropic: false, gemini: false, groq: false
	});

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
</script>

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
					<div class="relative flex-1">
						<input
							type={visible[id] ? 'text' : 'password'}
							bind:value={drafts[id]}
							placeholder={saved[id] ? '••••••••••••••••' : 'Paste API key…'}
							class="w-full rounded-xl border border-[var(--color-surface-600)]
							       bg-[var(--color-surface-800)] px-3 py-2 pr-10 text-sm
							       text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]
							       focus:border-[var(--color-accent-500)] focus:outline-none
							       focus:ring-2 focus:ring-[var(--color-accent-500)]/20 transition-colors"
						/>
						<button
							type="button"
							onclick={() => (visible[id] = !visible[id])}
							aria-label={visible[id] ? 'Hide key' : 'Show key'}
							class="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]
							       hover:text-[var(--color-text-secondary)] transition-colors"
						>
							{#if visible[id]}
								<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
									<path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>
								</svg>
							{:else}
								<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
									<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
								</svg>
							{/if}
						</button>
					</div>

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
