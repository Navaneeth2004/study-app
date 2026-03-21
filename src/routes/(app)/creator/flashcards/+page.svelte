<script lang="ts">
	import { onMount } from 'svelte';
	import {
		listCategories, listByCategory, createCategory,
		updateCategory, deleteCategory
	} from '$lib/creator/flashcardService';
	import CategoryCard from '$lib/creator/components/flashcards/CategoryCard.svelte';
	import EmptyState from '$lib/shared/components/EmptyState.svelte';
	import FormField from '$lib/shared/components/FormField.svelte';
	import type { FlashcardCategory } from '$lib/creator/flashcardTypes';

	let categories = $state<FlashcardCategory[]>([]);
	let loading = $state(true);
	let error = $state('');
	let showNewCategory = $state(false);
	let newCategoryName = $state('');
	let newCategoryDesc = $state('');
	let savingCategory = $state(false);
	let editingCategory = $state<FlashcardCategory | null>(null);
	let editName = $state('');
	let editDesc = $state('');

	onMount(async () => {
		await load();
	});

	async function load() {
		loading = true;
		error = '';
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
		} finally {
			loading = false;
		}
	}

	async function handleCreateCategory() {
		if (!newCategoryName.trim()) return;
		savingCategory = true;
		try {
			const cat = await createCategory(newCategoryName.trim(), newCategoryDesc.trim());
			categories = [...categories, { ...cat, cardCount: 0 }];
			newCategoryName = '';
			newCategoryDesc = '';
			showNewCategory = false;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not create category.';
		} finally {
			savingCategory = false;
		}
	}

	async function handleUpdateCategory() {
		if (!editingCategory || !editName.trim()) return;
		savingCategory = true;
		try {
			await updateCategory(editingCategory.id, editName.trim(), editDesc.trim());
			categories = categories.map((c) =>
				c.id === editingCategory!.id ? { ...c, name: editName.trim(), description: editDesc.trim() } : c
			);
			editingCategory = null;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not update category.';
		} finally {
			savingCategory = false;
		}
	}

	async function handleDeleteCategory(id: string) {
		try {
			await deleteCategory(id);
			categories = categories.filter((c) => c.id !== id);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not delete category.';
		}
	}

	function startEdit(category: FlashcardCategory) {
		editingCategory = category;
		editName = category.name;
		editDesc = category.description;
	}
</script>

<svelte:head>
	<title>Solo Flashcards — StudyApp</title>
</svelte:head>

<div class="flex flex-col gap-8">

	<div class="flex items-center justify-between gap-4">
		<div class="flex flex-col gap-1">
			<h1 class="font-display text-3xl text-[var(--color-text-primary)]">Solo Flashcards</h1>
			<p class="text-[var(--color-text-secondary)]">Standalone cards organised by category.</p>
		</div>
		{#if !showNewCategory}
			<button
				onclick={() => (showNewCategory = true)}
				class="flex items-center gap-2 rounded-xl bg-[var(--color-accent-500)] px-4 py-2.5
				       text-sm font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-accent-400)]
				       transition-colors shrink-0"
			>
				<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
					<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
				</svg>
				New Category
			</button>
		{/if}
	</div>

	{#if error}
		<p class="text-sm text-[var(--color-error-400)]">{error}</p>
	{/if}

	<!-- New category inline form -->
	{#if showNewCategory}
		<div class="flex flex-col gap-3 rounded-xl border border-[var(--color-accent-500)]/30 max-w-2xl
		            bg-[var(--color-surface-900)] p-5">
			<h3 class="text-sm font-semibold text-[var(--color-text-secondary)]">New Category</h3>
			<FormField id="cat-name" label="Name" type="text" bind:value={newCategoryName} placeholder="e.g. Spanish Vocabulary" />
			<FormField id="cat-desc" label="Description (optional)" type="text" bind:value={newCategoryDesc} placeholder="A short description" />
			<div class="flex gap-3">
				<button
					onclick={handleCreateCategory}
					disabled={savingCategory || !newCategoryName.trim()}
					class="rounded-xl bg-[var(--color-accent-500)] px-4 py-2 text-sm font-medium
					       text-[var(--color-text-primary)] hover:bg-[var(--color-accent-400)]
					       disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
				>
					{savingCategory ? 'Creating…' : 'Create'}
				</button>
				<button
					onclick={() => { showNewCategory = false; newCategoryName = ''; newCategoryDesc = ''; }}
					class="rounded-xl border border-[var(--color-surface-600)] px-4 py-2 text-sm
					       text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
				>
					Cancel
				</button>
			</div>
		</div>
	{/if}

	<!-- Edit category inline form -->
	{#if editingCategory}
		<div class="flex flex-col gap-3 rounded-xl border border-[var(--color-accent-500)]/30 max-w-2xl
		            bg-[var(--color-surface-900)] p-5">
			<h3 class="text-sm font-semibold text-[var(--color-text-secondary)]">Edit Category</h3>
			<FormField id="edit-cat-name" label="Name" type="text" bind:value={editName} placeholder="Category name" />
			<FormField id="edit-cat-desc" label="Description (optional)" type="text" bind:value={editDesc} placeholder="A short description" />
			<div class="flex gap-3">
				<button
					onclick={handleUpdateCategory}
					disabled={savingCategory || !editName.trim()}
					class="rounded-xl bg-[var(--color-accent-500)] px-4 py-2 text-sm font-medium
					       text-[var(--color-text-primary)] hover:bg-[var(--color-accent-400)]
					       disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
				>
					{savingCategory ? 'Saving…' : 'Save'}
				</button>
				<button
					onclick={() => (editingCategory = null)}
					class="rounded-xl border border-[var(--color-surface-600)] px-4 py-2 text-sm
					       text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
				>
					Cancel
				</button>
			</div>
		</div>
	{/if}

	<!-- Categories list -->
	<section class="flex flex-col gap-3">
		{#if loading}
			{#each Array(3) as _}
				<div class="h-14 rounded-xl border border-[var(--color-surface-700)] bg-[var(--color-surface-900)]"></div>
			{/each}
		{:else if categories.length === 0}
			<EmptyState
				heading="No categories yet"
				description="Create a category to organise your flashcards."
			/>
		{:else}
			<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{#each categories as category (category.id)}
					<CategoryCard
						{category}
						onEdit={startEdit}
						onDelete={handleDeleteCategory}
					/>
				{/each}
			</div>
		{/if}
	</section>
</div>
