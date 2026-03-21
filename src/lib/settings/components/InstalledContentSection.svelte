<script lang="ts">
	import { onMount } from 'svelte';
	import { getMyInstalls, uninstallContent } from '$lib/sharing/sharingService';
	import { pb } from '$lib/shared/pocketbase';
	import type { Install } from '$lib/sharing/sharingTypes';

	type Tab = 'textbooks' | 'decks';

	interface InstalledItem {
		installId: string;
		contentId: string;
		shareTitle: string;
		ownerName: string;
	}

	let tab = $state<Tab>('textbooks');
	let installedTextbooks = $state<InstalledItem[]>([]);
	let installedDecks = $state<InstalledItem[]>([]);
	let confirmId = $state<string | null>(null);
	let removing = $state(false);
	let loading = $state(true);
	let error = $state('');

	onMount(async () => {
		loading = true;
		try {
			const installs = await getMyInstalls();
			const textbookInstalls = installs.filter((i) => i.contentType === 'textbook');
			const deckInstalls = installs.filter((i) => i.contentType === 'flashcard_category');

			installedTextbooks = await resolveItems(textbookInstalls, 'textbooks');
			installedDecks = await resolveItems(deckInstalls, 'flashcard_categories');
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not load installed content.';
		} finally {
			loading = false;
		}
	});

	async function resolveItems(installs: Install[], collection: string): Promise<InstalledItem[]> {
		const results = await Promise.all(
			installs.map(async (install) => {
				try {
					const r = await pb.collection(collection).getOne(install.contentId, {
						requestKey: null,
						expand: 'owner'
					});
					const shareTitle = (r.shareTitle as string) || (r.title as string) || (r.name as string) || '';
					const ownerName = (r.expand?.owner as Record<string, unknown>)?.name as string ?? '';
					return { installId: install.id, contentId: install.contentId, shareTitle, ownerName };
				} catch {
					return null;
				}
			})
		);
		return results.filter((r): r is InstalledItem => r !== null);
	}

	async function handleUninstall(installId: string) {
		removing = true;
		error = '';
		try {
			await uninstallContent(installId);
			installedTextbooks = installedTextbooks.filter((i) => i.installId !== installId);
			installedDecks = installedDecks.filter((i) => i.installId !== installId);
			confirmId = null;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not remove.';
		} finally {
			removing = false;
		}
	}

	const currentItems = $derived(tab === 'textbooks' ? installedTextbooks : installedDecks);
</script>

<section class="flex flex-col gap-5 rounded-2xl border border-[var(--color-surface-700)]
                bg-[var(--color-surface-900)] p-6">
	<div class="flex flex-col gap-1">
		<h2 class="text-base font-semibold text-[var(--color-text-primary)]">Installed Content</h2>
		<p class="text-sm text-[var(--color-text-secondary)]">
			Content you have installed from other users.
		</p>
	</div>

	<!-- Tab bar -->
	<div class="flex gap-1 border-b border-[var(--color-surface-700)]">
		<button
			onclick={() => (tab = 'textbooks')}
			class="px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors
			       {tab === 'textbooks'
				? 'border-[var(--color-accent-500)] text-[var(--color-accent-400)]'
				: 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'}"
		>
			Textbooks
		</button>
		<button
			onclick={() => (tab = 'decks')}
			class="px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors
			       {tab === 'decks'
				? 'border-[var(--color-accent-500)] text-[var(--color-accent-400)]'
				: 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'}"
		>
			Flashcard Decks
		</button>
	</div>

	{#if error}
		<p class="text-sm text-[var(--color-error-400)]">{error}</p>
	{/if}

	{#if loading}
		<div class="flex flex-col gap-2">
			{#each Array(3) as _}
				<div class="h-12 rounded-xl bg-[var(--color-surface-800)]"></div>
			{/each}
		</div>
	{:else if currentItems.length === 0}
		<p class="text-sm text-[var(--color-text-muted)]">
			No installed {tab === 'textbooks' ? 'textbooks' : 'flashcard decks'} yet.
		</p>
	{:else}
		<div class="flex flex-col gap-3">
			{#each currentItems as item (item.installId)}
				<div class="flex flex-col gap-3 rounded-xl border border-[var(--color-surface-700)]
				            bg-[var(--color-surface-800)] p-4">
					<div class="flex items-center justify-between gap-3">
						<div class="flex flex-col gap-0.5 min-w-0">
							<span class="truncate text-sm font-medium text-[var(--color-text-primary)]">
								{item.shareTitle}
							</span>
							{#if item.ownerName}
								<span class="text-xs text-[var(--color-text-muted)]">by {item.ownerName}</span>
							{/if}
						</div>
						<button
							onclick={() => (confirmId = item.installId)}
							class="shrink-0 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-error-400)] transition-colors"
						>
							Uninstall
						</button>
					</div>

					{#if confirmId === item.installId}
						<div class="flex flex-col gap-2 rounded-lg border border-[var(--color-warning-500)]/30
						            bg-[var(--color-warning-500)]/5 p-3">
							<p class="text-xs text-[var(--color-text-secondary)]">Remove this from your library?</p>
							<div class="flex gap-2">
								<button
									onclick={() => handleUninstall(item.installId)}
									disabled={removing}
									class="rounded-lg bg-[var(--color-error-500)]/15 px-3 py-1.5 text-xs font-medium
									       text-[var(--color-error-400)] hover:bg-[var(--color-error-500)]/25
									       disabled:opacity-50 transition-colors"
								>
									{removing ? 'Removing…' : 'Yes, remove'}
								</button>
								<button
									onclick={() => (confirmId = null)}
									class="rounded-lg border border-[var(--color-surface-600)] px-3 py-1.5 text-xs
									       text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
								>
									Cancel
								</button>
							</div>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</section>
