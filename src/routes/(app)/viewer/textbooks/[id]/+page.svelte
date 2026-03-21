<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { getTextbook, listChapters } from '$lib/viewer/viewerService';
	import ChapterList from '$lib/viewer/components/ChapterList.svelte';
	import EmptyState from '$lib/shared/components/EmptyState.svelte';
	import type { Textbook } from '$lib/creator/creatorTypes';
	import type { Chapter } from '$lib/creator/creatorTypes';

	const textbookId = $derived($page.params.id as string);

	let textbook = $state<Textbook | null>(null);
	let chapters = $state<Chapter[]>([]);
	let loading = $state(true);
	let error = $state('');

	onMount(async () => {
		loading = true;
		try {
			[textbook, chapters] = await Promise.all([
				getTextbook(textbookId),
				listChapters(textbookId)
			]);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not load textbook.';
		} finally {
			loading = false;
		}
	});
</script>

<svelte:head>
	<title>{textbook?.title ?? 'Textbook'} — StudyApp</title>
</svelte:head>

<div class="flex flex-col gap-6 max-w-2xl">
	<!-- Breadcrumb -->
	<nav class="flex items-center gap-2 text-sm">
		<a href="/viewer" class="text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors">Home</a>
		<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" class="text-[var(--color-text-muted)]"><polyline points="9 18 15 12 9 6"/></svg>
		<span class="text-[var(--color-text-secondary)]">{textbook?.title ?? '…'}</span>
	</nav>

	{#if loading}
		<div class="flex flex-col gap-3">
			<div class="h-8 w-56 rounded bg-[var(--color-surface-800)]"></div>
			<div class="h-4 w-72 rounded bg-[var(--color-surface-800)]"></div>
		</div>
	{:else if error}
		<p class="text-sm text-[var(--color-error-400)]">{error}</p>
	{:else if textbook}
		<div class="flex flex-col gap-2">
			<h1 class="font-display text-3xl text-[var(--color-text-primary)]">{textbook.title}</h1>
			{#if textbook.description}
				<p class="text-[var(--color-text-secondary)]">{textbook.description}</p>
			{/if}
		</div>

		<section class="flex flex-col gap-3">
			<h2 class="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
				{chapters.length} {chapters.length === 1 ? 'Chapter' : 'Chapters'}
			</h2>
			{#if chapters.length === 0}
				<EmptyState heading="No chapters yet" description="This textbook has no chapters yet." />
			{:else}
				<ChapterList {chapters} {textbookId} />
			{/if}
		</section>
	{/if}
</div>
