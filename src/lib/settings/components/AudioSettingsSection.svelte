<script lang="ts">
	import { onMount } from 'svelte';
	import { verifyPassword } from '$lib/auth/authService';
	import {
		getTTSProvider, setTTSProvider,
		getOpenAIVoice1, setOpenAIVoice1,
		getOpenAIVoice2, setOpenAIVoice2,
		getElevenLabsKey, setElevenLabsKey,
		getElevenLabsVoice1, setElevenLabsVoice1,
		getElevenLabsVoice2, setElevenLabsVoice2,
		getBrowserVoice1Idx, setBrowserVoice1Idx,
		getBrowserVoice2Idx, setBrowserVoice2Idx
	} from '$lib/audio/audioKeyStore';
	import type { TTSProvider } from '$lib/audio/audioTypes';
	import { OPENAI_VOICES } from '$lib/audio/audioTypes';

	// ── Saved values (what's currently on disk) ───────────────────────────────
	let savedProvider     = $state<TTSProvider>('browser');
	let savedOAIVoice1    = $state('alloy');
	let savedOAIVoice2    = $state('nova');
	let savedElVoice1     = $state('');
	let savedElVoice2     = $state('');
	let savedBrVoice1     = $state(0);
	let savedBrVoice2     = $state(1);
	let hasElKey          = $state(false);

	// ── Draft values (what the user is editing) ───────────────────────────────
	let provider     = $state<TTSProvider>('browser');
	let oaiVoice1    = $state('alloy');
	let oaiVoice2    = $state('nova');
	let elKeyDraft   = $state('');
	let elVoice1     = $state('');
	let elVoice2     = $state('');
	let brVoice1Idx  = $state(0);
	let brVoice2Idx  = $state(1);

	let browserVoices = $state<SpeechSynthesisVoice[]>([]);
	let saved         = $state(false);
	let error         = $state('');

	// ── ElevenLabs key view modal ─────────────────────────────────────────────
	let showViewKeyModal = $state(false);
	let viewPassword     = $state('');
	let viewError        = $state('');
	let viewVerifying    = $state(false);
	let revealedKey      = $state('');
	let confirmClearEl   = $state(false);

	onMount(() => {
		savedProvider  = getTTSProvider();
		savedOAIVoice1 = getOpenAIVoice1();
		savedOAIVoice2 = getOpenAIVoice2();
		savedElVoice1  = getElevenLabsVoice1();
		savedElVoice2  = getElevenLabsVoice2();
		savedBrVoice1  = getBrowserVoice1Idx();
		savedBrVoice2  = getBrowserVoice2Idx();
		hasElKey       = !!getElevenLabsKey();

		provider    = savedProvider;
		oaiVoice1   = savedOAIVoice1;
		oaiVoice2   = savedOAIVoice2;
		elVoice1    = savedElVoice1;
		elVoice2    = savedElVoice2;
		brVoice1Idx = savedBrVoice1;
		brVoice2Idx = savedBrVoice2;

		browserVoices = window.speechSynthesis?.getVoices() ?? [];
		if (browserVoices.length === 0) {
			window.speechSynthesis?.addEventListener('voiceschanged', () => {
				browserVoices = window.speechSynthesis.getVoices();
			}, { once: true });
		}
	});

	// Dirty check — only enable Save when something actually changed
	const isDirty = $derived(
		provider    !== savedProvider    ||
		oaiVoice1   !== savedOAIVoice1   ||
		oaiVoice2   !== savedOAIVoice2   ||
		elVoice1    !== savedElVoice1    ||
		elVoice2    !== savedElVoice2    ||
		brVoice1Idx !== savedBrVoice1   ||
		brVoice2Idx !== savedBrVoice2   ||
		elKeyDraft.trim() !== ''         // new EL key entered
	);

	function handleSave() {
		error = '';
		setTTSProvider(provider);
		setOpenAIVoice1(oaiVoice1);
		setOpenAIVoice2(oaiVoice2);
		if (elKeyDraft.trim()) {
			setElevenLabsKey(elKeyDraft.trim());
			hasElKey = true;
			elKeyDraft = '';
		}
		setElevenLabsVoice1(elVoice1);
		setElevenLabsVoice2(elVoice2);
		setBrowserVoice1Idx(brVoice1Idx);
		setBrowserVoice2Idx(brVoice2Idx);

		// Update saved values so dirty flag resets
		savedProvider  = provider;
		savedOAIVoice1 = oaiVoice1;
		savedOAIVoice2 = oaiVoice2;
		savedElVoice1  = elVoice1;
		savedElVoice2  = elVoice2;
		savedBrVoice1  = brVoice1Idx;
		savedBrVoice2  = brVoice2Idx;

		saved = true;
		setTimeout(() => (saved = false), 2000);
	}

	function handleClearElKey() {
		setElevenLabsKey('');
		hasElKey = false;
		elKeyDraft = '';
		confirmClearEl = false;
	}

	async function handleViewElKey() {
		showViewKeyModal = true;
		viewPassword = '';
		viewError = '';
		revealedKey = '';
	}

	async function handleViewConfirm() {
		if (!viewPassword.trim()) return;
		viewVerifying = true; viewError = '';
		try {
			const ok = await verifyPassword(viewPassword);
			if (!ok) { viewError = 'Incorrect password.'; return; }
			revealedKey = getElevenLabsKey();
		} catch { viewError = 'Could not verify password.'; }
		finally { viewVerifying = false; }
	}
</script>

<!-- ElevenLabs key view modal -->
{#if showViewKeyModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4"
	     style="background: rgba(0,0,0,0.75);" role="dialog" aria-modal="true">
		<div class="flex w-full max-w-sm flex-col gap-5 rounded-2xl border
		            border-[var(--color-surface-700)] bg-[var(--color-surface-900)] p-6 shadow-2xl">
			<div class="flex items-center justify-between">
				<h2 class="text-sm font-semibold text-[var(--color-text-primary)]">View ElevenLabs API Key</h2>
				<button onclick={() => { showViewKeyModal = false; revealedKey = ''; }} aria-label="Close"
					class="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-text-muted)]
					       hover:bg-[var(--color-surface-800)] hover:text-[var(--color-text-primary)] transition-colors">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
						<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
					</svg>
				</button>
			</div>
			{#if revealedKey}
				<div class="flex flex-col gap-2">
					<p class="text-xs text-[var(--color-text-muted)]">Your ElevenLabs API key:</p>
					<div class="break-all rounded-lg border border-[var(--color-surface-600)]
					            bg-[var(--color-surface-800)] px-3 py-2 font-mono text-xs
					            text-[var(--color-text-primary)] select-all">{revealedKey}</div>
				</div>
				<button onclick={() => { showViewKeyModal = false; revealedKey = ''; }}
					class="w-full rounded-xl border border-[var(--color-surface-600)] px-4 py-2 text-sm
					       text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
					Close
				</button>
			{:else}
				<p class="text-sm text-[var(--color-text-secondary)]">Enter your account password to view this key.</p>
				<div class="flex flex-col gap-1.5">
					<input type="password" bind:value={viewPassword} placeholder="Your password"
						onkeydown={(e) => e.key === 'Enter' && handleViewConfirm()}
						class="w-full rounded-xl border border-[var(--color-surface-600)]
						       bg-[var(--color-surface-800)] px-3 py-2 text-sm
						       text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]
						       focus:border-[var(--color-accent-500)] focus:outline-none transition-colors" />
					{#if viewError}<p class="text-xs text-[var(--color-error-400)]">{viewError}</p>{/if}
				</div>
				<div class="flex gap-2">
					<button onclick={handleViewConfirm} disabled={viewVerifying || !viewPassword.trim()}
						class="flex-1 rounded-xl bg-[var(--color-accent-500)] px-4 py-2 text-sm font-medium
						       text-white hover:bg-[var(--color-accent-400)]
						       disabled:cursor-not-allowed disabled:opacity-50 transition-colors">
						{viewVerifying ? 'Checking…' : 'Confirm'}
					</button>
					<button onclick={() => (showViewKeyModal = false)}
						class="rounded-xl border border-[var(--color-surface-600)] px-4 py-2 text-sm
						       text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
						Cancel
					</button>
				</div>
			{/if}
		</div>
	</div>
{/if}

<section class="flex flex-col gap-4">
	<h2 class="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">Audio Settings</h2>

	<div class="rounded-xl border border-[var(--color-surface-700)] bg-[var(--color-surface-900)] divide-y divide-[var(--color-surface-700)]">

		<!-- TTS Provider -->
		<div class="px-5 py-4 flex flex-col gap-3">
			<span class="text-sm font-medium text-[var(--color-text-primary)]">Text-to-Speech Provider</span>
			<div class="flex gap-2 flex-wrap">
				{#each (['browser', 'openai', 'elevenlabs'] as TTSProvider[]) as p}
					<button onclick={() => (provider = p)}
						class="rounded-lg border px-3 py-1.5 text-xs font-medium capitalize transition-colors
						       {provider === p
							? 'border-[var(--color-accent-500)] bg-[var(--color-accent-500)]/10 text-[var(--color-accent-400)]'
							: 'border-[var(--color-surface-600)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}">
						{p === 'browser' ? 'Browser (Free)' : p === 'openai' ? 'OpenAI TTS' : 'ElevenLabs'}
					</button>
				{/each}
			</div>
		</div>

		<!-- OpenAI voices -->
		{#if provider === 'openai'}
			<div class="px-5 py-4 flex flex-col gap-3">
				<span class="text-sm font-medium text-[var(--color-text-primary)]">OpenAI Voices</span>
				<div class="grid grid-cols-2 gap-3">
					<div class="flex flex-col gap-1.5">
						<label class="text-xs text-[var(--color-text-muted)]">Voice 1 (Host / Narrator)</label>
						<select bind:value={oaiVoice1}
							class="rounded-xl border border-[var(--color-surface-600)] bg-[var(--color-surface-800)]
							       px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none
							       focus:border-[var(--color-accent-500)] transition-colors"
							style="color-scheme: dark;">
							{#each OPENAI_VOICES as v}
								<option value={v} style="background: var(--color-surface-800);">{v}</option>
							{/each}
						</select>
					</div>
					<div class="flex flex-col gap-1.5">
						<label class="text-xs text-[var(--color-text-muted)]">Voice 2 (Guest — Podcast only)</label>
						<select bind:value={oaiVoice2}
							class="rounded-xl border border-[var(--color-surface-600)] bg-[var(--color-surface-800)]
							       px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none
							       focus:border-[var(--color-accent-500)] transition-colors"
							style="color-scheme: dark;">
							{#each OPENAI_VOICES as v}
								<option value={v} style="background: var(--color-surface-800);">{v}</option>
							{/each}
						</select>
					</div>
				</div>
				<p class="text-xs text-[var(--color-text-muted)]">Requires an OpenAI API key in Settings → AI Settings.</p>
			</div>
		{/if}

		<!-- ElevenLabs -->
		{#if provider === 'elevenlabs'}
			<div class="px-5 py-4 flex flex-col gap-4">
				<span class="text-sm font-medium text-[var(--color-text-primary)]">ElevenLabs Settings</span>

				<!-- API Key -->
				<div class="flex flex-col gap-1.5">
					<label class="text-xs text-[var(--color-text-muted)]">API Key</label>
					{#if !hasElKey}
						<input type="password" bind:value={elKeyDraft} placeholder="Paste your ElevenLabs API key…"
							class="w-full rounded-xl border border-[var(--color-surface-600)] bg-[var(--color-surface-800)]
							       px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]
							       focus:border-[var(--color-accent-500)] focus:outline-none transition-colors" />
					{:else}
						<div class="flex items-center gap-2">
							<div class="flex-1 rounded-xl border border-[var(--color-surface-600)] bg-[var(--color-surface-800)]
							            px-3 py-2 text-sm text-[var(--color-text-muted)] font-mono">
								••••••••••••••••
							</div>
							<button onclick={handleViewElKey}
								class="rounded-lg border border-[var(--color-surface-600)] px-3 py-2 text-xs
								       text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
								View
							</button>
							{#if !confirmClearEl}
								<button onclick={() => (confirmClearEl = true)}
									class="rounded-lg border border-[var(--color-surface-600)] px-3 py-2 text-xs
									       text-[var(--color-text-secondary)] hover:text-[var(--color-error-400)]
									       hover:border-[var(--color-error-400)]/50 transition-colors">
									Clear
								</button>
							{:else}
								<button onclick={handleClearElKey}
									class="rounded-lg bg-[var(--color-error-500)]/15 px-3 py-2 text-xs
									       text-[var(--color-error-400)] hover:bg-[var(--color-error-500)]/25 transition-colors">
									Confirm
								</button>
								<button onclick={() => (confirmClearEl = false)}
									class="rounded-lg border border-[var(--color-surface-600)] px-3 py-2 text-xs
									       text-[var(--color-text-secondary)] transition-colors">
									No
								</button>
							{/if}
						</div>
						<!-- Allow updating with new key -->
						<input type="password" bind:value={elKeyDraft} placeholder="Paste new key to replace…"
							class="w-full rounded-xl border border-[var(--color-surface-600)] bg-[var(--color-surface-800)]
							       px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]
							       focus:border-[var(--color-accent-500)] focus:outline-none transition-colors" />
					{/if}
				</div>

				<!-- Voice IDs -->
				<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
					<div class="flex flex-col gap-1.5">
						<label class="text-xs text-[var(--color-text-muted)]">Voice ID 1 (Host / Narrator)</label>
						<input type="text" bind:value={elVoice1} placeholder="e.g. EXAVITQu4vr4xnSDxMaL"
							class="w-full rounded-xl border border-[var(--color-surface-600)] bg-[var(--color-surface-800)]
							       px-3 py-2 text-sm font-mono text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]
							       focus:border-[var(--color-accent-500)] focus:outline-none transition-colors" />
					</div>
					<div class="flex flex-col gap-1.5">
						<label class="text-xs text-[var(--color-text-muted)]">Voice ID 2 (Guest — Podcast only)</label>
						<input type="text" bind:value={elVoice2} placeholder="e.g. VR6AewLTigWG4xSOukaG"
							class="w-full rounded-xl border border-[var(--color-surface-600)] bg-[var(--color-surface-800)]
							       px-3 py-2 text-sm font-mono text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]
							       focus:border-[var(--color-accent-500)] focus:outline-none transition-colors" />
					</div>
				</div>
				<p class="text-xs text-[var(--color-text-muted)]">Find Voice IDs in your <a href="https://elevenlabs.io/app/voice-library" target="_blank" rel="noopener" class="text-[var(--color-accent-400)] hover:underline">ElevenLabs voice library</a>.</p>
			</div>
		{/if}

		<!-- Browser voices -->
		{#if provider === 'browser'}
			<div class="px-5 py-4 flex flex-col gap-3">
				<span class="text-sm font-medium text-[var(--color-text-primary)]">Browser Voices</span>
				{#if browserVoices.length === 0}
					<p class="text-xs text-[var(--color-text-muted)]">No browser voices detected. Try a different browser.</p>
				{:else}
					<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
						<div class="flex flex-col gap-1.5">
							<label class="text-xs text-[var(--color-text-muted)]">Voice 1 (Host / Narrator)</label>
							<select bind:value={brVoice1Idx}
								class="rounded-xl border border-[var(--color-surface-600)] bg-[var(--color-surface-800)]
								       px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none
								       focus:border-[var(--color-accent-500)] transition-colors"
								style="color-scheme: dark;">
								{#each browserVoices as v, i}
									<option value={i} style="background: var(--color-surface-800);">{v.name} ({v.lang})</option>
								{/each}
							</select>
						</div>
						<div class="flex flex-col gap-1.5">
							<label class="text-xs text-[var(--color-text-muted)]">Voice 2 (Guest — Podcast only)</label>
							<select bind:value={brVoice2Idx}
								class="rounded-xl border border-[var(--color-surface-600)] bg-[var(--color-surface-800)]
								       px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none
								       focus:border-[var(--color-accent-500)] transition-colors"
								style="color-scheme: dark;">
								{#each browserVoices as v, i}
									<option value={i} style="background: var(--color-surface-800);">{v.name} ({v.lang})</option>
								{/each}
							</select>
						</div>
					</div>
				{/if}
				<p class="text-xs text-[var(--color-text-muted)]">Free — uses your device's built-in text-to-speech. No API key needed.</p>
			</div>
		{/if}
	</div>

	{#if error}<p class="text-xs text-[var(--color-error-400)]">{error}</p>{/if}

	<div class="flex items-center gap-3">
		<button onclick={handleSave} disabled={!isDirty}
			class="self-start rounded-xl px-5 py-2.5 text-sm font-medium transition-colors
			       {isDirty
				? 'bg-[var(--color-accent-500)] text-white hover:bg-[var(--color-accent-400)]'
				: 'bg-[var(--color-surface-700)] text-[var(--color-text-muted)] cursor-default'}">
			{saved ? 'Saved ✓' : 'Save Settings'}
		</button>
		{#if !isDirty && !saved}
			<span class="text-xs text-[var(--color-text-muted)]">No changes to save</span>
		{/if}
	</div>
</section>
