<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { listTextbooks, deleteTextbook } from '$lib/creator/textbookService';
	import TextbookCard from '$lib/creator/components/TextbookCard.svelte';
	import EmptyState from '$lib/shared/components/EmptyState.svelte';
	import type { Textbook } from '$lib/creator/creatorTypes';

	let textbooks = $state<Textbook[]>([]);
	let loading = $state(true);
	let error = $state('');

	onMount(async () => {
		await load();
	});

	async function load() {
		loading = true;
		error = '';
		try {
			textbooks = await listTextbooks();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not load textbooks.';
		} finally {
			loading = false;
		}
	}

	async function handleDelete(id: string) {
		try {
			await deleteTextbook(id);
			textbooks = textbooks.filter((t) => t.id !== id);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not delete textbook.';
		}
	}
</script>

<svelte:head>
	<title>My Textbooks — StudyApp</title>
</svelte:head>

<div class="flex flex-col gap-6">
	<div class="flex items-center justify-between gap-4">
		<div class="flex flex-col gap-1">
			<h1 class="font-display text-3xl text-[var(--color-text-primary)]">My Textbooks</h1>
			<p class="text-[var(--color-text-secondary)]">Create and manage your study materials.</p>
		</div>
		<a
			href="/creator/textbooks/new"
			class="flex items-center gap-2 rounded-xl bg-[var(--color-accent-500)] px-4 py-2.5
			       text-sm font-medium text-white hover:bg-[var(--color-accent-400)]
			       transition-colors shrink-0"
		>
			<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
				<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
			</svg>
			New Textbook
		</a>
	</div>

	{#if error}
		<p class="text-sm text-[var(--color-error-400)]">{error}</p>
	{/if}

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
		<EmptyState
			heading="No textbooks yet"
			description="Create your first textbook to get started."
		/>
	{:else}
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each textbooks as textbook (textbook.id)}
				<TextbookCard {textbook} onDelete={handleDelete} />
			{/each}
		</div>
	{/if}
</div>
