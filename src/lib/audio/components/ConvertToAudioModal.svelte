<script lang="ts">
	import { onMount } from 'svelte';
	import type { RuntimeBlock } from '$lib/creator/contentTypes';
	import type { AudioTemplate, AudioScript, AudioSegment, ChapterAudio } from '$lib/audio/audioTypes';
	import { TEMPLATE_META } from '$lib/audio/audioTypes';
	import { generateScript, synthesizeScript, playBrowserTTS, getBrowserVoices, type BrowserTTSHandle } from '$lib/audio/audioConversionService';
	import { createChapterAudio } from '$lib/audio/audioService';
	import { getAvailableProviders, getKey } from '$lib/settings/aiKeyStore';
	import {
		getTTSProvider, getOpenAIVoice1, getOpenAIVoice2,
		getElevenLabsKey, getElevenLabsVoice1, getElevenLabsVoice2,
		getBrowserVoice1Idx, getBrowserVoice2Idx
	} from '$lib/audio/audioKeyStore';
	import { playTrack } from '$lib/audio/audioStore';

	interface Props {
		chapterId:    string;
		chapterTitle: string;
		blocks:       RuntimeBlock[];
		onSaved:      (audio: ChapterAudio) => void;
		onClose:      () => void;
	}

	let { chapterId, chapterTitle, blocks, onSaved, onClose }: Props = $props();

	type Step = 'config' | 'generating' | 'edit' | 'saving';
	let step            = $state<Step>('config');
	let template        = $state<AudioTemplate>('podcast');
	let editedSegments  = $state<AudioSegment[]>([]);
	let genProgress     = $state(0);
	let synthProgress   = $state(0);
	let error           = $state('');
	let previewHandle   = $state<BrowserTTSHandle | null>(null);
	let previewingIdx   = $state<number | null>(null);
	let browserVoices   = $state<SpeechSynthesisVoice[]>([]);

	const ttsProvider = getTTSProvider();
	const aiProviders = getAvailableProviders();
	const hasAI       = aiProviders.length > 0;
	const aiProvider  = aiProviders[0] ?? '';
	const aiKey       = aiProvider ? getKey(aiProvider) : '';

	onMount(() => {
		browserVoices = getBrowserVoices();
		if (browserVoices.length === 0 && window.speechSynthesis) {
			window.speechSynthesis.addEventListener('voiceschanged', () => { browserVoices = getBrowserVoices(); }, { once: true });
		}
		return () => { previewHandle?.stop(); };
	});

	// ── extract plain text ────────────────────────────────────────────────────
	function extractText(): string {
		return blocks.map((b) => {
			const d = b.data as Record<string, unknown>;
			switch (b.type) {
				case 'title': case 'subtitle': case 'callout': return (d.text as string) ?? '';
				case 'paragraph': return ((d.html as string) ?? '').replace(/<[^>]+>/g, ' ').trim();
				case 'bullet_list': return ((d.items as string[]) ?? []).join('. ');
				case 'table': {
					const hdr  = ((d.headers as string[]) ?? []).join(', ');
					const rows = ((d.rows as string[][]) ?? []).flat().join(', ');
					return `${hdr}. ${rows}`;
				}
				default: return '';
			}
		}).filter(Boolean).join('\n\n');
	}

	// ── Step 1: generate script ───────────────────────────────────────────────
	async function handleGenerate() {
		if (!hasAI) { error = 'No AI API key configured. Go to Settings → AI Settings.'; return; }
		error = ''; step = 'generating'; genProgress = 10;
		try {
			const text = extractText();
			if (!text.trim()) throw new Error('This chapter has no readable text content.');
			genProgress = 30;
			const script = await generateScript(chapterTitle, text, template, aiProvider, aiKey);
			genProgress = 100;
			editedSegments = script.segments.map((s) => ({ ...s }));
			step = 'edit';
		} catch (e) {
			error = e instanceof Error ? e.message : 'Generation failed.';
			step  = 'config';
		}
	}

	// ── Segment editing ───────────────────────────────────────────────────────
	function updateSeg(i: number, field: 'speaker' | 'text', value: string) {
		editedSegments = editedSegments.map((s, idx) =>
			idx === i ? { ...s, [field]: value } as AudioSegment : s
		);
	}
	function removeSeg(i: number) {
		editedSegments = editedSegments.filter((_, idx) => idx !== i);
	}
	function addSeg() {
		editedSegments = [...editedSegments, { speaker: 'narrator', text: '' }];
	}

	// ── Preview single segment via browser TTS ────────────────────────────────
	function previewSeg(i: number) {
		previewHandle?.stop();
		if (previewingIdx === i) { previewHandle = null; previewingIdx = null; return; }
		const seg  = editedSegments[i];
		const synth = window.speechSynthesis;
		synth.cancel();
		const utt   = new SpeechSynthesisUtterance(seg.text);
		const vocs  = synth.getVoices();
		utt.voice   = seg.speaker === 'guest' ? (vocs[getBrowserVoice2Idx()] ?? vocs[0]) : (vocs[getBrowserVoice1Idx()] ?? vocs[0]);
		previewingIdx = i;
		utt.onend  = () => { previewingIdx = null; };
		utt.onerror = () => { previewingIdx = null; };
		synth.speak(utt);
	}

	// ── Step 2: Save to database ──────────────────────────────────────────────
	async function handleSave() {
		if (editedSegments.length === 0) { error = 'Add at least one segment.'; return; }
		previewHandle?.stop(); previewingIdx = null;
		error = ''; step = 'saving'; synthProgress = 0;

		const finalScript: AudioScript = { template, segments: editedSegments };

		try {
			let audioBlob: Blob | undefined;

			if (ttsProvider !== 'browser') {
				// Synthesize to file
				const cfg = {
					provider:         ttsProvider as 'openai' | 'elevenlabs',
					openaiKey:        getKey('openai'),
					openaiVoice1:     getOpenAIVoice1(),
					openaiVoice2:     getOpenAIVoice2(),
					elevenLabsKey:    getElevenLabsKey(),
					elevenLabsVoice1: getElevenLabsVoice1(),
					elevenLabsVoice2: getElevenLabsVoice2()
				};
				audioBlob = await synthesizeScript(finalScript, cfg, (p) => { synthProgress = p; });
			} else {
				synthProgress = 100;
			}

			// Estimate duration (rough: ~130 words/min)
			const wordCount = editedSegments.reduce((s, seg) => s + seg.text.split(' ').length, 0);
			const duration  = Math.round((wordCount / 130) * 60);

			const saved = await createChapterAudio({
				chapterId, template,
				title:       `${TEMPLATE_META[template].label} — ${chapterTitle}`,
				script:      finalScript,
				audioBlob,
				duration,
				ttsProvider
			});

			playTrack({ audio: saved, chapterTitle });
			onSaved(saved);
			onClose();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not save.';
			step  = 'edit';
		}
	}

	const SPEAKERS: AudioSegment['speaker'][] = ['host', 'guest', 'narrator'];
</script>

<!-- Backdrop -->
<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
     onclick={step === 'config' || step === 'edit' ? onClose : undefined}>
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border
	            border-[var(--color-surface-700)] bg-[var(--color-surface-950)] shadow-2xl"
	     onclick={(e) => e.stopPropagation()}>

		<!-- Header -->
		<div class="flex items-center justify-between border-b border-[var(--color-surface-700)] px-5 py-4 sticky top-0 bg-[var(--color-surface-950)] z-10">
			<div>
				<span class="text-sm font-semibold text-[var(--color-text-primary)]">Convert to Audio</span>
				<p class="text-xs text-[var(--color-text-muted)] truncate max-w-xs">{chapterTitle}</p>
			</div>
			{#if step === 'config' || step === 'edit'}
				<button onclick={onClose} aria-label="Close"
					class="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-text-muted)]
					       hover:bg-[var(--color-surface-800)] hover:text-[var(--color-text-primary)] transition-colors">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
						<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
					</svg>
				</button>
			{/if}
		</div>

		<div class="flex flex-col gap-5 p-5">

			<!-- ── CONFIG ────────────────────────────────────────────────────── -->
			{#if step === 'config'}
				<div class="flex flex-col gap-2">
					<span class="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">Format</span>
					<div class="grid grid-cols-2 gap-2">
						{#each Object.entries(TEMPLATE_META) as [key, meta]}
							<button onclick={() => (template = key as AudioTemplate)}
								class="flex flex-col gap-1 rounded-xl border p-3 text-left transition-colors
								       {template === key ? 'border-[var(--color-accent-500)] bg-[var(--color-accent-500)]/10' : 'border-[var(--color-surface-600)] hover:border-[var(--color-surface-500)]'}">
								<span class="text-base">{meta.emoji}</span>
								<span class="text-sm font-medium {template === key ? 'text-[var(--color-accent-400)]' : 'text-[var(--color-text-primary)]'}">{meta.label}</span>
								<span class="text-xs text-[var(--color-text-muted)]">{meta.desc}</span>
							</button>
						{/each}
					</div>
				</div>

				<div class="rounded-xl border border-[var(--color-surface-700)] bg-[var(--color-surface-900)] px-4 py-3 flex flex-col gap-1.5">
					<div class="flex items-center justify-between text-xs">
						<span class="text-[var(--color-text-muted)]">AI for script</span>
						{#if hasAI}
							<span class="font-medium capitalize text-[var(--color-success-500)]">{aiProvider} ✓</span>
						{:else}
							<a href="/settings" onclick={onClose} class="text-[var(--color-accent-400)] hover:underline">Add key in Settings</a>
						{/if}
					</div>
					<div class="flex items-center justify-between text-xs">
						<span class="text-[var(--color-text-muted)]">Voice synthesis</span>
						<span class="font-medium capitalize text-[var(--color-text-secondary)]">
							{ttsProvider === 'browser' ? '🔊 Browser (free)' : ttsProvider === 'openai' ? '🤖 OpenAI TTS' : '🎙️ ElevenLabs'}
						</span>
					</div>
				</div>

				{#if error}<p class="text-xs text-[var(--color-error-400)]">{error}</p>{/if}

				<button onclick={handleGenerate} disabled={!hasAI}
					class="flex items-center justify-center gap-2 rounded-xl bg-[var(--color-accent-500)] px-4 py-3
					       text-sm font-medium text-white hover:bg-[var(--color-accent-400)]
					       disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
					</svg>
					Generate {TEMPLATE_META[template].label}
				</button>

			<!-- ── GENERATING ─────────────────────────────────────────────── -->
			{:else if step === 'generating'}
				<div class="flex flex-col items-center gap-4 py-6">
					<svg class="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none"
					     stroke="currentColor" stroke-width="2" stroke-linecap="round" style="color:var(--color-accent-400)">
						<path d="M21 12a9 9 0 11-6.219-8.56"/>
					</svg>
					<div class="w-full flex flex-col gap-2">
						<div class="h-2 w-full overflow-hidden rounded-full bg-[var(--color-surface-700)]">
							<div class="h-full rounded-full bg-[var(--color-accent-500)] transition-all duration-500" style="width:{genProgress}%"></div>
						</div>
						<p class="text-center text-xs text-[var(--color-text-muted)]">
							{genProgress < 50 ? 'Sending to AI…' : 'Processing script…'}
						</p>
					</div>
				</div>

			<!-- ── EDIT ──────────────────────────────────────────────────────── -->
			{:else if step === 'edit'}
				<div class="flex items-center justify-between">
					<span class="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
						Edit Script — {editedSegments.length} segments
					</span>
					<button onclick={() => { step = 'config'; editedSegments = []; }}
						class="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors">← Re-generate</button>
				</div>

				<div class="flex flex-col gap-3 max-h-96 overflow-y-auto pr-1">
					{#each editedSegments as seg, i}
						<div class="flex flex-col gap-2 rounded-xl border border-[var(--color-surface-700)] bg-[var(--color-surface-800)] p-3">
							<div class="flex items-center gap-2">
								<!-- Speaker -->
								<select value={seg.speaker}
								        onchange={(e) => updateSeg(i, 'speaker', (e.target as HTMLSelectElement).value)}
									class="rounded-lg border border-[var(--color-surface-600)] bg-[var(--color-surface-700)] px-2 py-1 text-xs text-[var(--color-text-secondary)] focus:outline-none" style="color-scheme:dark;">
									{#each SPEAKERS as sp}<option value={sp}>{sp}</option>{/each}
								</select>

								<!-- Preview segment -->
								<button onclick={() => previewSeg(i)}
									class="flex h-6 w-6 items-center justify-center rounded text-[var(--color-text-muted)] hover:text-[var(--color-accent-400)] transition-colors"
									aria-label="Preview segment">
									{#if previewingIdx === i}
										<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
									{:else}
										<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
									{/if}
								</button>

								<!-- Remove -->
								<button onclick={() => removeSeg(i)} aria-label="Remove segment"
									class="ml-auto flex h-6 w-6 items-center justify-center rounded text-[var(--color-text-muted)] hover:text-[var(--color-error-400)] transition-colors">
									<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
								</button>
							</div>

							<textarea value={seg.text} rows={3}
							          oninput={(e) => updateSeg(i, 'text', (e.target as HTMLTextAreaElement).value)}
								class="w-full resize-none bg-transparent text-sm text-[var(--color-text-primary)]
								       placeholder:text-[var(--color-text-muted)] focus:outline-none leading-relaxed"
								placeholder="Segment text…"></textarea>
						</div>
					{/each}

					<!-- Add segment -->
					<button onclick={addSeg}
						class="flex items-center justify-center gap-1.5 rounded-xl border border-dashed
						       border-[var(--color-surface-600)] py-2.5 text-xs text-[var(--color-text-muted)]
						       hover:border-[var(--color-accent-500)] hover:text-[var(--color-accent-400)] transition-colors">
						<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
						Add Segment
					</button>
				</div>

				{#if error}<p class="text-xs text-[var(--color-error-400)]">{error}</p>{/if}

				<button onclick={handleSave} disabled={editedSegments.length === 0}
					class="rounded-xl bg-[var(--color-accent-500)] px-4 py-3 text-sm font-medium text-white
					       hover:bg-[var(--color-accent-400)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
					{ttsProvider === 'browser' ? '✓ Save to Database' : `✓ Synthesize & Save to Database (${ttsProvider})`}
				</button>

			<!-- ── SAVING / SYNTHESIZING ──────────────────────────────────────── -->
			{:else if step === 'saving'}
				<div class="flex flex-col items-center gap-4 py-6">
					<svg class="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none"
					     stroke="currentColor" stroke-width="2" stroke-linecap="round" style="color:var(--color-accent-400)">
						<path d="M21 12a9 9 0 11-6.219-8.56"/>
					</svg>
					<div class="w-full flex flex-col gap-2">
						<div class="h-2 w-full overflow-hidden rounded-full bg-[var(--color-surface-700)]">
							<div class="h-full rounded-full bg-[var(--color-accent-500)] transition-all duration-300" style="width:{synthProgress}%"></div>
						</div>
						<p class="text-center text-xs text-[var(--color-text-muted)]">
							{ttsProvider === 'browser' ? 'Saving to database…' : `Synthesizing audio with ${ttsProvider}… ${synthProgress}%`}
						</p>
					</div>
				</div>
			{/if}

		</div>
	</div>
</div>
