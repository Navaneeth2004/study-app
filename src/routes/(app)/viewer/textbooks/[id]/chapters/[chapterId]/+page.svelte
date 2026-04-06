<script lang="ts">
	import { page } from '$app/stores';
	import { getTextbook, getChapter, listChapters, listBlocks, listFlashcardsByChapter } from '$lib/viewer/viewerService';
	import TitleBlockRenderer from '$lib/viewer/components/blocks/TitleBlockRenderer.svelte';
	import SubtitleBlockRenderer from '$lib/viewer/components/blocks/SubtitleBlockRenderer.svelte';
	import ParagraphBlockRenderer from '$lib/viewer/components/blocks/ParagraphBlockRenderer.svelte';
	import BulletListRenderer from '$lib/viewer/components/blocks/BulletListRenderer.svelte';
	import TableBlockRenderer from '$lib/viewer/components/blocks/TableBlockRenderer.svelte';
	import ImageBlockRenderer from '$lib/viewer/components/blocks/ImageBlockRenderer.svelte';
	import AudioBlockRenderer from '$lib/viewer/components/blocks/AudioBlockRenderer.svelte';
	import DividerBlockRenderer from '$lib/viewer/components/blocks/DividerBlockRenderer.svelte';
	import CalloutBlockRenderer from '$lib/viewer/components/blocks/CalloutBlockRenderer.svelte';
	import VideoBlockRenderer from '$lib/viewer/components/blocks/VideoBlockRenderer.svelte';
	import QuoteBlockRenderer from '$lib/viewer/components/blocks/QuoteBlockRenderer.svelte';
	import BookmarkButton from '$lib/shared/components/BookmarkButton.svelte';
	import NotesPanel from '$lib/notes/components/NotesPanel.svelte';
	import type { RuntimeBlock } from '$lib/creator/contentTypes';
	import type { Chapter } from '$lib/creator/creatorTypes';

	// Reactive params - these update when navigating prev/next
	const textbookId = $derived($page.params.id as string);
	const chapterId = $derived($page.params.chapterId as string);

	let textbookTitle = $state('');
	let chapter = $state<Chapter | null>(null);
	let allChapters = $state<Chapter[]>([]);
	let blocks = $state<RuntimeBlock[]>([]);
	let hasFlashcards = $state(false);
	let loading = $state(true);
	let error = $state('');
	let notesOpen = $state(false);

	const prevChapter = $derived(
		allChapters[allChapters.findIndex((c) => c.id === chapterId) - 1] ?? null
	);
	const nextChapter = $derived(
		allChapters[allChapters.findIndex((c) => c.id === chapterId) + 1] ?? null
	);

	// Re-load whenever chapterId changes (handles prev/next navigation)
	$effect(() => {
		const tbId = textbookId;
		const chId = chapterId;
		if (!tbId || !chId) return;

		loading = true;
		error = '';
		blocks = [];
		chapter = null;
		hasFlashcards = false;
		notesOpen = false;

		Promise.all([
			getTextbook(tbId),
			getChapter(chId),
			listChapters(tbId),
			listBlocks(chId),
			listFlashcardsByChapter(chId)
		]).then(([textbook, ch, chs, blks, cards]) => {
			textbookTitle = textbook.title;
			chapter = ch;
			allChapters = chs;
			blocks = blks;
			hasFlashcards = cards.length > 0;
		}).catch((e) => {
			error = e instanceof Error ? e.message : 'Could not load chapter.';
		}).finally(() => {
			loading = false;
		});
	});
</script>

<svelte:head><title>{chapter?.title ?? 'Chapter'} — StudyApp</title></svelte:head>

{#if chapter}
	<NotesPanel chapterId={chapterId} isOpen={notesOpen} onClose={() => (notesOpen = false)} />
{/if}

<div class="flex flex-col gap-6 max-w-2xl">
	<nav class="flex items-center gap-2 text-sm flex-wrap">
		<a href="/viewer" class="text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors">Home</a>
		<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" class="text-[var(--color-text-muted)]"><polyline points="9 18 15 12 9 6"/></svg>
		<a href="/viewer/textbooks/{textbookId}" class="text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors truncate max-w-40">{textbookTitle || '…'}</a>
		<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" class="text-[var(--color-text-muted)]"><polyline points="9 18 15 12 9 6"/></svg>
		<span class="text-[var(--color-text-secondary)]">{chapter?.title ?? '…'}</span>
	</nav>

	{#if loading}
		<div class="flex flex-col gap-4">
			<div class="h-8 w-48 rounded bg-[var(--color-surface-800)]"></div>
			<div class="h-32 rounded-xl bg-[var(--color-surface-800)]"></div>
		</div>
	{:else if error}
		<p class="text-sm text-[var(--color-error-400)]">{error}</p>
	{:else if chapter}
		<div class="flex items-start justify-between gap-3">
			<h1 class="font-display text-3xl text-[var(--color-text-primary)] flex-1 leading-tight">{chapter.title}</h1>
			<div class="flex shrink-0 items-center gap-1 pt-1">
				<BookmarkButton contentType="chapter" contentId={chapter.id} contentTitle={chapter.title}
					contentSubtitle={textbookTitle} contentMeta={{ textbookId }} />
				<button onclick={() => (notesOpen = !notesOpen)} aria-label="Toggle notes"
					class="flex h-8 w-8 items-center justify-center rounded-lg transition-colors
					       {notesOpen ? 'bg-[var(--color-accent-500)]/15 text-[var(--color-accent-400)]' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-800)] hover:text-[var(--color-text-secondary)]'}">
					<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
						<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
						<polyline points="14 2 14 8 20 8"/>
						<line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
					</svg>
				</button>
				{#if hasFlashcards}
					<div class="mx-1 h-5 w-px bg-[var(--color-surface-600)]"></div>
					<a href="/viewer/flashcards/chapter/{chapterId}"
						class="flex items-center gap-1.5 rounded-xl border border-[var(--color-accent-500)]/50 px-3 py-1.5 text-sm text-[var(--color-accent-400)] hover:bg-[var(--color-accent-500)]/10 transition-colors">
						<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
							<rect x="2" y="4" width="14" height="10" rx="2"/><rect x="8" y="10" width="14" height="10" rx="2"/>
						</svg>
						Flashcards
					</a>
				{/if}
			</div>
		</div>

		<div class="flex flex-col gap-5">
			{#each blocks as block (block.id)}
				{@const d = block.data as Record<string, unknown>}
				{#if block.type === 'title'}<TitleBlockRenderer data={d} />
				{:else if block.type === 'subtitle'}<SubtitleBlockRenderer data={d} />
				{:else if block.type === 'paragraph'}<ParagraphBlockRenderer data={d} />
				{:else if block.type === 'bullet_list'}<BulletListRenderer data={d} />
				{:else if block.type === 'table'}<TableBlockRenderer data={d} />
				{:else if block.type === 'image'}<ImageBlockRenderer data={d} />
				{:else if block.type === 'audio'}<AudioBlockRenderer data={d} />
				{:else if block.type === 'divider'}<DividerBlockRenderer />
				{:else if block.type === 'callout'}<CalloutBlockRenderer data={d} />
				{:else if block.type === 'video'}<VideoBlockRenderer data={d} />
				{:else if block.type === 'quote'}<QuoteBlockRenderer data={d} />
				{/if}
			{/each}
		</div>

		{#if blocks.length === 0}
			<p class="text-sm text-[var(--color-text-muted)]">This chapter has no content yet.</p>
		{/if}

		<!-- Prev / Next navigation -->
		<div class="flex items-center justify-between gap-4 border-t border-[var(--color-surface-700)] pt-6">
			{#if prevChapter}
				<a href="/viewer/textbooks/{textbookId}/chapters/{prevChapter.id}"
					class="flex items-center gap-2 rounded-xl border border-[var(--color-surface-600)] px-4 py-2.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-surface-500)] transition-colors">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
					<span class="truncate max-w-40">{prevChapter.title}</span>
				</a>
			{:else}<div></div>{/if}

			{#if nextChapter}
				<a href="/viewer/textbooks/{textbookId}/chapters/{nextChapter.id}"
					class="flex items-center gap-2 rounded-xl border border-[var(--color-surface-600)] px-4 py-2.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-surface-500)] transition-colors ml-auto">
					<span class="truncate max-w-40">{nextChapter.title}</span>
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>
				</a>
			{/if}
		</div>
	{/if}
</div>
