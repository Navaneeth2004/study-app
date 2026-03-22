<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import {
		exportAll, exportSelected, importFromFile, readManifest,
		type ImportProgress, type ImportSummary, type Manifest
	} from '$lib/settings/exportImportService';
	import { listTextbooks } from '$lib/creator/textbookService';
	import { listCategories } from '$lib/creator/flashcardService';
	import type { Textbook } from '$lib/creator/creatorTypes';
	import type { FlashcardCategory } from '$lib/creator/flashcardTypes';

	let textbooks = $state<Textbook[]>([]);
	let categories = $state<FlashcardCategory[]>([]);
	let loadingContent = $state(true);

	onMount(async () => {
		try {
			[textbooks, categories] = await Promise.all([listTextbooks(), listCategories()]);
		} catch { /* silent */ } finally {
			loadingContent = false;
		}
	});

	let showExportModal = $state(false);
	let exportModalMode = $state<'all' | 'selected'>('all');
	let exportFilename = $state('');
	let exporting = $state(false);
	let exportError = $state('');
	let exportSuccess = $state(false);

	let showSelector = $state(false);
	let selectorTab = $state<'textbooks' | 'decks'>('textbooks');
	let selectedTextbookIds = $state<Set<string>>(new Set());
	let selectedCategoryIds = $state<Set<string>>(new Set());
	const selectedCount = $derived(selectedTextbookIds.size + selectedCategoryIds.size);

	function openExportModal(mode: 'all' | 'selected') {
		exportModalMode = mode;
		const date = new Date().toISOString().slice(0, 10);
		exportFilename = mode === 'all' ? `studyapp-export-${date}` : `studyapp-selected-${date}`;
		exportError = '';
		showExportModal = true;
	}

	async function handleExportConfirm() {
		const fname = (exportFilename.trim() || 'studyapp-export') + '.studyapp';
		exporting = true; exportError = '';
		try {
			if (exportModalMode === 'all') await exportAll(fname);
			else await exportSelected([...selectedTextbookIds], [...selectedCategoryIds], fname);
			showExportModal = false; showSelector = false;
			selectedTextbookIds = new Set(); selectedCategoryIds = new Set();
			exportSuccess = true;
			setTimeout(() => (exportSuccess = false), 3000);
		} catch (e) {
			exportError = e instanceof Error ? e.message : 'Export failed.';
		} finally { exporting = false; }
	}

	function toggleTextbook(id: string) {
		const next = new Set(selectedTextbookIds);
		next.has(id) ? next.delete(id) : next.add(id);
		selectedTextbookIds = next;
	}

	function toggleCategory(id: string) {
		const next = new Set(selectedCategoryIds);
		next.has(id) ? next.delete(id) : next.add(id);
		selectedCategoryIds = next;
	}

	function selectAllInTab() {
		if (selectorTab === 'textbooks') selectedTextbookIds = new Set(textbooks.map((t) => t.id));
		else selectedCategoryIds = new Set(categories.map((c) => c.id));
	}

	function deselectAllInTab() {
		if (selectorTab === 'textbooks') selectedTextbookIds = new Set();
		else selectedCategoryIds = new Set();
	}

	let showImportPreview = $state(false);
	let pendingFile = $state<File | null>(null);
	let previewManifest = $state<Manifest | null>(null);
	let previewError = $state('');
	let importing = $state(false);
	let importProgress = $state<ImportProgress | null>(null);
	let importSummary = $state<ImportSummary | null>(null);
	let importError = $state('');
	// $state so Svelte tracks binding updates
	let fileInputEl = $state<HTMLInputElement | undefined>(undefined);

	async function handleFileChange(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		input.value = '';
		previewError = ''; previewManifest = null;
		try {
			const manifest = await readManifest(file);
			pendingFile = file; previewManifest = manifest; showImportPreview = true;
		} catch (e) {
			previewError = e instanceof Error ? e.message : 'Could not read file.';
		}
	}

	async function handleImportConfirm() {
		if (!pendingFile) return;
		showImportPreview = false; importing = true; importError = '';
		importSummary = null; importProgress = null;
		try {
			const summary = await importFromFile(pendingFile, (p) => (importProgress = p));
			importSummary = summary;
		} catch (err) {
			importError = err instanceof Error ? err.message : 'Import failed.';
		} finally {
			importing = false; importProgress = null; pendingFile = null;
		}
	}

	function handleDone() { importSummary = null; goto('/settings'); }
</script>

{#if showExportModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4"
	     style="background: rgba(0,0,0,0.7);" role="dialog" aria-modal="true">
		<div class="flex flex-col gap-5 rounded-2xl border border-[var(--color-surface-700)]
		            bg-[var(--color-surface-900)] p-6 w-full max-w-sm shadow-2xl">
			<h2 class="text-base font-semibold text-[var(--color-text-primary)]">Name your export</h2>
			<div class="flex flex-col gap-1.5">
				<label for="export-name" class="text-xs text-[var(--color-text-muted)]">File name</label>
				<div class="flex items-center gap-1">
					<input id="export-name" type="text" bind:value={exportFilename}
						class="flex-1 rounded-xl border border-[var(--color-surface-600)] bg-[var(--color-surface-800)]
						       px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none
						       focus:border-[var(--color-accent-500)] transition-colors" />
					<span class="text-xs text-[var(--color-text-muted)] shrink-0">.studyapp</span>
				</div>
			</div>
			{#if exportError}
				<p class="text-xs text-[var(--color-error-400)]">{exportError}</p>
			{/if}
			<div class="flex gap-3">
				<button onclick={handleExportConfirm} disabled={exporting}
					class="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[var(--color-accent-500)]
					       px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-accent-400)]
					       disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
					{#if exporting}
						<svg class="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
						Exporting…
					{:else}
						Download
					{/if}
				</button>
				<button onclick={() => (showExportModal = false)} disabled={exporting}
					class="rounded-xl border border-[var(--color-surface-600)] px-4 py-2 text-sm
					       text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
					Cancel
				</button>
			</div>
		</div>
	</div>
{/if}

{#if showImportPreview && previewManifest}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4"
	     style="background: rgba(0,0,0,0.7);" role="dialog" aria-modal="true">
		<div class="flex flex-col gap-5 rounded-2xl border border-[var(--color-surface-700)]
		            bg-[var(--color-surface-900)] p-6 w-full max-w-md shadow-2xl">
			<div class="flex flex-col gap-1">
				<h2 class="text-base font-semibold text-[var(--color-text-primary)]">Import preview</h2>
				<p class="text-xs text-[var(--color-text-muted)]">
					Exported by {previewManifest.exportedBy} on {new Date(previewManifest.exportedAt).toLocaleDateString()}
				</p>
			</div>
			{#if previewManifest.textbooks.length > 0}
				<div class="flex flex-col gap-2">
					<p class="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
						Textbooks ({previewManifest.textbooks.length})
					</p>
					<div class="flex flex-col gap-1 max-h-32 overflow-y-auto">
						{#each previewManifest.textbooks as tb}
							<div class="flex items-center justify-between rounded-lg px-3 py-1.5 bg-[var(--color-surface-800)]">
								<span class="text-sm text-[var(--color-text-secondary)] truncate">{tb.title}</span>
								<span class="shrink-0 text-xs text-[var(--color-text-muted)] ml-2">
									{tb.chapters.length} chapter{tb.chapters.length !== 1 ? 's' : ''}
								</span>
							</div>
						{/each}
					</div>
				</div>
			{/if}
			{#if previewManifest.flashcard_categories.length > 0}
				<div class="flex flex-col gap-2">
					<p class="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
						Flashcard Decks ({previewManifest.flashcard_categories.length})
					</p>
					<div class="flex flex-col gap-1 max-h-32 overflow-y-auto">
						{#each previewManifest.flashcard_categories as cat}
							<div class="flex items-center justify-between rounded-lg px-3 py-1.5 bg-[var(--color-surface-800)]">
								<span class="text-sm text-[var(--color-text-secondary)] truncate">{cat.name}</span>
								<span class="shrink-0 text-xs text-[var(--color-text-muted)] ml-2">
									{cat.flashcards.length} card{cat.flashcards.length !== 1 ? 's' : ''}
								</span>
							</div>
						{/each}
					</div>
				</div>
			{/if}
			<p class="text-xs text-[var(--color-text-muted)]">⚠ Existing content with the same title will be overwritten.</p>
			<div class="flex gap-3">
				<button onclick={handleImportConfirm}
					class="flex-1 rounded-xl bg-[var(--color-accent-500)] px-4 py-2 text-sm font-medium
					       text-white hover:bg-[var(--color-accent-400)] transition-colors">
					Import
				</button>
				<button onclick={() => { showImportPreview = false; pendingFile = null; }}
					class="rounded-xl border border-[var(--color-surface-600)] px-4 py-2 text-sm
					       text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
					Cancel
				</button>
			</div>
		</div>
	</div>
{/if}

<div class="flex flex-col gap-6">
	<div class="flex flex-col gap-1">
		<h2 class="text-lg font-semibold text-[var(--color-text-primary)]">Export & Import</h2>
		<p class="text-sm text-[var(--color-text-secondary)]">
			Back up your content as a <code class="text-xs text-[var(--color-accent-400)]">.studyapp</code> file or restore from a backup.
		</p>
	</div>

	{#if exportSuccess}
		<p class="text-sm text-[var(--color-success-500)]">Export complete — file downloaded.</p>
	{/if}

	<div class="flex flex-col gap-3">
		<div class="flex gap-3 flex-wrap">
			<button onclick={() => openExportModal('all')}
				class="flex items-center gap-2 rounded-xl bg-[var(--color-accent-500)] px-4 py-2.5
				       text-sm font-medium text-white hover:bg-[var(--color-accent-400)] transition-colors">
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
					<polyline points="7 10 12 15 17 10"/>
					<line x1="12" y1="15" x2="12" y2="3"/>
				</svg>
				Export All
			</button>
			<button onclick={() => (showSelector = !showSelector)}
				class="flex items-center gap-2 rounded-xl border border-[var(--color-surface-600)] px-4 py-2.5
				       text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]
				       hover:border-[var(--color-surface-500)] transition-colors">
				Export Selected
			</button>
		</div>

		{#if showSelector}
			<div class="flex flex-col gap-4 rounded-xl border border-[var(--color-surface-700)] bg-[var(--color-surface-900)] p-4">
				<div class="flex gap-1 border-b border-[var(--color-surface-700)]">
					<button onclick={() => (selectorTab = 'textbooks')}
						class="px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors
						       {selectorTab === 'textbooks' ? 'border-[var(--color-accent-500)] text-[var(--color-accent-400)]' : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'}">
						Textbooks ({textbooks.length})
					</button>
					<button onclick={() => (selectorTab = 'decks')}
						class="px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors
						       {selectorTab === 'decks' ? 'border-[var(--color-accent-500)] text-[var(--color-accent-400)]' : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'}">
						Flashcard Decks ({categories.length})
					</button>
				</div>
				<div class="flex gap-2">
					<button onclick={selectAllInTab} class="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors">Select All</button>
					<span class="text-xs text-[var(--color-text-muted)]">·</span>
					<button onclick={deselectAllInTab} class="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors">Deselect All</button>
				</div>
				{#if loadingContent}
					<p class="text-sm text-[var(--color-text-muted)]">Loading…</p>
				{:else if selectorTab === 'textbooks'}
					{#if textbooks.length === 0}
						<p class="text-sm text-[var(--color-text-muted)]">No textbooks.</p>
					{:else}
						<div class="flex flex-col gap-1 max-h-48 overflow-y-auto">
							{#each textbooks as tb (tb.id)}
								<label class="flex items-center gap-3 rounded-lg px-3 py-2 cursor-pointer hover:bg-[var(--color-surface-800)] transition-colors">
									<input type="checkbox" checked={selectedTextbookIds.has(tb.id)} onchange={() => toggleTextbook(tb.id)} class="accent-[var(--color-accent-500)]" />
									<span class="text-sm text-[var(--color-text-secondary)]">{tb.title}</span>
								</label>
							{/each}
						</div>
					{/if}
				{:else}
					{#if categories.length === 0}
						<p class="text-sm text-[var(--color-text-muted)]">No flashcard decks.</p>
					{:else}
						<div class="flex flex-col gap-1 max-h-48 overflow-y-auto">
							{#each categories as cat (cat.id)}
								<label class="flex items-center gap-3 rounded-lg px-3 py-2 cursor-pointer hover:bg-[var(--color-surface-800)] transition-colors">
									<input type="checkbox" checked={selectedCategoryIds.has(cat.id)} onchange={() => toggleCategory(cat.id)} class="accent-[var(--color-accent-500)]" />
									<span class="text-sm text-[var(--color-text-secondary)]">{cat.name}</span>
								</label>
							{/each}
						</div>
					{/if}
				{/if}
				<button onclick={() => { if (selectedCount > 0) openExportModal('selected'); }}
					disabled={selectedCount === 0}
					class="self-start rounded-xl bg-[var(--color-accent-500)] px-4 py-2 text-sm font-medium
					       text-white hover:bg-[var(--color-accent-400)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
					Export{selectedCount > 0 ? ` (${selectedCount} item${selectedCount !== 1 ? 's' : ''})` : ''}
				</button>
			</div>
		{/if}
	</div>

	<div class="border-t border-[var(--color-surface-700)]"></div>

	<div class="flex flex-col gap-3">
		<div class="flex flex-col gap-1">
			<h3 class="text-sm font-medium text-[var(--color-text-primary)]">Import</h3>
			<p class="text-xs text-[var(--color-text-muted)]">Importing overwrites existing content with the same title.</p>
		</div>

		{#if importSummary}
			<div class="flex flex-col gap-3 rounded-xl border border-[var(--color-surface-700)] bg-[var(--color-surface-900)] p-4">
				<p class="text-sm font-medium text-[var(--color-success-500)]">Import complete</p>
				<p class="text-sm text-[var(--color-text-secondary)]">
					Imported {importSummary.textbooksImported} textbook{importSummary.textbooksImported !== 1 ? 's' : ''},
					{importSummary.categoriesImported} deck{importSummary.categoriesImported !== 1 ? 's' : ''}.
				</p>
				<button onclick={handleDone} class="self-start rounded-xl bg-[var(--color-accent-500)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-accent-400)] transition-colors">Done</button>
			</div>
		{:else if importing}
			<div class="flex flex-col gap-2 rounded-xl border border-[var(--color-surface-700)] bg-[var(--color-surface-900)] p-4">
				<div class="flex items-center gap-3">
					<svg class="animate-spin shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="color: var(--color-accent-400);"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
					<span class="text-sm text-[var(--color-text-secondary)]">
						{#if importProgress}
							{importProgress.step} ({importProgress.current}/{importProgress.total})
						{:else}
							Reading file…
						{/if}
					</span>
				</div>
			</div>
		{:else}
			{#if importError}<p class="text-sm text-[var(--color-error-400)]">{importError}</p>{/if}
			{#if previewError}<p class="text-sm text-[var(--color-error-400)]">{previewError}</p>{/if}
			<button onclick={() => fileInputEl?.click()}
				class="flex items-center gap-2 self-start rounded-xl border border-[var(--color-surface-600)]
				       px-4 py-2.5 text-sm font-medium text-[var(--color-text-secondary)]
				       hover:text-[var(--color-text-primary)] hover:border-[var(--color-surface-500)] transition-colors">
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
					<polyline points="17 8 12 3 7 8"/>
					<line x1="12" y1="3" x2="12" y2="15"/>
				</svg>
				Import .studyapp file
			</button>
			<input bind:this={fileInputEl} type="file" accept=".studyapp" onchange={handleFileChange} class="hidden" />
		{/if}
	</div>
</div>
