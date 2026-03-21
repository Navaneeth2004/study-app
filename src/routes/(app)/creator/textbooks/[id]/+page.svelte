<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { getTextbook, updateTextbook } from '$lib/creator/textbookService';
	import { listChapters, deleteChapter, reorderChapters } from '$lib/creator/chapterService';
	import InlineEdit from '$lib/creator/components/InlineEdit.svelte';
	import ChapterRow from '$lib/creator/components/ChapterRow.svelte';
	import EmptyState from '$lib/shared/components/EmptyState.svelte';
	import type { Textbook, Chapter } from '$lib/creator/creatorTypes';

	const textbookId = $derived($page.params.id as string);

	let textbook = $state<Textbook | null>(null);
	let chapters = $state<Chapter[]>([]);
	let loading = $state(true);
	let error = $state('');
	let draggingId = $state<string | null>(null);

	onMount(async () => {
		await load();
	});

	async function load() {
		loading = true;
		error = '';
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
	}

	async function handleTitleSave(value: string) {
		await updateTextbook(textbookId, { title: value });
	}

	async function handleDescriptionSave(value: string) {
		await updateTextbook(textbookId, { description: value });
	}

	async function handleDeleteChapter(chapterId: string) {
		try {
			await deleteChapter(chapterId);
			chapters = chapters.filter((c) => c.id !== chapterId);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not delete chapter.';
		}
	}

	function handleDragStart(e: DragEvent, chapter: Chapter) {
		draggingId = chapter.id;
		e.dataTransfer?.setData('text/plain', chapter.id);
	}

	function handleDragOver(e: DragEvent, _chapter: Chapter) {
		e.preventDefault();
	}

	async function handleDrop(e: DragEvent, targetChapter: Chapter) {
		e.preventDefault();
		if (!draggingId || draggingId === targetChapter.id) {
			draggingId = null;
			return;
		}

		const fromIndex = chapters.findIndex((c) => c.id === draggingId);
		const toIndex = chapters.findIndex((c) => c.id === targetChapter.id);
		const reordered = [...chapters];
		const [moved] = reordered.splice(fromIndex, 1);
		reordered.splice(toIndex, 0, moved);
		chapters = reordered.map((c, i) => ({ ...c, order: i + 1 }));
		draggingId = null;

		try {
			await reorderChapters(chapters);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not save order.';
			await load();
		}
	}
</script>

<svelte:head>
	<title>{textbook?.title ?? 'Textbook'} — StudyApp</title>
</svelte:head>

{#if loading}
	<div class="flex flex-col gap-4">
		<div class="h-8 w-48 rounded bg-[var(--color-surface-800)]"></div>
		<div class="h-4 w-72 rounded bg-[var(--color-surface-800)]"></div>
	</div>
{:else if error}
	<p class="text-sm text-[var(--color-error-400)]">{error}</p>
{:else if textbook}
	<div class="flex flex-col gap-8 max-w-2xl">
		<div class="flex items-start justify-between gap-4">
			<div class="flex flex-col gap-2 flex-1">
				<InlineEdit
					bind:value={textbook.title}
					placeholder="Textbook title"
					onSave={handleTitleSave}
					displayClass="font-display text-3xl text-[var(--color-text-primary)]"
				/>
				<InlineEdit
					bind:value={textbook.description}
					placeholder="Add a description…"
					onSave={handleDescriptionSave}
					multiline={true}
					displayClass="text-[var(--color-text-secondary)]"
				/>
			</div>
			<a
				href="/creator/textbooks/{textbookId}/chapters/new"
				class="flex items-center gap-2 rounded-xl bg-[var(--color-accent-500)] px-4 py-2.5
				       text-sm font-medium text-white hover:bg-[var(--color-accent-400)] transition-colors shrink-0"
			>
				<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
					<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
				</svg>
				New Chapter
			</a>
		</div>

		{#if error}
			<p class="text-sm text-[var(--color-error-400)]">{error}</p>
		{/if}

		{#if chapters.length === 0}
			<EmptyState
				heading="No chapters yet"
				description="Add your first chapter to start building."
			/>
		{:else}
			<div role="list" class="flex flex-col gap-2">
				{#each chapters as chapter (chapter.id)}
					<ChapterRow
						{chapter}
						textbookId={textbookId}
						onDelete={handleDeleteChapter}
						onDragStart={handleDragStart}
						onDragOver={handleDragOver}
						onDrop={handleDrop}
						{draggingId}
					/>
				{/each}
			</div>
		{/if}
	</div>
{/if}
