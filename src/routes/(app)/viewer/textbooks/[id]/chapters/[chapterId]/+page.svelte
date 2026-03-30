<script lang="ts">
	import { onMount } from 'svelte';
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
	import BookmarkButton from '$lib/shared/components/BookmarkButton.svelte';
	import NotesPanel from '$lib/notes/components/NotesPanel.svelte';
	import type { RuntimeBlock } from '$lib/creator/contentTypes';
	import type { Chapter } from '$lib/creator/creatorTypes';
	import BlockBookmarkWrapper from '$lib/viewer/components/BlockBookmarkWrapper.svelte';

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

	const prevChapter = $derived(allChapters[allChapters.findIndex((c) => c.id === chapterId) - 1] ?? null);
	const nextChapter = $derived(allChapters[allChapters.findIndex((c) => c.id === chapterId) + 1] ?? null);

	onMount(async () => {
		loading = true;
		try {
			const [textbook, ch, chs, blks, cards] = await Promise.all([
				getTextbook(textbookId), getChapter(chapterId),
				listChapters(textbookId), listBlocks(chapterId),
				listFlashcardsByChapter(chapterId)
			]);
			textbookTitle = textbook.title;
			chapter = ch; allChapters = chs; blocks = blks;
			hasFlashcards = cards.length > 0;
		} catch (e) { error = e instanceof Error ? e.message : 'Could not load chapter.'; }
		finally { loading = false; }
	});
</script>

<svelte:head>
	<title>{chapter?.title ?? 'Chapter'} — StudyApp</title>
</svelte:head>

{#if chapter}
	<NotesPanel chapterId={chapterId} isOpen={notesOpen} onClose={() => (notesOpen = false)} />
{/if}

<div class="flex flex-col gap-6 max-w-2xl">
	<!-- Breadcrumb -->
	<nav class="flex items-center gap-2 text-sm flex-wrap">
		<a href="/viewer" class="text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors">Home</a>
		<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" class="text-[var(--color-text-muted)]"><polyline points="9 18 15 12 9 6"/></svg>
		<a href="/viewer/textbooks/{textbookId}" class="text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors truncate max-w-40">{textbookTitle || '…'}</a>
		<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" class="text-[var(--color-text-muted)]"><polyline points="9 18 15 12 9 6"/></svg>
		<!-- Chapter title in breadcrumb only — NOT repeated as h1 below -->
		<span class="text-[var(--color-text-secondary)] truncate max-w-48">{chapter?.title ?? '…'}</span>
	</nav>

	{#if loading}
		<div class="flex flex-col gap-4">
			<div class="h-4 w-48 rounded bg-[var(--color-surface-800)]"></div>
			<div class="h-32 rounded-xl bg-[var(--color-surface-800)]"></div>
		</div>
	{:else if error}
		<p class="text-sm text-[var(--color-error-400)]">{error}</p>
	{:else if chapter}
		<!-- Compact toolbar: bookmark + notes + flashcards — no title h1 -->
		<div class="flex items-center gap-1 justify-end">
			<BookmarkButton
				contentType="chapter"
				contentId={chapter.id}
				contentTitle={chapter.title}
				contentSubtitle={textbookTitle}
				contentMeta={{ textbookId }}
			/>
			<button
				onclick={() => (notesOpen = !notesOpen)}
				aria-label="Toggle notes"
				class="flex h-8 w-8 items-center justify-center rounded-lg transition-colors
				       {notesOpen ? 'bg-[var(--color-accent-500)]/15 text-[var(--color-accent-400)]' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-800)] hover:text-[var(--color-text-secondary)]'}"
			>
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

		<!-- Content blocks -->
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
					class="flex items-center gap-2 rounded-xl border border-[var(--color-surface-600)] px-4 py-2.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
					<span class="truncate max-w-40">{prevChapter.title}</span>
				</a>
			{:else}<div></div>{/if}
			{#if nextChapter}
				<a href="/viewer/textbooks/{textbookId}/chapters/{nextChapter.id}"
					class="flex items-center gap-2 rounded-xl border border-[var(--color-surface-600)] px-4 py-2.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors ml-auto">
					<span class="truncate max-w-40">{nextChapter.title}</span>
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>
				</a>
			{/if}
		</div>
	{/if}
</div>
