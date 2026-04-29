<script lang="ts">
	import { onMount } from 'svelte';
	import { generateScript, synthesizeScript } from '$lib/audio/audioConversionService';
	import { createChapterAudio } from '$lib/audio/audioService';
	import { getKey, getAvailableProviders } from '$lib/settings/aiKeyStore';
	import {
		getTTSProvider, getOpenAIVoice1, getOpenAIVoice2,
		getElevenLabsKey, getElevenLabsVoice1, getElevenLabsVoice2,
		getBrowserVoice1Idx, getBrowserVoice2Idx
	} from '$lib/audio/audioKeyStore';
	import { playBrowserTTS, getBrowserVoices } from '$lib/audio/audioConversionService';
	import { blockToText } from '$lib/search/searchUtils';
	import type { RuntimeBlock } from '$lib/creator/contentTypes';
	import type { AudioTemplate, AudioScript, AudioSegment, TTSProvider } from '$lib/audio/audioTypes';
	import { TEMPLATE_META, OPENAI_VOICES } from '$lib/audio/audioTypes';

	interface Props {
		chapterId: string;
		chapterTitle: string;
		blocks: RuntimeBlock[];
		onSaved: (audio: import('$lib/audio/audioTypes').ChapterAudio) => void;
		onClose: () => void;
	}
	let { chapterId, chapterTitle, blocks, onSaved, onClose }: Props = $props();

	type Step = 'configure' | 'script' | 'synthesize';

	let step = $state<Step>('configure');
	let template = $state<AudioTemplate>('podcast');
	let userPrompt = $state('');
	let script = $state<AudioScript | null>(null);
	let generating = $state(false);
	let synthesizing = $state(false);
	let synthProgress = $state(0);
	let error = $state('');
	let ttsProvider = $state<TTSProvider>('browser');
	let availableAI: string[] = [];
	let selectedAIProvider = $state('');
	let browserVoices = $state<SpeechSynthesisVoice[]>([]);

	// Extract chapter text from blocks
	const chapterText = $derived(
		blocks.map((b) => blockToText(b.type, b.data as Record<string, unknown>)).filter(Boolean).join('\n\n')
	);

	onMount(() => {
		ttsProvider = getTTSProvider();
		availableAI = getAvailableProviders();
		if (availableAI.length > 0) selectedAIProvider = availableAI[0];
		browserVoices = getBrowserVoices();
		if (browserVoices.length === 0 && typeof window !== 'undefined' && window.speechSynthesis) {
			window.speechSynthesis.addEventListener('voiceschanged', () => {
				browserVoices = getBrowserVoices();
			}, { once: true });
		}
	});

	// Speaker label helper based on template
	function getSpeakerLabel(template: AudioTemplate, speaker: string): string {
		if (template === 'podcast') {
			if (speaker === 'host') return 'Host';
			if (speaker === 'guest') return 'Guest';
		}
		return 'Narrator';
	}

	async function handleGenerate() {
		if (!selectedAIProvider) { error = 'No AI API key configured. Add one in Settings → AI Settings.'; return; }
		generating = true; error = '';
		try {
			const apiKey = getKey(selectedAIProvider as Parameters<typeof getKey>[0]);
			const generated = await generateScript(chapterTitle, chapterText, template, selectedAIProvider, apiKey, userPrompt);
			script = generated;
			step = 'script';
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to generate script.';
		} finally { generating = false; }
	}

	function updateSegmentText(index: number, text: string) {
		if (!script) return;
		const segments = [...script.segments];
		segments[index] = { ...segments[index], text };
		script = { ...script, segments };
	}

	function updateSegmentSpeaker(index: number, speaker: AudioSegment['speaker']) {
		if (!script) return;
		const segments = [...script.segments];
		segments[index] = { ...segments[index], speaker };
		script = { ...script, segments };
	}

	function removeSegment(index: number) {
		if (!script) return;
		const segments = script.segments.filter((_, i) => i !== index);
		script = { ...script, segments };
	}

	function addSegment() {
		if (!script) return;
		const defaultSpeaker: AudioSegment['speaker'] =
			template === 'podcast' ? 'host' : 'narrator';
		script = { ...script, segments: [...script.segments, { speaker: defaultSpeaker, text: '' }] };
	}

	// Preview a single segment in browser TTS
	let previewHandle: { stop: () => void; isActive: () => boolean } | null = null;
	function previewSegment(index: number) {
		if (!script) return;
		previewHandle?.stop();
		const single: AudioScript = { template: script.template, segments: [script.segments[index]] };
		previewHandle = playBrowserTTS(single, getBrowserVoice1Idx(), getBrowserVoice2Idx(), 1.0);
	}

	async function handleSynthesize() {
		if (!script) return;
		synthesizing = true; error = ''; synthProgress = 0;
		try {
			const config = {
				provider: ttsProvider === 'browser' ? 'openai' as const : ttsProvider as 'openai' | 'elevenlabs',
				openaiKey: getKey('openai'),
				openaiVoice1: getOpenAIVoice1(),
				openaiVoice2: getOpenAIVoice2(),
				elevenLabsKey: getElevenLabsKey(),
				elevenLabsVoice1: getElevenLabsVoice1(),
				elevenLabsVoice2: getElevenLabsVoice2()
			};

			if (ttsProvider === 'browser') {
				// Browser TTS — save script only, no audio file
				const saved = await createChapterAudio({
					chapterId, template, title: chapterTitle,
					script, duration: 0, ttsProvider: 'browser'
				});
				onSaved(saved);
				onClose();
				return;
			}

			const audioBlob = await synthesizeScript(script, config, (pct) => { synthProgress = pct; });
			// Estimate duration from blob size (rough: 128kbps mp3)
			const duration = Math.round(audioBlob.size / 16000);
			const saved = await createChapterAudio({
				chapterId, template, title: chapterTitle,
				script, audioBlob, duration, ttsProvider
			});
			onSaved(saved);
			onClose();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Synthesis failed.';
		} finally { synthesizing = false; }
	}

	// Available speakers based on template
	const availableSpeakers = $derived<AudioSegment['speaker'][]>(
		template === 'podcast' ? ['host', 'guest'] : ['narrator']
	);
</script>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75" onclick={onClose}>
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-[var(--color-surface-700)]
	            bg-[var(--color-surface-950)] shadow-2xl"
	     onclick={(e) => e.stopPropagation()}>

		<!-- Header -->
		<div class="flex shrink-0 items-center justify-between border-b border-[var(--color-surface-700)] px-5 py-4">
			<div class="flex flex-col gap-0.5">
				<span class="text-sm font-semibold text-[var(--color-text-primary)]">Convert to Audio</span>
				<span class="text-xs text-[var(--color-text-muted)]">{chapterTitle}</span>
			</div>
			<button onclick={onClose} aria-label="Close"
				class="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-text-muted)]
				       hover:bg-[var(--color-surface-800)] hover:text-[var(--color-text-primary)] transition-colors">
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
					<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
				</svg>
			</button>
		</div>

		<div class="flex-1 overflow-y-auto">
		{#if step === 'configure'}
			<div class="flex flex-col gap-5 p-5">
				<!-- Template picker -->
				<div class="flex flex-col gap-2">
					<span class="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">Format</span>
					<div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
						{#each Object.entries(TEMPLATE_META) as [key, meta]}
							<button onclick={() => (template = key as AudioTemplate)}
								class="flex flex-col items-center gap-1.5 rounded-xl border py-3 text-center transition-colors
								       {template === key
									? 'border-[var(--color-accent-500)] bg-[var(--color-accent-500)]/10'
									: 'border-[var(--color-surface-600)] hover:border-[var(--color-surface-500)]'}">
								<span class="text-2xl">{meta.emoji}</span>
								<span class="text-xs font-medium {template === key ? 'text-[var(--color-accent-400)]' : 'text-[var(--color-text-secondary)]'}">{meta.label}</span>
								<span class="text-[10px] text-[var(--color-text-muted)] px-1">{meta.desc}</span>
							</button>
						{/each}
					</div>
					<!-- Explain speakers for selected template -->
					{#if template === 'podcast'}
						<p class="text-xs text-[var(--color-text-muted)] rounded-lg bg-[var(--color-surface-800)] px-3 py-2">
							🎙 <strong class="text-[var(--color-text-secondary)]">Podcast</strong> uses two voices:
							<strong>Host</strong> introduces topics and asks questions,
							<strong>Guest</strong> explains concepts with examples.
						</p>
					{:else}
						<p class="text-xs text-[var(--color-text-muted)] rounded-lg bg-[var(--color-surface-800)] px-3 py-2">
							🔊 <strong class="text-[var(--color-text-secondary)]">{TEMPLATE_META[template].label}</strong> uses a single <strong>Narrator</strong> voice.
						</p>
					{/if}
				</div>

				<!-- Custom prompt -->
				<div class="flex flex-col gap-1.5">
					<label class="text-xs font-medium text-[var(--color-text-secondary)]">
						Prompt / Instructions <span class="font-normal text-[var(--color-text-muted)]">(optional)</span>
					</label>
					<textarea
						bind:value={userPrompt}
						rows={3}
						placeholder={template === 'podcast'
							? 'e.g. Make it conversational and engaging, around 5 minutes long, focus on practical examples…'
							: 'e.g. Tell it as an adventure story, keep it under 3 minutes, use simple language…'}
						class="w-full resize-none rounded-xl border border-[var(--color-surface-600)]
						       bg-[var(--color-surface-800)] px-3 py-2 text-sm text-[var(--color-text-primary)]
						       placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent-500)]
						       focus:outline-none transition-colors"
					></textarea>
					<p class="text-xs text-[var(--color-text-muted)]">Guide the AI on style, length, tone, and what to emphasise.</p>
				</div>

				<!-- AI Provider -->
				{#if availableAI.length > 0}
					<div class="flex flex-col gap-1.5">
						<span class="text-xs font-medium text-[var(--color-text-secondary)]">AI Provider</span>
						<div class="flex gap-2 flex-wrap">
							{#each availableAI as p}
								<button onclick={() => (selectedAIProvider = p)}
									class="rounded-lg border px-3 py-1.5 text-xs font-medium capitalize transition-colors
									       {selectedAIProvider === p
										? 'border-[var(--color-accent-500)] bg-[var(--color-accent-500)]/10 text-[var(--color-accent-400)]'
										: 'border-[var(--color-surface-600)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}">
									{p}
								</button>
							{/each}
						</div>
					</div>
				{:else}
					<div class="rounded-xl border border-[var(--color-warning-500)]/30 bg-[var(--color-warning-500)]/5 px-4 py-3">
						<p class="text-sm text-[var(--color-text-secondary)]">No AI API key configured. Add one in <a href="/settings" onclick={onClose} class="text-[var(--color-accent-400)] hover:underline">Settings → AI Settings</a>.</p>
					</div>
				{/if}

				{#if error}<p class="text-sm text-[var(--color-error-400)]">{error}</p>{/if}

				<button onclick={handleGenerate} disabled={generating || availableAI.length === 0}
					class="w-full rounded-xl bg-[var(--color-accent-500)] py-3 text-sm font-medium text-white
					       hover:bg-[var(--color-accent-400)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
					{#if generating}
						<svg class="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
						Generating script…
					{:else}
						Generate Script
					{/if}
				</button>
			</div>

		{:else if step === 'script' && script}
			<div class="flex flex-col gap-4 p-5">
				<div class="flex items-center justify-between gap-3">
					<span class="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
						Edit Script — {script.segments.length} segments
					</span>
					<button onclick={() => { step = 'configure'; script = null; }}
						class="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors">
						← Re-generate
					</button>
				</div>

				<div class="flex flex-col gap-3 max-h-[45vh] overflow-y-auto pr-1">
					{#each script.segments as seg, i}
						<div class="flex flex-col gap-2 rounded-xl border border-[var(--color-surface-700)] bg-[var(--color-surface-900)] p-3">
							<div class="flex items-center gap-2">
								<!-- Speaker dropdown -->
								<select
									value={seg.speaker}
									onchange={(e) => updateSegmentSpeaker(i, (e.target as HTMLSelectElement).value as AudioSegment['speaker'])}
									class="rounded-lg border border-[var(--color-surface-600)] bg-[var(--color-surface-800)]
									       px-2 py-1 text-xs text-[var(--color-text-primary)] focus:outline-none
									       focus:border-[var(--color-accent-500)] transition-colors"
									style="color-scheme: dark;"
								>
									{#each availableSpeakers as sp}
										<option value={sp} style="background: var(--color-surface-800);">
											{getSpeakerLabel(template, sp)}
										</option>
									{/each}
								</select>
								<!-- Preview -->
								<button onclick={() => previewSegment(i)} aria-label="Preview segment"
									class="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-text-muted)]
									       hover:bg-[var(--color-surface-800)] hover:text-[var(--color-accent-400)] transition-colors">
									<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
								</button>
								<!-- Remove -->
								<button onclick={() => removeSegment(i)} aria-label="Remove segment"
									class="ml-auto flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-text-muted)]
									       hover:bg-[var(--color-surface-800)] hover:text-[var(--color-error-400)] transition-colors">
									<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
										<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
									</svg>
								</button>
							</div>
							<textarea
								value={seg.text}
								oninput={(e) => updateSegmentText(i, (e.target as HTMLTextAreaElement).value)}
								rows={3}
								class="w-full resize-y rounded-lg border border-[var(--color-surface-700)]
								       bg-[var(--color-surface-800)] px-3 py-2 text-sm text-[var(--color-text-primary)]
								       focus:border-[var(--color-accent-500)] focus:outline-none transition-colors"
							></textarea>
						</div>
					{/each}
				</div>

				<button onclick={addSegment}
					class="self-start text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors">
					+ Add segment
				</button>

				{#if error}<p class="text-sm text-[var(--color-error-400)]">{error}</p>{/if}

				<!-- TTS Provider for synthesis -->
				<div class="flex flex-col gap-2 rounded-xl border border-[var(--color-surface-700)] bg-[var(--color-surface-900)] p-4">
					<span class="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">Voice Synthesis</span>
					<div class="flex gap-2">
						{#each (['browser', 'openai', 'elevenlabs'] as TTSProvider[]) as p}
							<button onclick={() => (ttsProvider = p)}
								class="rounded-lg border px-3 py-1.5 text-xs font-medium capitalize transition-colors
								       {ttsProvider === p
									? 'border-[var(--color-accent-500)] bg-[var(--color-accent-500)]/10 text-[var(--color-accent-400)]'
									: 'border-[var(--color-surface-600)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}">
								{p === 'browser' ? 'Browser TTS' : p === 'openai' ? 'OpenAI TTS' : 'ElevenLabs'}
							</button>
						{/each}
					</div>
					{#if ttsProvider === 'browser'}
						<p class="text-xs text-[var(--color-text-muted)]">Free — uses your device's built-in voices. Script saved for playback.</p>
					{:else if ttsProvider === 'openai'}
						<p class="text-xs text-[var(--color-text-muted)]">High quality — requires OpenAI API key. Audio file saved to database.</p>
					{:else}
						<p class="text-xs text-[var(--color-text-muted)]">Premium — requires ElevenLabs API key and Voice IDs in Settings → Audio.</p>
					{/if}
				</div>

				<button onclick={handleSynthesize} disabled={synthesizing || script.segments.length === 0}
					class="w-full rounded-xl bg-[var(--color-accent-500)] py-3 text-sm font-medium text-white
					       hover:bg-[var(--color-accent-400)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
					{#if synthesizing}
						<svg class="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
						Synthesizing… {synthProgress}%
					{:else}
						✓ Synthesize & Save to Database ({ttsProvider})
					{/if}
				</button>
			</div>
		{/if}
		</div>
	</div>
</div>
