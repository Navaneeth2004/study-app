<script lang="ts">
	import { onMount } from 'svelte';
	import { listTextbooks, createTextbook, deleteTextbook } from '$lib/creator/textbookService';
	import TextbookCard from '$lib/creator/components/TextbookCard.svelte';
	import EmptyState from '$lib/shared/components/EmptyState.svelte';
	import UnsavedChangesModal from '$lib/shared/components/UnsavedChangesModal.svelte';
	import type { Textbook } from '$lib/creator/creatorTypes';

	let textbooks = $state<Textbook[]>([]);
	let loading = $state(true);
	let error = $state('');

	// New textbook modal
	let showModal = $state(false);
	let title = $state('');
	let description = $state('');
	let saving = $state(false);
	let formError = $state('');
	let showDiscard = $state(false);

	const isDirty = $derived(title.trim() !== '' || description.trim() !== '');

	onMount(async () => { await load(); });

	async function load() {
		loading = true; error = '';
		try { textbooks = await listTextbooks(); }
		catch (e) { error = e instanceof Error ? e.message : 'Could not load textbooks.'; }
		finally { loading = false; }
	}

	async function handleDelete(id: string) {
		try {
			await deleteTextbook(id);
			textbooks = textbooks.filter((t) => t.id !== id);
		} catch (e) { error = e instanceof Error ? e.message : 'Could not delete textbook.'; }
	}

	function handleUpdated(id: string, updated: { title: string; description: string }) {
		textbooks = textbooks.map((t) =>
			t.id === id ? { ...t, title: updated.title, description: updated.description } : t
		);
	}

	function openModal() { title = ''; description = ''; formError = ''; showModal = true; }
	function attemptClose() { if (isDirty) showDiscard = true; else closeModal(); }
	function closeModal() { showModal = false; title = ''; description = ''; formError = ''; }

	async function handleCreate() {
		if (!title.trim()) { formError = 'Title is required.'; return; }
		saving = true; formError = '';
		try {
			const tb = await createTextbook({ title: title.trim(), description: description.trim() });
			textbooks = [tb, ...textbooks];
			closeModal();
		} catch (e) { formError = e instanceof Error ? e.message : 'Could not create textbook.'; }
		finally { saving = false; }
	}

	function handleKeydown(e: KeyboardEvent) { if (e.key === 'Enter') handleCreate(); }
</script>

<svelte:head><title>My Textbooks — StudyApp</title></svelte:head>

<UnsavedChangesModal
	isOpen={showDiscard}
	zClass="z-[60]"
	saving={false}
	onSave={async () => { showDiscard = false; }}
	onLeave={() => { showDiscard = false; closeModal(); }}
	onStay={() => (showDiscard = false)}
/>

{#if showModal}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4"
	     style="background: rgba(0,0,0,0.7);" onclick={attemptClose}>
		<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
		<div class="relative w-full max-w-md rounded-2xl border border-[var(--color-surface-700)]
		            bg-[var(--color-surface-950)] shadow-2xl"
		     onclick={(e) => e.stopPropagation()}>
			<div class="flex items-center justify-between border-b border-[var(--color-surface-700)] px-5 py-4">
				<span class="text-sm font-semibold text-[var(--color-text-secondary)]">New Textbook</span>
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
					<label for="tb-title" class="text-sm font-medium text-[var(--color-text-secondary)]">Title</label>
					<input id="tb-title" type="text" bind:value={title} placeholder="e.g. Introduction to Biology"
						onkeydown={handleKeydown}
						class="w-full rounded-xl border border-[var(--color-surface-600)]
						       bg-[var(--color-surface-800)] px-4 py-3 text-sm
						       text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]
						       focus:border-[var(--color-accent-500)] focus:outline-none
						       focus:ring-2 focus:ring-[var(--color-accent-500)]/20 transition-colors" />
				</div>
				<div class="flex flex-col gap-1.5">
					<label for="tb-desc" class="text-sm font-medium text-[var(--color-text-secondary)]">Description (optional)</label>
					<input id="tb-desc" type="text" bind:value={description} placeholder="A short description"
						onkeydown={handleKeydown}
						class="w-full rounded-xl border border-[var(--color-surface-600)]
						       bg-[var(--color-surface-800)] px-4 py-3 text-sm
						       text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]
						       focus:border-[var(--color-accent-500)] focus:outline-none
						       focus:ring-2 focus:ring-[var(--color-accent-500)]/20 transition-colors" />
				</div>
				{#if formError}<p class="text-sm text-[var(--color-error-400)]">{formError}</p>{/if}
				<div class="flex gap-3">
					<button onclick={handleCreate} disabled={saving}
						class="rounded-xl bg-[var(--color-accent-500)] px-5 py-2.5 text-sm font-medium
						       text-white hover:bg-[var(--color-accent-400)]
						       disabled:cursor-not-allowed disabled:opacity-50 transition-colors">
						{saving ? 'Creating…' : 'Create Textbook'}
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

<div class="flex flex-col gap-6">
	<div class="flex items-center justify-between gap-4">
		<div class="flex flex-col gap-1">
			<h1 class="font-display text-3xl text-[var(--color-text-primary)]">My Textbooks</h1>
			<p class="text-[var(--color-text-secondary)]">Create and manage your study materials.</p>
		</div>
		<button onclick={openModal}
			class="flex items-center gap-2 rounded-xl bg-[var(--color-accent-500)] px-4 py-2.5
			       text-sm font-medium text-white hover:bg-[var(--color-accent-400)]
			       transition-colors shrink-0">
			<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
				<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
			</svg>
			New Textbook
		</button>
	</div>

	{#if error}<p class="text-sm text-[var(--color-error-400)]">{error}</p>{/if}

	{#if loading}
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each Array(3) as _}
				<div class="rounded-xl border border-[var(--color-surface-700)] bg-[var(--color-surface-900)] p-5">
					<div class="mb-2 h-4 w-2/3 rounded bg-[var(--color-surface-800)]"></div>
					<div class="h-3 w-1/2 rounded bg-[var(--color-surface-800)]"></div>
				</div>
			{/each}
		</div>
	{:else if textbooks.length === 0}
		<EmptyState heading="No textbooks yet" description="Create your first textbook to get started." />
	{:else}
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each textbooks as textbook (textbook.id)}
				<TextbookCard
					{textbook}
					onDelete={handleDelete}
					onUpdated={(updated) => handleUpdated(textbook.id, updated)}
				/>
			{/each}
		</div>
	{/if}
</div>
