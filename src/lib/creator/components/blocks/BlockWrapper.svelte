<script lang="ts">
	import type { BlockType, ChapterBlock } from '$lib/creator/contentTypes';
	import { BLOCK_TYPE_LABELS } from '$lib/creator/contentTypes';

	interface Props {
		type: BlockType;
		blockData: ChapterBlock['data'];
		blockId: string;
		collapsed: boolean;
		onToggleCollapse: () => void;
		onDelete: () => void;
		onAddBelow: (type: BlockType) => void;
		onCopy: () => void;
		onPaste: () => void;
		onDragStart: (e: DragEvent, id: string) => void;
		onDragEnd: () => void;
		onDrop: (e: DragEvent, id: string) => void;
		draggingId: string | null;
		children: import('svelte').Snippet;
	}

	let {
		type, blockData, blockId, collapsed, onToggleCollapse,
		onDelete, onAddBelow, onCopy, onPaste,
		onDragStart, onDragEnd, onDrop, draggingId, children
	}: Props = $props();

	let confirmingDelete = $state(false);
	let showAddBelowPicker = $state(false);
	let pickerOpenUpward = $state(false);
	let addBelowBtn: HTMLButtonElement;
	let isDraggableByHandle = $state(false);
	const isDragging = $derived(draggingId === blockId);

	function getPreview(data: ChapterBlock['data']): string {
		if ('text' in data) return (data as { text: string }).text.slice(0, 60) || '—';
		if ('html' in data) return (data as { html: string }).html.replace(/<[^>]+>/g, '').slice(0, 60) || '—';
		if ('items' in data) return ((data as { items: string[] }).items[0] ?? '').slice(0, 60) || '—';
		if ('headers' in data) return (data as { headers: string[] }).headers.join(', ').slice(0, 60) || '—';
		return '—';
	}

	function openAddBelow() {
		if (addBelowBtn) {
			const rect = addBelowBtn.getBoundingClientRect();
			pickerOpenUpward = (window.innerHeight - rect.bottom) < 320;
		}
		showAddBelowPicker = true;
	}

	function handleAddBelowSelect(t: BlockType) {
		showAddBelowPicker = false;
		onAddBelow(t);
	}

	function handleHandleMouseDown() { isDraggableByHandle = true; }

	function handleDragStart(e: DragEvent) {
		if (!isDraggableByHandle) { e.preventDefault(); return; }
		onDragStart(e, blockId);
	}

	function handleDragEnd() {
		isDraggableByHandle = false;
		onDragEnd();
	}

	function hasClipboard(): boolean {
		try { return !!localStorage.getItem('studyapp_block_clipboard'); }
		catch { return false; }
	}
</script>

<div class="group flex flex-col">
	<div
		role="listitem"
		draggable={isDraggableByHandle}
		ondragstart={handleDragStart}
		ondragend={handleDragEnd}
		ondragover={(e) => e.preventDefault()}
		ondrop={(e) => onDrop(e, blockId)}
		class="flex flex-col rounded-xl border bg-[var(--color-surface-900)] transition-all
		       {isDragging
			? 'border-[var(--color-accent-500)] opacity-50'
			: 'border-[var(--color-surface-700)] hover:border-[var(--color-surface-600)]'}"
	>
		<div class="flex items-center gap-2 px-4 py-3">
			<!-- Drag handle -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				class="shrink-0 cursor-grab text-[var(--color-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity active:cursor-grabbing"
				aria-hidden="true"
				onmousedown={handleHandleMouseDown}
			>
				<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
					<line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="18" x2="16" y2="18"/>
				</svg>
			</div>

			<span class="flex-1 text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
				{BLOCK_TYPE_LABELS[type] ?? type}
			</span>

			{#if collapsed}
				<span class="mr-2 flex-1 truncate text-xs text-[var(--color-text-secondary)]">
					{getPreview(blockData)}
				</span>
			{/if}

			<div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
				<!-- Copy button -->
				<button onclick={onCopy} aria-label="Copy block"
					class="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-surface-800)] hover:text-[var(--color-text-secondary)] transition-colors" title="Copy block">
					<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
						<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
					</svg>
				</button>

				<!-- Paste button -->
				{#if hasClipboard()}
					<button onclick={onPaste} aria-label="Paste block below"
						class="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-surface-800)] hover:text-[var(--color-accent-400)] transition-colors" title="Paste block below">
						<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
							<path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/>
							<rect x="8" y="2" width="8" height="4" rx="1"/>
						</svg>
					</button>
				{/if}

				<!-- Collapse toggle -->
				<button onclick={onToggleCollapse} aria-label={collapsed ? 'Expand' : 'Collapse'}
					class="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-surface-800)] hover:text-[var(--color-text-primary)] transition-colors">
					<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						{#if collapsed}<polyline points="6 9 12 15 18 9"/>{:else}<polyline points="18 15 12 9 6 15"/>{/if}
					</svg>
				</button>

				<!-- Delete -->
				{#if !confirmingDelete}
					<button onclick={() => (confirmingDelete = true)} aria-label="Delete block"
						class="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-surface-800)] hover:text-[var(--color-error-400)] transition-colors">
						<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
							<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
							<path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
						</svg>
					</button>
				{:else}
					<div class="flex items-center gap-1.5">
						<button onclick={() => { confirmingDelete = false; onDelete(); }}
							class="rounded-lg bg-[var(--color-error-500)]/15 px-2 py-1 text-xs font-medium text-[var(--color-error-400)] hover:bg-[var(--color-error-500)]/25 transition-colors">Delete</button>
						<button onclick={() => (confirmingDelete = false)}
							class="rounded-lg border border-[var(--color-surface-600)] px-2 py-1 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">Cancel</button>
					</div>
				{/if}
			</div>
		</div>

		{#if !collapsed}
			<div class="border-t border-[var(--color-surface-700)] px-4 py-4">
				{@render children()}
			</div>
		{/if}
	</div>

	<!-- Add-below strip -->
	<div class="relative flex items-center justify-center py-1 opacity-0 group-hover:opacity-100 transition-opacity">
		<div class="absolute inset-x-0 top-1/2 h-px bg-[var(--color-surface-700)]"></div>
		<button bind:this={addBelowBtn} onclick={openAddBelow}
			class="relative z-10 flex items-center gap-1 rounded-full border border-[var(--color-surface-600)]
			       bg-[var(--color-surface-900)] px-2.5 py-0.5 text-[11px] text-[var(--color-text-muted)]
			       hover:border-[var(--color-accent-500)] hover:text-[var(--color-accent-400)] transition-colors">
			<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
				<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
			</svg>
			Add below
		</button>

		{#if showAddBelowPicker}
			<div class="fixed inset-0 z-20" role="button" tabindex="-1" aria-label="Close"
			     onclick={() => (showAddBelowPicker = false)}
			     onkeydown={(e) => e.key === 'Escape' && (showAddBelowPicker = false)}></div>
			<div class="absolute left-1/2 -translate-x-1/2 z-30 w-44 overflow-hidden rounded-xl border border-[var(--color-surface-700)] bg-[var(--color-surface-800)] shadow-2xl
			            {pickerOpenUpward ? 'bottom-full mb-2' : 'top-full mt-1'}">
				{#each Object.entries(BLOCK_TYPE_LABELS) as [t, label]}
					<button onclick={() => handleAddBelowSelect(t as BlockType)}
						class="flex w-full items-center px-4 py-2 text-left text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-700)] hover:text-[var(--color-text-primary)] transition-colors">
						{label}
					</button>
				{/each}
			</div>
		{/if}
	</div>
</div>
