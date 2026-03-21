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
	import type { RuntimeBlock } from '$lib/creator/contentTypes';
	import type { Chapter } from '$lib/creator/creatorTypes';

	const textbookId = $derived($page.params.id as string);
	const chapterId = $derived($page.params.chapterId as string);

	let textbookTitle = $state('');
	let chapter = $state<Chapter | null>(null);
	let allChapters = $state<Chapter[]>([]);
	let blocks = $state<RuntimeBlock[]>([]);
	let hasFlashcards = $state(false);
	let loading = $state(true);
	let error = $state('');

	const prevChapter = $derived(
		allChapters[allChapters.findIndex((c) => c.id === chapterId) - 1] ?? null
	);
	const nextChapter = $derived(
		allChapters[allChapters.findIndex((c) => c.id === chapterId) + 1] ?? null
	);

	onMount(async () => {
		loading = true;
		try {
			const [textbook, ch, chs, blks, cards] = await Promise.all([
				getTextbook(textbookId),
				getChapter(chapterId),
				listChapters(textbookId),
				listBlocks(chapterId),
				listFlashcardsByChapter(chapterId)
			]);
			textbookTitle = textbook.title;
			chapter = ch;
			allChapters = chs;
			blocks = blks;
			hasFlashcards = cards.length > 0;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not load chapter.';
		} finally {
			loading = false;
		}
	});
</script>

<svelte:head>
	<title>{chapter?.title ?? 'Chapter'} — StudyApp</title>
</svelte:head>

<div class="flex flex-col gap-6 max-w-2xl">
	<!-- Breadcrumb -->
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
		<!-- Header -->
		<div class="flex items-center justify-between gap-4">
			<h1 class="font-display text-3xl text-[var(--color-text-primary)]">{chapter.title}</h1>
			{#if hasFlashcards}
				<a
					href="/viewer/flashcards/chapter/{chapterId}"
					class="flex shrink-0 items-center gap-2 rounded-xl border border-[var(--color-accent-500)]/50
					       px-4 py-2 text-sm text-[var(--color-accent-400)] hover:bg-[var(--color-accent-500)]/10
					       transition-colors"
				>
					<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
						<rect x="2" y="4" width="14" height="10" rx="2"/><rect x="8" y="10" width="14" height="10" rx="2"/>
					</svg>
					Study Flashcards
				</a>
			{/if}
		</div>

		<!-- Block content -->
		<div class="flex flex-col gap-5">
			{#each blocks as block (block.id)}
				{@const d = block.data as Record<string, unknown>}
				{#if block.type === 'title'}
					<TitleBlockRenderer data={d} />
				{:else if block.type === 'subtitle'}
					<SubtitleBlockRenderer data={d} />
				{:else if block.type === 'paragraph'}
					<ParagraphBlockRenderer data={d} />
				{:else if block.type === 'bullet_list'}
					<BulletListRenderer data={d} />
				{:else if block.type === 'table'}
					<TableBlockRenderer data={d} />
				{:else if block.type === 'image'}
					<ImageBlockRenderer data={d} />
				{:else if block.type === 'audio'}
					<AudioBlockRenderer data={d} />
				{:else if block.type === 'divider'}
					<DividerBlockRenderer />
				{:else if block.type === 'callout'}
					<CalloutBlockRenderer data={d} />
				{:else if block.type === 'video'}
					<VideoBlockRenderer data={d} />
				{/if}
			{/each}
		</div>

		{#if blocks.length === 0}
			<p class="text-sm text-[var(--color-text-muted)]">This chapter has no content yet.</p>
		{/if}

		<!-- Prev / Next navigation -->
		<div class="flex items-center justify-between gap-4 border-t border-[var(--color-surface-700)] pt-6">
			{#if prevChapter}
				<a
					href="/viewer/textbooks/{textbookId}/chapters/{prevChapter.id}"
					class="flex items-center gap-2 rounded-xl border border-[var(--color-surface-600)]
					       px-4 py-2.5 text-sm text-[var(--color-text-secondary)]
					       hover:text-[var(--color-text-primary)] transition-colors"
				>
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
					<span class="truncate max-w-40">{prevChapter.title}</span>
				</a>
			{:else}
				<div></div>
			{/if}

			{#if nextChapter}
				<a
					href="/viewer/textbooks/{textbookId}/chapters/{nextChapter.id}"
					class="flex items-center gap-2 rounded-xl border border-[var(--color-surface-600)]
					       px-4 py-2.5 text-sm text-[var(--color-text-secondary)]
					       hover:text-[var(--color-text-primary)] transition-colors ml-auto"
				>
					<span class="truncate max-w-40">{nextChapter.title}</span>
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>
				</a>
			{/if}
		</div>
	{/if}
</div>
