<script lang="ts">
	import { onMount } from 'svelte';
	import type { TTSProvider } from '$lib/audio/audioTypes';
	import { OPENAI_VOICES } from '$lib/audio/audioTypes';
	import {
		getTTSProvider, setTTSProvider,
		getOpenAIVoice1, setOpenAIVoice1, getOpenAIVoice2, setOpenAIVoice2,
		getElevenLabsKey, setElevenLabsKey,
		getElevenLabsVoice1, setElevenLabsVoice1,
		getElevenLabsVoice2, setElevenLabsVoice2,
		getBrowserVoice1Idx, setBrowserVoice1Idx,
		getBrowserVoice2Idx, setBrowserVoice2Idx
	} from '$lib/audio/audioKeyStore';
	import { getBrowserVoices } from '$lib/audio/audioConversionService';
	import { getKey } from '$lib/settings/aiKeyStore';

	// Snapshot of saved values for dirty-check
	let orig = {
		provider:  getTTSProvider(),
		oaiV1:     getOpenAIVoice1(),
		oaiV2:     getOpenAIVoice2(),
		elKey:     getElevenLabsKey(),
		elV1:      getElevenLabsVoice1(),
		elV2:      getElevenLabsVoice2(),
		brIdx1:    getBrowserVoice1Idx(),
		brIdx2:    getBrowserVoice2Idx()
	};

	let provider   = $state<TTSProvider>(orig.provider);
	let oaiVoice1  = $state(orig.oaiV1);
	let oaiVoice2  = $state(orig.oaiV2);
	let elKey      = $state(orig.elKey);
	let elVoice1   = $state(orig.elV1);
	let elVoice2   = $state(orig.elV2);
	let brIdx1     = $state(orig.brIdx1);
	let brIdx2     = $state(orig.brIdx2);
	let voices     = $state<SpeechSynthesisVoice[]>([]);
	let saved      = $state(false);

	const hasOpenAI = !!getKey('openai');

	const isDirty = $derived(
		provider  !== orig.provider  ||
		oaiVoice1 !== orig.oaiV1     ||
		oaiVoice2 !== orig.oaiV2     ||
		elKey     !== orig.elKey     ||
		elVoice1  !== orig.elV1      ||
		elVoice2  !== orig.elV2      ||
		brIdx1    !== orig.brIdx1    ||
		brIdx2    !== orig.brIdx2
	);

	onMount(() => {
		voices = getBrowserVoices();
		if (voices.length === 0 && window.speechSynthesis) {
			window.speechSynthesis.addEventListener('voiceschanged', () => {
				voices = getBrowserVoices();
			}, { once: true });
		}
	});

	function handleSave() {
		setTTSProvider(provider);
		setOpenAIVoice1(oaiVoice1); setOpenAIVoice2(oaiVoice2);
		setElevenLabsKey(elKey);
		setElevenLabsVoice1(elVoice1); setElevenLabsVoice2(elVoice2);
		setBrowserVoice1Idx(brIdx1); setBrowserVoice2Idx(brIdx2);
		orig = { provider, oaiV1: oaiVoice1, oaiV2: oaiVoice2, elKey, elV1: elVoice1, elV2: elVoice2, brIdx1, brIdx2 };
		saved = true;
		setTimeout(() => (saved = false), 2000);
	}

	const PROVIDERS: { id: TTSProvider; label: string; desc: string }[] = [
		{ id: 'browser',    label: '🔊 Browser (free)',  desc: 'Uses your OS/browser voices. No API key needed.' },
		{ id: 'openai',     label: '🤖 OpenAI TTS',      desc: 'High quality. Requires OpenAI key in AI Settings.' },
		{ id: 'elevenlabs', label: '🎙️ ElevenLabs',      desc: 'Ultra-realistic voices. Requires ElevenLabs API key.' }
	];
</script>

<section class="flex flex-col gap-4">
	<h2 class="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">Audio / Text-to-Speech</h2>

	<div class="rounded-xl border border-[var(--color-surface-700)] bg-[var(--color-surface-900)] divide-y divide-[var(--color-surface-700)]">
		<div class="px-5 py-4 flex flex-col gap-3">
			<span class="text-sm font-medium text-[var(--color-text-primary)]">Voice Provider</span>
			<div class="flex flex-col gap-2">
				{#each PROVIDERS as p}
					<label class="flex items-start gap-3 cursor-pointer">
						<input type="radio" bind:group={provider} value={p.id} class="mt-0.5 accent-[var(--color-accent-500)]" />
						<div>
							<p class="text-sm font-medium text-[var(--color-text-primary)]">{p.label}</p>
							<p class="text-xs text-[var(--color-text-muted)]">{p.desc}</p>
						</div>
					</label>
				{/each}
			</div>
		</div>

		{#if provider === 'browser'}
			<div class="px-5 py-4 flex flex-col gap-3">
				<span class="text-sm font-medium text-[var(--color-text-primary)]">Browser Voices</span>
				{#if voices.length === 0}
					<p class="text-xs text-[var(--color-warning-400)]">No voices detected. Check your browser/OS settings.</p>
				{:else}
					<div class="flex flex-col gap-2">
						<div class="flex flex-col gap-1">
							<label class="text-xs text-[var(--color-text-muted)]">Voice 1 (Host / Narrator)</label>
							<select bind:value={brIdx1}
								class="w-full rounded-xl border border-[var(--color-surface-600)] bg-[var(--color-surface-800)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none" style="color-scheme:dark;">
								{#each voices as v, i}<option value={i}>{v.name} ({v.lang})</option>{/each}
							</select>
						</div>
						<div class="flex flex-col gap-1">
							<label class="text-xs text-[var(--color-text-muted)]">Voice 2 (Guest — Podcast only)</label>
							<select bind:value={brIdx2}
								class="w-full rounded-xl border border-[var(--color-surface-600)] bg-[var(--color-surface-800)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none" style="color-scheme:dark;">
								{#each voices as v, i}<option value={i}>{v.name} ({v.lang})</option>{/each}
							</select>
						</div>
					</div>
				{/if}
			</div>
		{/if}

		{#if provider === 'openai'}
			<div class="px-5 py-4 flex flex-col gap-3">
				{#if !hasOpenAI}<p class="text-xs text-[var(--color-warning-400)]">Add your OpenAI key in AI Settings above first.</p>{/if}
				<span class="text-sm font-medium text-[var(--color-text-primary)]">OpenAI Voices</span>
				<div class="flex flex-col gap-2">
					<div class="flex flex-col gap-1">
						<label class="text-xs text-[var(--color-text-muted)]">Voice 1 (Host / Narrator)</label>
						<select bind:value={oaiVoice1} class="w-full rounded-xl border border-[var(--color-surface-600)] bg-[var(--color-surface-800)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none" style="color-scheme:dark;">
							{#each OPENAI_VOICES as v}<option value={v}>{v}</option>{/each}
						</select>
					</div>
					<div class="flex flex-col gap-1">
						<label class="text-xs text-[var(--color-text-muted)]">Voice 2 (Guest — Podcast only)</label>
						<select bind:value={oaiVoice2} class="w-full rounded-xl border border-[var(--color-surface-600)] bg-[var(--color-surface-800)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none" style="color-scheme:dark;">
							{#each OPENAI_VOICES as v}<option value={v}>{v}</option>{/each}
						</select>
					</div>
				</div>
			</div>
		{/if}

		{#if provider === 'elevenlabs'}
			<div class="px-5 py-4 flex flex-col gap-3">
				<span class="text-sm font-medium text-[var(--color-text-primary)]">ElevenLabs Configuration</span>
				<div class="flex flex-col gap-1">
					<label class="text-xs text-[var(--color-text-muted)]">API Key</label>
					<input type="password" bind:value={elKey} placeholder="your-elevenlabs-key"
						class="w-full rounded-xl border border-[var(--color-surface-600)] bg-[var(--color-surface-800)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-500)] transition-colors" />
				</div>
				<div class="flex flex-col gap-1">
					<label class="text-xs text-[var(--color-text-muted)]">Voice 1 ID (Host / Narrator)</label>
					<input type="text" bind:value={elVoice1} placeholder="voice ID from elevenlabs.io"
						class="w-full rounded-xl border border-[var(--color-surface-600)] bg-[var(--color-surface-800)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-500)] transition-colors" />
				</div>
				<div class="flex flex-col gap-1">
					<label class="text-xs text-[var(--color-text-muted)]">Voice 2 ID (Guest — Podcast only)</label>
					<input type="text" bind:value={elVoice2} placeholder="voice ID from elevenlabs.io"
						class="w-full rounded-xl border border-[var(--color-surface-600)] bg-[var(--color-surface-800)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-500)] transition-colors" />
				</div>
			</div>
		{/if}
	</div>

	<button onclick={handleSave} disabled={!isDirty}
		class="self-start rounded-xl bg-[var(--color-accent-500)] px-4 py-2 text-sm font-medium
		       text-white hover:bg-[var(--color-accent-400)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
		{saved ? 'Saved ✓' : 'Save Audio Settings'}
	</button>
</section>
