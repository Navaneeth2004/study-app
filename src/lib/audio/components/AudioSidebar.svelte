<script lang="ts">
	import { onMount } from 'svelte';
	import type { ChapterAudio } from '$lib/audio/audioTypes';
	import { TEMPLATE_META } from '$lib/audio/audioTypes';
	import { listChapterAudio, deleteChapterAudio } from '$lib/audio/audioService';
	import { playTrack, playerTrackStore } from '$lib/audio/audioStore';

	interface Props {
		chapterId:    string;
		chapterTitle: string;
		isOpen:       boolean;
		onClose:      () => void;
		onConvert:    () => void;
		refreshKey?:  number;
	}

	let { chapterId, chapterTitle, isOpen, onClose, onConvert, refreshKey = 0 }: Props = $props();

	let items   = $state<ChapterAudio[]>([]);
	let loading = $state(false);
	let error   = $state('');
	let confirmDeleteId = $state<string | null>(null);

	const bottomStyle = $derived($playerTrackStore ? 'bottom: 5rem' : 'bottom: 0');

	$effect(() => {
		// eslint-disable-next-line @typescript-eslint/no-unused-expressions
		refreshKey;
		if (isOpen) load();
	});

	async function load() {
		loading = true; error = '';
		try { items = await listChapterAudio(chapterId); }
		catch (e) { error = e instanceof Error ? e.message : 'Could not load audio.'; }
		finally { loading = false; }
	}

	async function handleDelete(id: string) {
		try {
			await deleteChapterAudio(id);
			items = items.filter((a) => a.id !== id);
			confirmDeleteId = null;
		} catch (e) { error = e instanceof Error ? e.message : 'Could not delete.'; }
	}

	function fmtDuration(s: number): string {
		if (!s) return '';
		const m = Math.floor(s / 60);
		const sec = s % 60;
		return `${m}:${String(sec).padStart(2, '0')}`;
	}
</script>

{#if isOpen}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="fixed inset-0 z-40 bg-black/40 lg:hidden" onclick={onClose}></div>
{/if}

<div class="fixed right-0 z-40 flex flex-col border-l border-[var(--color-surface-700)]
            bg-[var(--color-surface-950)] shadow-2xl transition-all duration-300
            {isOpen ? 'translate-x-0' : 'translate-x-full'}"
     style="top: 4rem; {bottomStyle}; width: min(320px, 100vw);">

	<div class="flex shrink-0 items-center justify-between border-b border-[var(--color-surface-700)] px-5 py-4">
		<div class="flex items-center gap-2">
			<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
			     stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"
			     class="text-[var(--color-accent-400)]">
				<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
			</svg>
			<span class="text-sm font-semibold text-[var(--color-text-primary)]">Chapter Audio</span>
		</div>
		<button onclick={onClose} aria-label="Close"
			class="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-text-muted)]
			       hover:bg-[var(--color-surface-800)] hover:text-[var(--color-text-primary)] transition-colors">
			<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
				<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
			</svg>
		</button>
	</div>

	<div class="shrink-0 border-b border-[var(--color-surface-700)] p-4">
		<button onclick={onConvert}
			class="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-accent-500)]
			       py-2.5 text-sm font-medium text-white hover:bg-[var(--color-accent-400)] transition-colors">
			<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
				<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
			</svg>
			New Audio Version
		</button>
	</div>

	<div class="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
		{#if loading}
			{#each Array(2) as _}<div class="h-16 rounded-xl bg-[var(--color-surface-800)]"></div>{/each}
		{:else if error}
			<p class="text-xs text-[var(--color-error-400)]">{error}</p>
		{:else if items.length === 0}
			<div class="flex flex-col items-center gap-2 py-10 text-center">
				<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"
				     stroke-linecap="round" class="text-[var(--color-text-muted)]">
					<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
				</svg>
				<p class="text-xs text-[var(--color-text-muted)]">No audio versions yet.<br>Click "New Audio Version" above.</p>
			</div>
		{:else}
			{#each items as audio (audio.id)}
				<div class="flex flex-col gap-2 rounded-xl border border-[var(--color-surface-700)] bg-[var(--color-surface-900)] p-3">
					<div class="flex items-start gap-2">
						<span class="text-lg mt-0.5">{TEMPLATE_META[audio.template]?.emoji ?? '🔊'}</span>
						<div class="flex-1 min-w-0">
							<p class="text-sm font-medium text-[var(--color-text-primary)] truncate">{audio.title}</p>
							<p class="text-xs text-[var(--color-text-muted)]">
								{TEMPLATE_META[audio.template]?.label ?? audio.template}
								{#if audio.duration} · {fmtDuration(audio.duration)}{/if}
								· {audio.ttsProvider}
							</p>
						</div>
					</div>
					<div class="flex items-center gap-2">
						<button onclick={() => playTrack({ audio, chapterTitle })}
							class="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-[var(--color-accent-500)] py-1.5 text-xs font-medium text-white hover:bg-[var(--color-accent-400)] transition-colors">
							<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
							Play
						</button>
						{#if confirmDeleteId === audio.id}
							<button onclick={() => handleDelete(audio.id)}
								class="rounded-lg bg-[var(--color-error-500)]/15 px-2 py-1.5 text-xs text-[var(--color-error-400)] hover:bg-[var(--color-error-500)]/25 transition-colors">Delete</button>
							<button onclick={() => (confirmDeleteId = null)}
								class="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors">Cancel</button>
						{:else}
							<button onclick={() => (confirmDeleteId = audio.id)}
								class="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-surface-800)] hover:text-[var(--color-error-400)] transition-colors">
								<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
							</button>
						{/if}
					</div>
				</div>
			{/each}
		{/if}
	</div>
</div>
