<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { getTextbook } from '$lib/creator/textbookService';
	import { listChapters, createChapter, deleteChapter, reorderChapters } from '$lib/creator/chapterService';
	import ChapterRow from '$lib/creator/components/ChapterRow.svelte';
	import EmptyState from '$lib/shared/components/EmptyState.svelte';
	import UnsavedChangesModal from '$lib/shared/components/UnsavedChangesModal.svelte';
	import { pb } from '$lib/shared/pocketbase';
	import type { Textbook, Chapter } from '$lib/creator/creatorTypes';

	const textbookId = $derived($page.params.id as string);

	let textbook = $state<Textbook | null>(null);
	let chapters = $state<Chapter[]>([]);
	let loading = $state(true);
	let error = $state('');
	let draggingId = $state<string | null>(null);
	let blockCounts = $state<Record<string, number>>({});
	let flashcardCounts = $state<Record<string, number>>({});

	// New chapter modal
	let showModal = $state(false);
	let chapterTitle = $state('');
	let saving = $state(false);
	let formError = $state('');
	let showDiscard = $state(false);
	const isDirty = $derived(chapterTitle.trim() !== '');

	onMount(async () => { await load(); });

	async function load() {
		loading = true; error = '';
		try {
			[textbook, chapters] = await Promise.all([
				getTextbook(textbookId),
				listChapters(textbookId)
			]);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not load textbook.';
		} finally { loading = false; }

		// Load block and flashcard counts in background
		if (chapters.length > 0) {
			try {
				const uid = pb.authStore.record?.id ?? '';
				const chapterIds = chapters.map((c) => c.id);
				const [blocks, cards] = await Promise.all([
					pb.collection('chapter_blocks').getFullList({
						requestKey: null,
						filter: '(' + chapterIds.map((id) => `chapter = "${id}"`).join(' || ') + ')',
						fields: 'id,chapter'
					}),
					pb.collection('flashcards').getFullList({
						requestKey: null,
						filter: '(' + chapterIds.map((id) => `chapter = "${id}"`).join(' || ') + ')',
						fields: 'id,chapter'
					})
				]);
				const bc: Record<string, number> = {};
				const fc: Record<string, number> = {};
				for (const b of blocks) { const cid = b.chapter as string; bc[cid] = (bc[cid] ?? 0) + 1; }
				for (const c of cards) { const cid = c.chapter as string; fc[cid] = (fc[cid] ?? 0) + 1; }
				blockCounts = bc;
				flashcardCounts = fc;
			} catch { /* silent */ }
		}
	}

	async function handleDeleteChapter(chapterId: string) {
		try {
			await deleteChapter(chapterId);
			chapters = chapters.filter((c) => c.id !== chapterId);
		} catch (e) { error = e instanceof Error ? e.message : 'Could not delete chapter.'; }
	}

	function openNewChapterModal() { chapterTitle = ''; formError = ''; showModal = true; }
	function attemptClose() { if (isDirty) showDiscard = true; else closeModal(); }
	function closeModal() { showModal = false; chapterTitle = ''; formError = ''; }

	async function handleCreateChapter() {
		if (!chapterTitle.trim()) { formError = 'Title is required.'; return; }
		saving = true; formError = '';
		try {
			const order = chapters.length + 1;
			const ch = await createChapter(textbookId, { title: chapterTitle.trim() }, order);
			chapters = [...chapters, ch];
			closeModal();
		} catch (e) { formError = e instanceof Error ? e.message : 'Could not create chapter.'; }
		finally { saving = false; }
	}

	function handleDragStart(e: DragEvent, chapter: Chapter) {
		draggingId = chapter.id;
		e.dataTransfer?.setData('text/plain', chapter.id);
	}
	function handleDragOver(e: DragEvent, _chapter: Chapter) { e.preventDefault(); }
	async function handleDrop(e: DragEvent, targetChapter: Chapter) {
		e.preventDefault();
		if (!draggingId || draggingId === targetChapter.id) { draggingId = null; return; }
		const from = chapters.findIndex((c) => c.id === draggingId);
		const to = chapters.findIndex((c) => c.id === targetChapter.id);
		const reordered = [...chapters];
		const [moved] = reordered.splice(from, 1);
		reordered.splice(to, 0, moved);
		chapters = reordered.map((c, i) => ({ ...c, order: i + 1 }));
		draggingId = null;
		try { await reorderChapters(chapters); }
		catch (e) { error = e instanceof Error ? e.message : 'Could not save order.'; await load(); }
	}
</script>

<svelte:head>
	<title>{textbook?.title ?? 'Textbook'} — StudyApp</title>
</svelte:head>

<UnsavedChangesModal isOpen={showDiscard} zClass="z-[60]" saving={false}
	onSave={async () => { showDiscard = false; }}
	onLeave={() => { showDiscard = false; closeModal(); }}
	onStay={() => (showDiscard = false)} />

{#if showModal}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4"
	     style="background: rgba(0,0,0,0.7);" onclick={attemptClose}>
		<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
		<div class="relative w-full max-w-md rounded-2xl border border-[var(--color-surface-700)]
		            bg-[var(--color-surface-950)] shadow-2xl"
		     onclick={(e) => e.stopPropagation()}>
			<div class="flex items-center justify-between border-b border-[var(--color-surface-700)] px-5 py-4">
				<span class="text-sm font-semibold text-[var(--color-text-secondary)]">New Chapter</span>
				<button onclick={attemptClose} aria-label="Close"
					class="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-text-muted)]
					       hover:bg-[var(--color-surface-800)] hover:text-[var(--color-text-primary)] transition-colors">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
						<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
					</svg>
				</button>
			</div>
			<div class="flex flex-col gap-4 p-5">
				<div class="flex flex-col gap-1.5">
					<label for="ch-title" class="text-sm font-medium text-[var(--color-text-secondary)]">Chapter title</label>
					<input id="ch-title" type="text" bind:value={chapterTitle}
						placeholder="e.g. Chapter 1: Cell Biology"
						onkeydown={(e) => e.key === 'Enter' && handleCreateChapter()}
						class="w-full rounded-xl border border-[var(--color-surface-600)]
						       bg-[var(--color-surface-800)] px-4 py-3 text-sm
						       text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]
						       focus:border-[var(--color-accent-500)] focus:outline-none
						       focus:ring-2 focus:ring-[var(--color-accent-500)]/20 transition-colors" />
				</div>
				{#if formError}<p class="text-sm text-[var(--color-error-400)]">{formError}</p>{/if}
				<div class="flex gap-3">
					<button onclick={handleCreateChapter} disabled={saving}
						class="rounded-xl bg-[var(--color-accent-500)] px-5 py-2.5 text-sm font-medium
						       text-white hover:bg-[var(--color-accent-400)]
						       disabled:cursor-not-allowed disabled:opacity-50 transition-colors">
						{saving ? 'Creating…' : 'Create Chapter'}
					</button>
					<button onclick={attemptClose}
						class="rounded-xl border border-[var(--color-surface-600)] px-5 py-2.5 text-sm
						       text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
						Cancel
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

{#if loading}
	<div class="flex flex-col gap-4">
		<div class="h-8 w-48 rounded bg-[var(--color-surface-800)]"></div>
		<div class="h-32 rounded-xl bg-[var(--color-surface-800)]"></div>
	</div>
{:else if error}
	<p class="text-sm text-[var(--color-error-400)]">{error}</p>
{:else if textbook}
	<div class="flex flex-col gap-8">
		<div class="flex items-start justify-between gap-4">
			<!-- Title and description are plain text — edit via the card's Edit button -->
			<div class="flex flex-col gap-1 flex-1 min-w-0">
				<h1 class="font-display text-3xl text-[var(--color-text-primary)] leading-tight">{textbook.title}</h1>
				{#if textbook.description}
					<p class="text-[var(--color-text-secondary)] text-sm">{textbook.description}</p>
				{/if}
			</div>
			<button
				onclick={openNewChapterModal}
				class="flex items-center gap-2 rounded-xl bg-[var(--color-accent-500)] px-4 py-2.5
				       text-sm font-medium text-white hover:bg-[var(--color-accent-400)] transition-colors shrink-0"
			>
				<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
					<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
				</svg>
				New Chapter
			</button>
		</div>

		{#if error}<p class="text-sm text-[var(--color-error-400)]">{error}</p>{/if}

		{#if chapters.length === 0}
			<EmptyState heading="No chapters yet" description="Add your first chapter to start building." />
		{:else}
			<div role="list" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
				{#each chapters as chapter (chapter.id)}
					<ChapterRow {chapter} textbookId={textbookId}
						blockCount={blockCounts[chapter.id]}
						flashcardCount={flashcardCounts[chapter.id]}
						onDelete={handleDeleteChapter}
						onDragStart={handleDragStart}
						onDragOver={handleDragOver}
						onDrop={handleDrop}
						{draggingId} />
				{/each}
			</div>
		{/if}
	</div>
{/if}
