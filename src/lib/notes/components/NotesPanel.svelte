<script lang="ts">
	import { onMount } from 'svelte';
	import { getNoteForChapter, saveNote, deleteNote } from '$lib/notes/noteService';
	import UnsavedChangesModal from '$lib/shared/components/UnsavedChangesModal.svelte';
	import { playerTrackStore } from '$lib/audio/audioStore';
	import type { ChapterNote } from '$lib/notes/noteTypes';

	interface Props {
		chapterId: string;
		isOpen: boolean;
		onClose: () => void;
	}

	let { chapterId, isOpen, onClose }: Props = $props();

	let note        = $state<ChapterNote | null>(null);
	let content     = $state('');
	let savedContent = $state('');
	let loading     = $state(false);
	let saving      = $state(false);
	let error       = $state('');
	let confirmDelete = $state(false);
	let showDiscard = $state(false);

	const isDirty    = $derived(content !== savedContent);
	const charCount  = $derived(content.length);
	// Shrink panel bottom when global player is visible
	const bottomStyle = $derived($playerTrackStore ? 'bottom: 5rem' : 'bottom: 0');

	$effect(() => {
		if (isOpen && chapterId) loadNote();
	});

	async function loadNote() {
		loading = true; error = '';
		try {
			note = await getNoteForChapter(chapterId);
			content = note?.content ?? '';
			savedContent = content;
		} catch (e) { error = e instanceof Error ? e.message : 'Could not load note.'; }
		finally { loading = false; }
	}

	async function handleSave() {
		if (!isDirty) return;
		saving = true; error = '';
		try {
			note = await saveNote(chapterId, content);
			savedContent = content;
		} catch (e) { error = e instanceof Error ? e.message : 'Could not save note.'; }
		finally { saving = false; }
	}

	async function handleDelete() {
		saving = true; error = '';
		try {
			await deleteNote(chapterId);
			note = null; content = ''; savedContent = ''; confirmDelete = false;
		} catch (e) { error = e instanceof Error ? e.message : 'Could not delete note.'; }
		finally { saving = false; }
	}

	function attemptClose() {
		if (isDirty) showDiscard = true;
		else onClose();
	}
</script>

<UnsavedChangesModal
	isOpen={showDiscard} zClass="z-[60]" saving={saving}
	onSave={async () => { await handleSave(); showDiscard = false; onClose(); }}
	onLeave={() => { showDiscard = false; content = savedContent; onClose(); }}
	onStay={() => (showDiscard = false)}
/>

{#if isOpen}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="fixed inset-0 z-40 bg-black/40 lg:hidden" onclick={attemptClose}></div>
{/if}

<div class="fixed right-0 z-40 flex flex-col border-l border-[var(--color-surface-700)]
            bg-[var(--color-surface-950)] shadow-2xl transition-all duration-300
            {isOpen ? 'translate-x-0' : 'translate-x-full'}"
     style="top: 4rem; {bottomStyle}; width: min(320px, 100vw);">

	<div class="flex shrink-0 items-center justify-between border-b border-[var(--color-surface-700)] px-5 py-4">
		<div class="flex items-center gap-2">
			<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
			     stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"
			     class="text-[var(--color-accent-400)]">
				<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
				<polyline points="14 2 14 8 20 8"/>
			</svg>
			<span class="text-sm font-semibold text-[var(--color-text-primary)]">My Notes</span>
		</div>
		<button onclick={attemptClose} aria-label="Close notes"
			class="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-text-muted)]
			       hover:bg-[var(--color-surface-800)] hover:text-[var(--color-text-primary)] transition-colors">
			<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
				<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
			</svg>
		</button>
	</div>

	<div class="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
		{#if loading}
			<div class="h-24 rounded-xl bg-[var(--color-surface-800)]"></div>
		{:else}
			{#if !note && !content}
				<p class="text-xs text-[var(--color-text-muted)]">No notes yet. Start typing to add your first note.</p>
			{/if}
			<textarea bind:value={content} placeholder="Write your notes here…"
				class="w-full resize-none rounded-xl border border-[var(--color-surface-700)]
				       bg-[var(--color-surface-800)] p-3 text-sm text-[var(--color-text-primary)]
				       placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent-500)]
				       focus:outline-none transition-colors"
				style="min-height: 160px; flex: 1;"></textarea>
			<div class="flex items-center justify-between">
				<span class="text-xs text-[var(--color-text-muted)]">{charCount} chars</span>
				{#if isDirty}<span class="text-xs text-[var(--color-warning-400)]">Unsaved changes</span>{/if}
			</div>
			{#if error}<p class="text-xs text-[var(--color-error-400)]">{error}</p>{/if}
		{/if}
	</div>

	<div class="flex shrink-0 items-center gap-2 border-t border-[var(--color-surface-700)] p-4">
		<button onclick={handleSave} disabled={saving || !isDirty || loading}
			class="flex-1 rounded-xl bg-[var(--color-accent-500)] py-2 text-sm font-medium text-white
			       hover:bg-[var(--color-accent-400)] disabled:cursor-not-allowed disabled:opacity-50 transition-colors">
			{saving ? 'Saving…' : 'Save'}
		</button>
		{#if note}
			{#if !confirmDelete}
				<button onclick={() => (confirmDelete = true)} disabled={saving}
					class="rounded-xl border border-[var(--color-surface-600)] px-3 py-2 text-sm
					       text-[var(--color-text-secondary)] hover:text-[var(--color-error-400)] transition-colors">
					<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
						<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
					</svg>
				</button>
			{:else}
				<button onclick={handleDelete} disabled={saving}
					class="rounded-xl bg-[var(--color-error-500)]/15 px-3 py-2 text-xs text-[var(--color-error-400)] hover:bg-[var(--color-error-500)]/25 transition-colors">Delete</button>
				<button onclick={() => (confirmDelete = false)}
					class="rounded-xl border border-[var(--color-surface-600)] px-2 py-2 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">Cancel</button>
			{/if}
		{/if}
	</div>
</div>
