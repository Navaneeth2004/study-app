<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto, beforeNavigate } from '$app/navigation';
	import { updateChapter, getChapter } from '$lib/creator/chapterService';
	import { getTextbook } from '$lib/creator/textbookService';
	import {
		listBlocks, createBlock, updateBlock,
		deleteBlock, reorderBlocks, uploadFile
	} from '$lib/creator/contentService';
	import InlineEdit from '$lib/creator/components/InlineEdit.svelte';
	import BlockWrapper from '$lib/creator/components/blocks/BlockWrapper.svelte';
	import BlockTypePicker from '$lib/creator/components/blocks/BlockTypePicker.svelte';
	import TitleBlockEditor from '$lib/creator/components/blocks/TitleBlockEditor.svelte';
	import SubtitleBlockEditor from '$lib/creator/components/blocks/SubtitleBlockEditor.svelte';
	import ParagraphBlockEditor from '$lib/creator/components/blocks/ParagraphBlockEditor.svelte';
	import BulletListEditor from '$lib/creator/components/blocks/BulletListEditor.svelte';
	import TableEditor from '$lib/creator/components/blocks/TableEditor.svelte';
	import ImageBlockEditor from '$lib/creator/components/blocks/ImageBlockEditor.svelte';
	import AudioBlockEditor from '$lib/creator/components/blocks/AudioBlockEditor.svelte';
	import DividerBlockEditor from '$lib/creator/components/blocks/DividerBlockEditor.svelte';
	import CalloutBlockEditor from '$lib/creator/components/blocks/CalloutBlockEditor.svelte';
	import VideoBlockEditor from '$lib/creator/components/blocks/VideoBlockEditor.svelte';
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
	import UnsavedChangesModal from '$lib/shared/components/UnsavedChangesModal.svelte';
	import AIGenerationModal from '$lib/shared/components/AIGenerationModal.svelte';
	import type { RuntimeBlock, BlockType } from '$lib/creator/contentTypes';
	import type { AIOutputType, AIGenerationResult } from '$lib/ai/aiTypes';

	const textbookId = $derived($page.params.id as string);
	const chapterId = $derived($page.params.chapterId as string);

	let textbookTitle = $state('');
	let chapterTitle = $state('');
	let blocks = $state<RuntimeBlock[]>([]);
	let loading = $state(true);
	let error = $state('');
	let saving = $state(false);
	let isDirty = $state(false);
	let previewMode = $state(false);
	let showUnsavedModal = $state(false);
	let pendingHref = $state('');
	let draggingId = $state<string | null>(null);

	// Per-block collapse state
	let collapsedBlocks = $state<Set<string>>(new Set());

	// AI state
	let showAIPicker = $state(false);
	let aiOutputType = $state<AIOutputType>('paragraph');
	let showAIModal = $state(false);
	// Track insertion index for "Add below"
	let aiInsertAfterIndex = $state<number | null>(null);

	const AI_OUTPUT_TYPES: { type: AIOutputType; label: string }[] = [
		{ type: 'paragraph', label: 'Paragraph' },
		{ type: 'bullet_list', label: 'Bullet List' },
		{ type: 'table', label: 'Table' }
	];

	const pendingData = new Map<string, Record<string, unknown>>();

	onMount(async () => {
		loading = true;
		error = '';
		try {
			const [textbook, chapter, fetched] = await Promise.all([
				getTextbook(textbookId),
				getChapter(chapterId),
				listBlocks(chapterId)
			]);
			textbookTitle = textbook.title;
			chapterTitle = chapter.title;
			blocks = fetched as RuntimeBlock[];
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not load chapter.';
		} finally {
			loading = false;
		}
	});

	beforeNavigate(({ cancel, to }) => {
		if (isDirty && to) {
			cancel();
			pendingHref = to.url.href;
			showUnsavedModal = true;
		}
	});

	async function saveAll() {
		saving = true;
		error = '';
		try {
			await Promise.all(
				Array.from(pendingData.entries()).map(([id, data]) => updateBlock(id, data))
			);
			pendingData.clear();
			isDirty = false;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not save.';
		} finally {
			saving = false;
		}
	}

	async function handleTitleSave(value: string) {
		await updateChapter(chapterId, { title: value });
		chapterTitle = value;
	}

	/** Add a block at a specific position (index = insert after this index, -1 = at end) */
	async function handleAddBlock(type: BlockType, afterIndex?: number) {
		try {
			// Determine insertion position
			const insertAt = afterIndex !== undefined && afterIndex >= 0 ? afterIndex + 1 : blocks.length;

			// Create block at the end first (PocketBase order), then reorder
			const block = await createBlock(chapterId, type, blocks.length + 1);

			// Insert into the local array at the right position
			const newBlocks = [...blocks];
			newBlocks.splice(insertAt, 0, block);

			// Re-assign orders
			const reordered = newBlocks.map((b, i) => ({ ...b, order: i + 1 }));
			blocks = reordered;
			isDirty = true;

			// Persist the new order if we inserted mid-list
			if (insertAt < blocks.length - 1) {
				await reorderBlocks(blocks);
			}
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not add block.';
		}
	}

	function handleBlockUpdate(blockId: string, data: Record<string, unknown>) {
		const existing = blocks.find((b) => b.id === blockId);
		if (existing && JSON.stringify(existing.data) === JSON.stringify(data)) return;
		blocks = blocks.map((b) => (b.id === blockId ? { ...b, data } as RuntimeBlock : b));
		pendingData.set(blockId, data);
		isDirty = true;
	}

	async function handleDeleteBlock(blockId: string) {
		try {
			await deleteBlock(blockId);
			blocks = blocks.filter((b) => b.id !== blockId);
			pendingData.delete(blockId);
			collapsedBlocks.delete(blockId);
			isDirty = true;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not delete block.';
		}
	}

	async function handleUpload(file: File, blockId: string, fileType: 'image' | 'audio'): Promise<string> {
		return await uploadFile(file, blockId, fileType);
	}

	function handleDragStart(e: DragEvent, id: string) {
		draggingId = id;
		e.dataTransfer?.setData('text/plain', id);
	}

	function handleDragEnd() {
		draggingId = null;
	}

	async function handleDrop(e: DragEvent, targetId: string) {
		e.preventDefault();
		if (!draggingId || draggingId === targetId) { draggingId = null; return; }
		const fromIndex = blocks.findIndex((b) => b.id === draggingId);
		const toIndex = blocks.findIndex((b) => b.id === targetId);
		const reordered = [...blocks];
		const [moved] = reordered.splice(fromIndex, 1);
		reordered.splice(toIndex, 0, moved);
		blocks = reordered.map((b, i) => ({ ...b, order: i + 1 })) as RuntimeBlock[];
		draggingId = null;
		isDirty = true;
		try { await reorderBlocks(blocks); }
		catch (e) { error = e instanceof Error ? e.message : 'Could not reorder.'; }
	}

	function toggleCollapse(blockId: string) {
		const next = new Set(collapsedBlocks);
		if (next.has(blockId)) next.delete(blockId);
		else next.add(blockId);
		collapsedBlocks = next;
	}

	async function handleAIInsert(result: AIGenerationResult) {
		try {
			const blockType = result.outputType as BlockType;
			const insertAt = aiInsertAfterIndex !== null ? aiInsertAfterIndex + 1 : blocks.length;
			const block = await createBlock(chapterId, blockType, blocks.length + 1);
			pendingData.set(block.id, result.data);
			const newBlock = { ...block, data: result.data } as RuntimeBlock;
			const newBlocks = [...blocks];
			newBlocks.splice(insertAt, 0, newBlock);
			blocks = newBlocks.map((b, i) => ({ ...b, order: i + 1 })) as RuntimeBlock[];
			isDirty = true;
			aiInsertAfterIndex = null;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not insert generated content.';
		}
	}

	function handleModalStay() { showUnsavedModal = false; pendingHref = ''; }
	function handleModalLeave() { showUnsavedModal = false; isDirty = false; goto(pendingHref); }
	async function handleModalSave() { await saveAll(); }
</script>

<svelte:head><title>{chapterTitle || 'Chapter'} — StudyApp</title></svelte:head>

<UnsavedChangesModal isOpen={showUnsavedModal} {saving} onSave={handleModalSave} onLeave={handleModalLeave} onStay={handleModalStay} />

{#if showAIModal}
	<AIGenerationModal isOpen={true} outputType={aiOutputType} onInsert={handleAIInsert} onClose={() => (showAIModal = false)} />
{/if}

{#if loading}
	<div class="flex flex-col gap-4 max-w-2xl">
		<div class="h-8 w-48 rounded bg-[var(--color-surface-800)]"></div>
		<div class="h-32 rounded-xl bg-[var(--color-surface-800)]"></div>
	</div>
{:else if error && !blocks.length}
	<p class="text-sm text-[var(--color-error-400)]">{error}</p>
{:else}
	<div class="flex flex-col gap-6 max-w-2xl">
		<!-- Breadcrumb -->
		<nav class="flex items-center gap-2 text-sm">
			<a href="/creator" class="text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors">Creator</a>
			<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" class="text-[var(--color-text-muted)]"><polyline points="9 18 15 12 9 6"/></svg>
			<a href="/creator/textbooks/{textbookId}" class="text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors truncate max-w-40">{textbookTitle || '…'}</a>
			<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" class="text-[var(--color-text-muted)]"><polyline points="9 18 15 12 9 6"/></svg>
			<span class="truncate max-w-40 text-[var(--color-text-secondary)]">{chapterTitle || '…'}</span>
		</nav>

		<!-- Tab bar -->
		<div class="flex gap-1 border-b border-[var(--color-surface-700)]">
			<a href="/creator/textbooks/{textbookId}/chapters/{chapterId}"
				class="px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors border-[var(--color-accent-500)] text-[var(--color-accent-400)]">Content</a>
			<a href="/creator/textbooks/{textbookId}/chapters/{chapterId}/flashcards"
				class="px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]">Flashcards</a>
		</div>

		<!-- Top bar -->
		<div class="flex items-center justify-between gap-4">
			<InlineEdit bind:value={chapterTitle} placeholder="Chapter title" onSave={handleTitleSave} displayClass="font-display text-3xl text-[var(--color-text-primary)]" />
			<div class="flex shrink-0 items-center gap-2">
				{#if !previewMode}
					<button onclick={() => (previewMode = true)}
						class="rounded-lg border border-[var(--color-surface-600)] px-3 py-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
						Preview
					</button>
					<button onclick={saveAll} disabled={saving || !isDirty}
						class="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors
						       {isDirty ? 'bg-[var(--color-accent-500)] text-[var(--color-text-primary)] hover:bg-[var(--color-accent-400)]' : 'text-[var(--color-text-muted)] cursor-default'}">
						{saving ? 'Saving…' : isDirty ? 'Save' : 'Saved'}
					</button>
				{/if}
			</div>
		</div>

		{#if error}<p class="text-sm text-[var(--color-error-400)]">{error}</p>{/if}

		{#if previewMode}
			<div class="flex items-center justify-between rounded-xl border border-[var(--color-accent-500)]/30 bg-[var(--color-accent-500)]/10 px-4 py-2.5">
				<span class="text-sm font-medium text-[var(--color-accent-400)]">Preview Mode</span>
				<button onclick={() => (previewMode = false)} class="text-sm text-[var(--color-accent-400)] hover:text-[var(--color-accent-300)] transition-colors">Back to Edit</button>
			</div>
		{/if}

		<!-- Blocks -->
		<div role="list" class="flex flex-col gap-3">
			{#each blocks as block, blockIndex (block.id)}
				{#if previewMode}
					<div class="py-1">
						{#if block.type === 'title'}<TitleBlockRenderer data={block.data} />
						{:else if block.type === 'subtitle'}<SubtitleBlockRenderer data={block.data} />
						{:else if block.type === 'paragraph'}<ParagraphBlockRenderer data={block.data} />
						{:else if block.type === 'bullet_list'}<BulletListRenderer data={block.data} />
						{:else if block.type === 'table'}<TableBlockRenderer data={block.data} />
						{:else if block.type === 'image'}<ImageBlockRenderer data={block.data} />
						{:else if block.type === 'audio'}<AudioBlockRenderer data={block.data} />
						{:else if block.type === 'divider'}<DividerBlockRenderer />
						{:else if block.type === 'callout'}<CalloutBlockRenderer data={block.data} />
						{:else if block.type === 'video'}<VideoBlockRenderer data={block.data} />
						{/if}
					</div>
				{:else}
					<BlockWrapper
						type={block.type}
						blockData={block.data}
						blockId={block.id}
						collapsed={collapsedBlocks.has(block.id)}
						onToggleCollapse={() => toggleCollapse(block.id)}
						onDelete={() => handleDeleteBlock(block.id)}
						onAddBelow={(type) => handleAddBlock(type, blockIndex)}
						onDragStart={handleDragStart}
						onDragEnd={handleDragEnd}
						onDrop={handleDrop}
						{draggingId}
					>
						{#if block.type === 'title'}
							<TitleBlockEditor data={block.data} onUpdate={(d) => handleBlockUpdate(block.id, d)} />
						{:else if block.type === 'subtitle'}
							<SubtitleBlockEditor data={block.data} onUpdate={(d) => handleBlockUpdate(block.id, d)} />
						{:else if block.type === 'paragraph'}
							<ParagraphBlockEditor data={block.data} onUpdate={(d) => handleBlockUpdate(block.id, d)} />
						{:else if block.type === 'bullet_list'}
							<BulletListEditor data={block.data} onUpdate={(d) => handleBlockUpdate(block.id, d)} />
						{:else if block.type === 'table'}
							<TableEditor data={block.data} onUpdate={(d) => handleBlockUpdate(block.id, d)} />
						{:else if block.type === 'image'}
							<ImageBlockEditor data={block.data} blockId={block.id} onUpdate={(d) => handleBlockUpdate(block.id, d)} onUpload={handleUpload} />
						{:else if block.type === 'audio'}
							<AudioBlockEditor data={block.data} blockId={block.id} onUpdate={(d) => handleBlockUpdate(block.id, d)} onUpload={handleUpload} />
						{:else if block.type === 'divider'}
							<DividerBlockEditor data={block.data} onUpdate={(d) => handleBlockUpdate(block.id, d)} />
						{:else if block.type === 'callout'}
							<CalloutBlockEditor data={block.data} onUpdate={(d) => handleBlockUpdate(block.id, d)} />
						{:else if block.type === 'video'}
							<VideoBlockEditor data={block.data} onUpdate={(d) => handleBlockUpdate(block.id, d)} />
						{/if}
					</BlockWrapper>
				{/if}
			{/each}
		</div>

		{#if !previewMode}
			<BlockTypePicker onSelect={(type) => handleAddBlock(type)} />

			<!-- AI block generator at bottom -->
			<div class="relative">
				<button onclick={() => (showAIPicker = !showAIPicker)}
					class="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--color-surface-600)] px-4 py-3 text-sm text-[var(--color-text-muted)] hover:border-[var(--color-accent-500)] hover:text-[var(--color-accent-400)] transition-colors">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
						<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
					</svg>
					Generate with AI
				</button>
				{#if showAIPicker}
					<div class="fixed inset-0 z-10" role="button" tabindex="-1" aria-label="Close picker"
					     onclick={() => (showAIPicker = false)}
					     onkeydown={(e) => e.key === 'Escape' && (showAIPicker = false)}></div>
					<div class="absolute bottom-full left-0 z-20 mb-2 w-full overflow-hidden rounded-xl border border-[var(--color-surface-700)] bg-[var(--color-surface-800)] shadow-2xl">
						{#each AI_OUTPUT_TYPES as { type, label }}
							<button onclick={() => { showAIPicker = false; aiOutputType = type; aiInsertAfterIndex = null; showAIModal = true; }}
								class="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-700)] hover:text-[var(--color-text-primary)] transition-colors">
								{label}
							</button>
						{/each}
					</div>
				{/if}
			</div>
		{/if}
	</div>
{/if}
