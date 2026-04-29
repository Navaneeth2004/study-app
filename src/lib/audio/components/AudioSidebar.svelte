<script lang="ts">
	import { onMount } from 'svelte';
	import { listChapterAudio, deleteChapterAudio } from '$lib/audio/audioService';
	import { playTrack } from '$lib/audio/audioStore';
	import { playBrowserTTS, getBrowserVoices } from '$lib/audio/audioConversionService';
	import { getBrowserVoice1Idx, getBrowserVoice2Idx } from '$lib/audio/audioKeyStore';
	import type { ChapterAudio, PlayerTrack } from '$lib/audio/audioTypes';
	import { TEMPLATE_META } from '$lib/audio/audioTypes';

	interface Props {
		chapterId: string;
		chapterTitle: string;
		isOpen: boolean;
		onClose: () => void;
		onConvert: () => void;
		refreshKey: number;
	}
	let { chapterId, chapterTitle, isOpen, onClose, onConvert, refreshKey }: Props = $props();

	let audioList  = $state<ChapterAudio[]>([]);
	let loading    = $state(false);
	let error      = $state('');
	let confirmDel = $state<string | null>(null);

	$effect(() => {
		if (isOpen) loadAudio();
		// eslint-disable-next-line @typescript-eslint/no-unused-expressions
		refreshKey; // trigger reload when new audio saved
	});

	async function loadAudio() {
		loading = true; error = '';
		try { audioList = await listChapterAudio(chapterId); }
		catch (e) { error = e instanceof Error ? e.message : 'Could not load audio.'; }
		finally { loading = false; }
	}

	async function handleDelete(id: string) {
		try {
			await deleteChapterAudio(id);
			audioList = audioList.filter((a) => a.id !== id);
			confirmDel = null;
		} catch (e) { error = e instanceof Error ? e.message : 'Could not delete.'; }
	}

	function handlePlay(audio: ChapterAudio) {
		const track: PlayerTrack = { audio, chapterTitle };
		playTrack(track);
	}

	function formatDuration(seconds: number): string {
		if (!seconds) return '';
		const m = Math.floor(seconds / 60);
		const s = seconds % 60;
		return `${m}:${String(s).padStart(2, '0')}`;
	}
</script>

<!-- Backdrop (mobile) -->
{#if isOpen}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="fixed inset-0 z-40 bg-black/40 lg:hidden" onclick={onClose}></div>
{/if}

<!-- Sidebar panel — single scrollable area, no nested overflow -->
<div
	class="fixed right-0 z-40 flex flex-col border-l border-[var(--color-surface-700)]
	       bg-[var(--color-surface-950)] shadow-2xl transition-transform duration-300
	       {isOpen ? 'translate-x-0' : 'translate-x-full'}"
	style="top: 4rem; bottom: 0; width: min(320px, 100vw);"
>
	<!-- Header — fixed within panel -->
	<div class="flex shrink-0 items-center justify-between border-b border-[var(--color-surface-700)] px-5 py-4">
		<div class="flex items-center gap-2">
			<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
			     stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"
			     class="text-[var(--color-accent-400)]">
				<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
			</svg>
			<span class="text-sm font-semibold text-[var(--color-text-primary)]">Audio</span>
		</div>
		<button onclick={onClose} aria-label="Close audio panel"
			class="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-text-muted)]
			       hover:bg-[var(--color-surface-800)] hover:text-[var(--color-text-primary)] transition-colors">
			<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
				<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
			</svg>
		</button>
	</div>

	<!-- Scrollable body — single overflow-y-auto, no wrapper with separate scroll -->
	<div class="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
		{#if error}
			<p class="text-xs text-[var(--color-error-400)]">{error}</p>
		{/if}

		{#if loading}
			{#each Array(2) as _}
				<div class="h-16 rounded-xl bg-[var(--color-surface-800)]"></div>
			{/each}
		{:else if audioList.length === 0}
			<div class="flex flex-col items-center gap-3 py-8 text-center">
				<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor"
				     stroke-width="1.3" stroke-linecap="round" class="text-[var(--color-text-muted)]">
					<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
				</svg>
				<p class="text-sm text-[var(--color-text-muted)]">No audio versions yet.</p>
				<p class="text-xs text-[var(--color-text-muted)]">Convert this chapter to audio to listen while studying.</p>
			</div>
		{:else}
			{#each audioList as audio (audio.id)}
				{@const meta = TEMPLATE_META[audio.template]}
				<div class="flex flex-col gap-2 rounded-xl border border-[var(--color-surface-700)]
				            bg-[var(--color-surface-900)] p-3">
					<div class="flex items-start gap-2">
						<span class="text-xl shrink-0">{meta.emoji}</span>
						<div class="flex-1 min-w-0">
							<p class="text-sm font-medium text-[var(--color-text-primary)] truncate">{meta.label}</p>
							<p class="text-xs text-[var(--color-text-muted)]">
								{audio.script.segments.length} segments
								{#if audio.duration} · {formatDuration(audio.duration)}{/if}
								· {audio.ttsProvider}
							</p>
						</div>
					</div>

					<div class="flex items-center gap-2">
						<button onclick={() => handlePlay(audio)}
							class="flex flex-1 items-center justify-center gap-1.5 rounded-lg
							       bg-[var(--color-accent-500)] px-3 py-1.5 text-xs font-medium text-white
							       hover:bg-[var(--color-accent-400)] transition-colors">
							<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
							Play
						</button>

						{#if confirmDel !== audio.id}
							<button onclick={() => (confirmDel = audio.id)} aria-label="Delete"
								class="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-text-muted)]
								       hover:bg-[var(--color-surface-800)] hover:text-[var(--color-error-400)] transition-colors">
								<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
									<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
								</svg>
							</button>
						{:else}
							<button onclick={() => handleDelete(audio.id)}
								class="rounded-lg bg-[var(--color-error-500)]/15 px-2 py-1 text-xs
								       text-[var(--color-error-400)] hover:bg-[var(--color-error-500)]/25 transition-colors">
								Delete
							</button>
							<button onclick={() => (confirmDel = null)}
								class="rounded-lg border border-[var(--color-surface-600)] px-2 py-1 text-xs
								       text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
								Cancel
							</button>
						{/if}
					</div>
				</div>
			{/each}
		{/if}
	</div>

	<!-- Footer — fixed within panel -->
	<div class="shrink-0 border-t border-[var(--color-surface-700)] p-4">
		<button onclick={onConvert}
			class="flex w-full items-center justify-center gap-2 rounded-xl
			       bg-[var(--color-accent-500)] px-4 py-2.5 text-sm font-medium text-white
			       hover:bg-[var(--color-accent-400)] transition-colors">
			<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
			Convert to Audio
		</button>
	</div>
</div>
