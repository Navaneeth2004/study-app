<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { getChapter } from '$lib/creator/chapterService';
	import { getTextbook } from '$lib/creator/textbookService';
	import {
		listByChapter, createFlashcard, updateFlashcard,
		deleteFlashcard, reorderFlashcards
	} from '$lib/creator/flashcardService';
	import FlashcardCard from '$lib/creator/components/flashcards/FlashcardCard.svelte';
	import FlashcardEditModal from '$lib/creator/components/flashcards/FlashcardEditModal.svelte';
	import AIGenerationModal from '$lib/shared/components/AIGenerationModal.svelte';
	import EmptyState from '$lib/shared/components/EmptyState.svelte';
	import type { Flashcard, FlashcardForm } from '$lib/creator/flashcardTypes';
	import type { AIGenerationResult } from '$lib/ai/aiTypes';

	const textbookId = $derived($page.params.id as string);
	const chapterId = $derived($page.params.chapterId as string);

	let textbookTitle = $state('');
	let chapterTitle = $state('');
	let flashcards = $state<Flashcard[]>([]);
	let loading = $state(true);
	let error = $state('');
	let modalCard = $state<Flashcard | null | 'new'>(null);
	let draggingId = $state<string | null>(null);
	let showAIModal = $state(false);

	onMount(async () => {
		loading = true;
		try {
			const [textbook, chapter, cards] = await Promise.all([
				getTextbook(textbookId),
				getChapter(chapterId),
				listByChapter(chapterId)
			]);
			textbookTitle = textbook.title;
			chapterTitle = chapter.title;
			flashcards = cards;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not load flashcards.';
		} finally {
			loading = false;
		}
	});

	async function handleSave(data: FlashcardForm) {
		if (modalCard === 'new') {
			const card = await createFlashcard({ ...data, chapter: chapterId, order: flashcards.length + 1 });
			flashcards = [...flashcards, card];
		} else if (modalCard) {
			const updated = await updateFlashcard(modalCard.id, data);
			flashcards = flashcards.map((c) => (c.id === updated.id ? updated : c));
		}
	}

	async function handleDelete(id: string) {
		try {
			await deleteFlashcard(id);
			flashcards = flashcards.filter((c) => c.id !== id);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not delete flashcard.';
		}
	}

	function handleDragStart(e: DragEvent, id: string) {
		draggingId = id;
		e.dataTransfer?.setData('text/plain', id);
	}

	async function handleDrop(e: DragEvent, targetId: string) {
		e.preventDefault();
		if (!draggingId || draggingId === targetId) { draggingId = null; return; }
		const fromIndex = flashcards.findIndex((c) => c.id === draggingId);
		const toIndex = flashcards.findIndex((c) => c.id === targetId);
		const reordered = [...flashcards];
		const [moved] = reordered.splice(fromIndex, 1);
		reordered.splice(toIndex, 0, moved);
		flashcards = reordered.map((c, i) => ({ ...c, order: i + 1 }));
		draggingId = null;
		try { await reorderFlashcards(flashcards); }
		catch (e) { error = e instanceof Error ? e.message : 'Could not reorder.'; }
	}

	async function handleAIInsert(result: AIGenerationResult) {
		if (result.outputType !== 'flashcards') return;
		const cards = (result.data.flashcards ?? []) as Array<{ front_text: string; back_text: string }>;
		if (!Array.isArray(cards) || cards.length === 0) return;
		try {
			const created = await Promise.all(
				cards.map((card, i) =>
					createFlashcard({
						frontText: card.front_text,
						backText: card.back_text,
						chapter: chapterId,
						order: flashcards.length + i + 1
					})
				)
			);
			flashcards = [...flashcards, ...created];
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not insert generated flashcards.';
		}
	}
</script>

<svelte:head>
	<title>Flashcards — {chapterTitle || 'Chapter'}</title>
</svelte:head>

{#if modalCard !== null}
	<FlashcardEditModal
		flashcard={modalCard === 'new' ? null : modalCard}
		onSave={handleSave}
		onClose={() => (modalCard = null)}
	/>
{/if}

{#if showAIModal}
	<AIGenerationModal
		isOpen={true}
		outputType="flashcards"
		onInsert={handleAIInsert}
		onClose={() => (showAIModal = false)}
	/>
{/if}

<div class="flex flex-col gap-6 max-w-2xl">
	<!-- Breadcrumb -->
	<nav class="flex items-center gap-2 text-sm flex-wrap">
		<a href="/creator" class="text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors">Creator</a>
		<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" class="text-[var(--color-text-muted)]"><polyline points="9 18 15 12 9 6"/></svg>
		<a href="/creator/textbooks/{textbookId}" class="text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors truncate max-w-32">{textbookTitle || '…'}</a>
		<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" class="text-[var(--color-text-muted)]"><polyline points="9 18 15 12 9 6"/></svg>
		<a href="/creator/textbooks/{textbookId}/chapters/{chapterId}" class="text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors truncate max-w-32">{chapterTitle || '…'}</a>
		<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" class="text-[var(--color-text-muted)]"><polyline points="9 18 15 12 9 6"/></svg>
		<span class="text-[var(--color-text-secondary)]">Flashcards</span>
	</nav>

	<!-- Tab bar -->
	<div class="flex gap-1 border-b border-[var(--color-surface-700)]">
		<a href="/creator/textbooks/{textbookId}/chapters/{chapterId}"
			class="px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors
			       border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]">
			Content
		</a>
		<a href="/creator/textbooks/{textbookId}/chapters/{chapterId}/flashcards"
			class="px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors
			       border-[var(--color-accent-500)] text-[var(--color-accent-400)]">
			Flashcards
		</a>
	</div>

	<div class="flex items-center justify-between gap-4">
		<h1 class="font-display text-3xl text-[var(--color-text-primary)]">Flashcards</h1>
		<div class="flex shrink-0 items-center gap-2">
			<button
				onclick={() => (showAIModal = true)}
				class="flex items-center gap-2 rounded-xl border border-[var(--color-surface-600)] px-4 py-2.5
				       text-sm font-medium text-[var(--color-text-secondary)]
				       hover:text-[var(--color-text-primary)] hover:border-[var(--color-surface-500)] transition-colors"
			>
				<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
					<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
				</svg>
				Generate with AI
			</button>
			<button
				onclick={() => (modalCard = 'new')}
				class="flex items-center gap-2 rounded-xl bg-[var(--color-accent-500)] px-4 py-2.5
				       text-sm font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-accent-400)]
				       transition-colors"
			>
				<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
					<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
				</svg>
				New Flashcard
			</button>
		</div>
	</div>

	{#if error}
		<p class="text-sm text-[var(--color-error-400)]">{error}</p>
	{/if}

	{#if loading}
		<div class="flex flex-col gap-2">
			{#each Array(3) as _}
				<div class="h-12 rounded-xl border border-[var(--color-surface-700)] bg-[var(--color-surface-900)]"></div>
			{/each}
		</div>
	{:else if flashcards.length === 0}
		<EmptyState
			heading="No flashcards yet"
			description="Add flashcards to this chapter."
		/>
	{:else}
		<div role="list" class="flex flex-col gap-2">
			{#each flashcards as card (card.id)}
				<FlashcardCard
					flashcard={card}
					onEdit={(c) => (modalCard = c)}
					onDelete={handleDelete}
					onDragStart={handleDragStart}
					onDragOver={() => {}}
					onDrop={handleDrop}
					{draggingId}
				/>
			{/each}
		</div>
	{/if}
</div>
