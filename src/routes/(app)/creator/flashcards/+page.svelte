<script lang="ts">
	import { onMount } from 'svelte';
	import {
		listCategories, listByCategory, createCategory,
		updateCategory, deleteCategory
	} from '$lib/creator/flashcardService';
	import CategoryCard from '$lib/creator/components/flashcards/CategoryCard.svelte';
	import EmptyState from '$lib/shared/components/EmptyState.svelte';
	import UnsavedChangesModal from '$lib/shared/components/UnsavedChangesModal.svelte';
	import type { FlashcardCategory } from '$lib/creator/flashcardTypes';

	let categories = $state<FlashcardCategory[]>([]);
	let loading = $state(true);
	let error = $state('');
	let editingCategory = $state<FlashcardCategory | null>(null);
	let editName = $state('');
	let editDesc = $state('');

	// New category modal
	let showModal = $state(false);
	let newName = $state('');
	let newDesc = $state('');
	let saving = $state(false);
	let formError = $state('');
	let showDiscard = $state(false);

	const isDirty = $derived(newName.trim() !== '' || newDesc.trim() !== '');

	// Edit category modal
	let showEditModal = $state(false);
	let editShowDiscard = $state(false);
	const isEditDirty = $derived(
		editingCategory ? editName !== editingCategory.name || editDesc !== editingCategory.description : false
	);

	onMount(async () => { await load(); });

	async function load() {
		loading = true; error = '';
		try {
			const cats = await listCategories();
			const withCounts = await Promise.all(
				cats.map(async (cat) => {
					const cards = await listByCategory(cat.id);
					return { ...cat, cardCount: cards.length };
				})
			);
			categories = withCounts;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not load categories.';
		} finally { loading = false; }
	}

	function openNewModal() { newName = ''; newDesc = ''; formError = ''; showModal = true; }

	function attemptCloseNew() {
		if (isDirty) showDiscard = true;
		else closeNewModal();
	}

	function closeNewModal() { showModal = false; newName = ''; newDesc = ''; formError = ''; }

	async function handleCreate() {
		if (!newName.trim()) { formError = 'Name is required.'; return; }
		saving = true; formError = '';
		try {
			const cat = await createCategory(newName.trim(), newDesc.trim());
			categories = [...categories, { ...cat, cardCount: 0 }];
			closeNewModal();
		} catch (e) { formError = e instanceof Error ? e.message : 'Could not create category.'; }
		finally { saving = false; }
	}

	function startEdit(category: FlashcardCategory) {
		editingCategory = category;
		editName = category.name;
		editDesc = category.description;
		formError = '';
		showEditModal = true;
	}

	function attemptCloseEdit() {
		if (isEditDirty) editShowDiscard = true;
		else closeEditModal();
	}

	function closeEditModal() {
		showEditModal = false; editingCategory = null; editName = ''; editDesc = '';
	}

	async function handleUpdate() {
		if (!editingCategory || !editName.trim()) return;
		saving = true;
		try {
			await updateCategory(editingCategory.id, editName.trim(), editDesc.trim());
			categories = categories.map((c) =>
				c.id === editingCategory!.id ? { ...c, name: editName.trim(), description: editDesc.trim() } : c
			);
			closeEditModal();
		} catch (e) { formError = e instanceof Error ? e.message : 'Could not update category.'; }
		finally { saving = false; }
	}

	async function handleDelete(id: string) {
		try {
			await deleteCategory(id);
			categories = categories.filter((c) => c.id !== id);
		} catch (e) { error = e instanceof Error ? e.message : 'Could not delete category.'; }
	}
</script>

<svelte:head>
	<title>Solo Flashcards — StudyApp</title>
</svelte:head>

<!-- New category unsaved guard -->
<UnsavedChangesModal isOpen={showDiscard} zClass="z-[60]" saving={false}
	onSave={async () => { showDiscard = false; }}
	onLeave={() => { showDiscard = false; closeNewModal(); }}
	onStay={() => (showDiscard = false)} />

<!-- Edit category unsaved guard -->
<UnsavedChangesModal isOpen={editShowDiscard} zClass="z-[60]" saving={false}
	onSave={async () => { editShowDiscard = false; }}
	onLeave={() => { editShowDiscard = false; closeEditModal(); }}
	onStay={() => (editShowDiscard = false)} />

<!-- New Category Modal -->
{#if showModal}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4"
	     style="background: rgba(0,0,0,0.7);" onclick={attemptCloseNew}>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="relative w-full max-w-md rounded-2xl border border-[var(--color-surface-700)]
		            bg-[var(--color-surface-950)] shadow-2xl"
		     onclick={(e) => e.stopPropagation()}>
			<div class="flex items-center justify-between border-b border-[var(--color-surface-700)] px-5 py-4">
				<span class="text-sm font-semibold text-[var(--color-text-secondary)]">New Category</span>
				<button onclick={attemptCloseNew} aria-label="Close"
					class="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-text-muted)]
					       hover:bg-[var(--color-surface-800)] hover:text-[var(--color-text-primary)] transition-colors">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
						<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
					</svg>
				</button>
			</div>
			<div class="flex flex-col gap-4 p-5">
				<div class="flex flex-col gap-1.5">
					<label for="cat-name" class="text-sm font-medium text-[var(--color-text-secondary)]">Name</label>
					<input id="cat-name" type="text" bind:value={newName} placeholder="e.g. Spanish Vocabulary"
						onkeydown={(e) => e.key === 'Enter' && handleCreate()}
						class="w-full rounded-xl border border-[var(--color-surface-600)]
						       bg-[var(--color-surface-800)] px-4 py-3 text-sm
						       text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]
						       focus:border-[var(--color-accent-500)] focus:outline-none
						       focus:ring-2 focus:ring-[var(--color-accent-500)]/20 transition-colors" />
				</div>
				<div class="flex flex-col gap-1.5">
					<label for="cat-desc" class="text-sm font-medium text-[var(--color-text-secondary)]">Description (optional)</label>
					<input id="cat-desc" type="text" bind:value={newDesc} placeholder="A short description"
						onkeydown={(e) => e.key === 'Enter' && handleCreate()}
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
						{saving ? 'Creating…' : 'Create'}
					</button>
					<button onclick={attemptCloseNew}
						class="rounded-xl border border-[var(--color-surface-600)] px-5 py-2.5 text-sm
						       text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
						Cancel
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Edit Category Modal -->
{#if showEditModal && editingCategory}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4"
	     style="background: rgba(0,0,0,0.7);" onclick={attemptCloseEdit}>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="relative w-full max-w-md rounded-2xl border border-[var(--color-surface-700)]
		            bg-[var(--color-surface-950)] shadow-2xl"
		     onclick={(e) => e.stopPropagation()}>
			<div class="flex items-center justify-between border-b border-[var(--color-surface-700)] px-5 py-4">
				<span class="text-sm font-semibold text-[var(--color-text-secondary)]">Edit Category</span>
				<button onclick={attemptCloseEdit} aria-label="Close"
					class="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-text-muted)]
					       hover:bg-[var(--color-surface-800)] hover:text-[var(--color-text-primary)] transition-colors">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
						<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
					</svg>
				</button>
			</div>
			<div class="flex flex-col gap-4 p-5">
				<div class="flex flex-col gap-1.5">
					<label for="edit-cat-name" class="text-sm font-medium text-[var(--color-text-secondary)]">Name</label>
					<input id="edit-cat-name" type="text" bind:value={editName} placeholder="Category name"
						class="w-full rounded-xl border border-[var(--color-surface-600)]
						       bg-[var(--color-surface-800)] px-4 py-3 text-sm
						       text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]
						       focus:border-[var(--color-accent-500)] focus:outline-none
						       focus:ring-2 focus:ring-[var(--color-accent-500)]/20 transition-colors" />
				</div>
				<div class="flex flex-col gap-1.5">
					<label for="edit-cat-desc" class="text-sm font-medium text-[var(--color-text-secondary)]">Description (optional)</label>
					<input id="edit-cat-desc" type="text" bind:value={editDesc} placeholder="A short description"
						class="w-full rounded-xl border border-[var(--color-surface-600)]
						       bg-[var(--color-surface-800)] px-4 py-3 text-sm
						       text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]
						       focus:border-[var(--color-accent-500)] focus:outline-none
						       focus:ring-2 focus:ring-[var(--color-accent-500)]/20 transition-colors" />
				</div>
				{#if formError}<p class="text-sm text-[var(--color-error-400)]">{formError}</p>{/if}
				<div class="flex gap-3">
					<button onclick={handleUpdate} disabled={saving || !isEditDirty}
						class="rounded-xl bg-[var(--color-accent-500)] px-5 py-2.5 text-sm font-medium
						       text-white hover:bg-[var(--color-accent-400)]
						       disabled:cursor-not-allowed disabled:opacity-50 transition-colors">
						{saving ? 'Saving…' : 'Save'}
					</button>
					<button onclick={attemptCloseEdit}
						class="rounded-xl border border-[var(--color-surface-600)] px-5 py-2.5 text-sm
						       text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
						Cancel
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<div class="flex flex-col gap-8">
	<div class="flex items-center justify-between gap-4">
		<div class="flex flex-col gap-1">
			<h1 class="font-display text-3xl text-[var(--color-text-primary)]">Solo Flashcards</h1>
			<p class="text-[var(--color-text-secondary)]">Standalone cards organised by category.</p>
		</div>
		<button onclick={openNewModal}
			class="flex items-center gap-2 rounded-xl bg-[var(--color-accent-500)] px-4 py-2.5
			       text-sm font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-accent-400)]
			       transition-colors shrink-0">
			<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
				<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
			</svg>
			New Category
		</button>
	</div>

	{#if error}<p class="text-sm text-[var(--color-error-400)]">{error}</p>{/if}

	<section class="flex flex-col gap-3">
		{#if loading}
			{#each Array(3) as _}
				<div class="h-14 rounded-xl border border-[var(--color-surface-700)] bg-[var(--color-surface-900)]"></div>
			{/each}
		{:else if categories.length === 0}
			<EmptyState heading="No categories yet" description="Create a category to organise your flashcards." />
		{:else}
			<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{#each categories as category (category.id)}
					<CategoryCard {category} onEdit={startEdit} onDelete={handleDelete} />
				{/each}
			</div>
		{/if}
	</section>
</div>
