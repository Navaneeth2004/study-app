<script lang="ts">
	import { onMount } from 'svelte';
	import { listTextbooks } from '$lib/creator/textbookService';
	import { listCategories, listByCategory } from '$lib/creator/flashcardService';
	import { listChapters } from '$lib/creator/chapterService';
	import {
		shareTextbook, unshareTextbook,
		shareCategory, unshareCategory,
		getTextbookSharingStates, getCategorySharingStates
	} from '$lib/sharing/sharingService';
	import { verifyPassword } from '$lib/auth/authService';
	import PasswordInput from '$lib/shared/components/PasswordInput.svelte';
	import type { Textbook } from '$lib/creator/creatorTypes';
	import type { FlashcardCategory } from '$lib/creator/flashcardTypes';

	type Tab = 'textbooks' | 'decks';
	type PendingAction = { id: string; action: 'share' | 'unshare'; type: 'textbook' | 'category' };

	interface SharedState {
		isShared: boolean;
		shareTitle: string;
		shareDescription: string;
	}

	let tab = $state<Tab>('textbooks');
	let textbooks = $state<Textbook[]>([]);
	let categories = $state<FlashcardCategory[]>([]);
	let sharedStates = $state<Record<string, SharedState>>({});
	let editingId = $state<string | null>(null);
	let editTitle = $state('');
	let editDesc = $state('');
	let confirmUnshareId = $state<string | null>(null);
	let saving = $state(false);
	let loading = $state(true);
	let error = $state('');

	let pendingAction = $state<PendingAction | null>(null);
	let passwordValue = $state('');
	let passwordError = $state('');
	let verifying = $state(false);

	onMount(async () => {
		loading = true;
		try {
			const [books, cats, bookStates, catStates] = await Promise.all([
				listTextbooks(),
				listCategories(),
				getTextbookSharingStates(),
				getCategorySharingStates()
			]);
			textbooks = books;
			categories = cats;
			const states: Record<string, SharedState> = {};
			for (const s of [...bookStates, ...catStates]) {
				states[s.id] = { isShared: s.isShared, shareTitle: s.shareTitle, shareDescription: s.shareDescription };
			}
			sharedStates = states;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not load content.';
		} finally {
			loading = false;
		}
	});

	let validating = $state(false);
	let validationError = $state<Record<string, string>>({});

	async function requestShare(id: string, type: 'textbook' | 'category') {
		validating = true;
		validationError = { ...validationError, [id]: '' };
		try {
			if (type === 'textbook') {
				const chapters = await listChapters(id);
				if (chapters.length === 0) {
					validationError = { ...validationError, [id]: 'This textbook has no chapters. Add at least one chapter before sharing.' };
					return;
				}
			} else {
				const cards = await listByCategory(id);
				if (cards.length === 0) {
					validationError = { ...validationError, [id]: 'This category has no flashcards. Add at least one flashcard before sharing.' };
					return;
				}
			}
		} catch {
			validationError = { ...validationError, [id]: 'Could not validate content.' };
			return;
		} finally {
			validating = false;
		}
		passwordValue = '';
		passwordError = '';
		pendingAction = { id, action: 'share', type };
	}

	function requestUnshare(id: string, type: 'textbook' | 'category') {
		passwordValue = '';
		passwordError = '';
		pendingAction = { id, action: 'unshare', type };
	}

	async function handlePasswordConfirm() {
		if (!pendingAction || !passwordValue.trim()) return;
		verifying = true;
		passwordError = '';
		try {
			const ok = await verifyPassword(passwordValue);
			if (!ok) {
				passwordError = 'Incorrect password.';
				return;
			}
			if (pendingAction.action === 'share') {
				const existing = sharedStates[pendingAction.id];
				editTitle = existing?.shareTitle ?? '';
				editDesc = existing?.shareDescription ?? '';
				editingId = pendingAction.id;
				pendingAction = null;
			} else {
				confirmUnshareId = pendingAction.id;
				pendingAction = null;
			}
		} finally {
			verifying = false;
			passwordValue = '';
		}
	}

	async function handleSaveShare(id: string, type: 'textbook' | 'category') {
		if (!editTitle.trim()) return;
		saving = true;
		error = '';
		try {
			if (type === 'textbook') await shareTextbook(id, editTitle.trim(), editDesc.trim());
			else await shareCategory(id, editTitle.trim(), editDesc.trim());
			sharedStates = {
				...sharedStates,
				[id]: { isShared: true, shareTitle: editTitle.trim(), shareDescription: editDesc.trim() }
			};
			editingId = null;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not save.';
		} finally {
			saving = false;
		}
	}

	async function handleUnshare(id: string, type: 'textbook' | 'category') {
		saving = true;
		error = '';
		try {
			if (type === 'textbook') await unshareTextbook(id);
			else await unshareCategory(id);
			sharedStates = { ...sharedStates, [id]: { ...sharedStates[id], isShared: false } };
			confirmUnshareId = null;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not unshare.';
		} finally {
			saving = false;
		}
	}
</script>

<section class="flex flex-col gap-5 rounded-2xl border border-[var(--color-surface-700)]
                bg-[var(--color-surface-900)] p-6">
	<div class="flex flex-col gap-1">
		<h2 class="text-base font-semibold text-[var(--color-text-primary)]">Content Sharing</h2>
		<p class="text-sm text-[var(--color-text-secondary)]">
			Share your content publicly so other users can discover and install it.
		</p>
	</div>

	<div class="flex gap-1 border-b border-[var(--color-surface-700)]">
		<button onclick={() => (tab = 'textbooks')}
			class="px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors
			       {tab === 'textbooks' ? 'border-[var(--color-accent-500)] text-[var(--color-accent-400)]' : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'}">
			Textbooks
		</button>
		<button onclick={() => (tab = 'decks')}
			class="px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors
			       {tab === 'decks' ? 'border-[var(--color-accent-500)] text-[var(--color-accent-400)]' : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'}">
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
	{:else}
		{@const items = tab === 'textbooks' ? textbooks : categories}
		{@const type = tab === 'textbooks' ? 'textbook' : 'category'}

		{#if items.length === 0}
			<p class="text-sm text-[var(--color-text-muted)]">
				No {tab === 'textbooks' ? 'textbooks' : 'flashcard categories'} yet.
			</p>
		{:else}
			<div class="flex flex-col gap-3">
				{#each items as item (item.id)}
					{@const state = sharedStates[item.id]}
					{@const isShared = state?.isShared ?? false}

					<div class="flex flex-col gap-3 rounded-xl border border-[var(--color-surface-700)]
					            bg-[var(--color-surface-800)] p-4">
						<div class="flex items-center justify-between gap-3">
							<span class="flex-1 truncate text-sm font-medium text-[var(--color-text-primary)]">
								{'title' in item ? item.title : item.name}
							</span>
							{#if isShared}
								<div class="flex items-center gap-2">
									<span class="text-xs font-medium text-[var(--color-success-500)]">Shared</span>
									<button onclick={() => requestShare(item.id, type)}
										class="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors">
										Edit
									</button>
									<button onclick={() => requestUnshare(item.id, type)}
										class="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-error-400)] transition-colors">
										Unshare
									</button>
								</div>
							{:else}
								<button onclick={() => requestShare(item.id, type)}
									class="shrink-0 rounded-lg bg-[var(--color-accent-500)] px-3 py-1 text-xs font-medium
									       text-[var(--color-text-primary)] hover:bg-[var(--color-accent-400)] transition-colors">
									Share
								</button>
							{/if}
						</div>

						{#if isShared && state?.shareTitle && editingId !== item.id}
							<div class="flex flex-col gap-0.5">
								<p class="text-xs font-medium text-[var(--color-text-secondary)]">{state.shareTitle}</p>
								{#if state.shareDescription}
									<p class="text-xs text-[var(--color-text-muted)]">{state.shareDescription}</p>
								{/if}
							</div>
						{/if}

						{#if validationError[item.id]}
							<p class="text-xs text-[var(--color-error-400)]">{validationError[item.id]}</p>
						{/if}

						{#if pendingAction?.id === item.id}
							<div class="flex flex-col gap-3 rounded-lg border border-[var(--color-surface-600)]
							            bg-[var(--color-surface-900)] p-3">
								<p class="text-xs text-[var(--color-text-secondary)]">
									Confirm your password to {pendingAction.action === 'share' ? 'share' : 'unshare'} this content.
								</p>
								<PasswordInput
									bind:value={passwordValue}
									id="sharing-pw-{item.id}"
									label=""
									placeholder="Your password"
									error={passwordError}
									disabled={verifying}
								/>
								<div class="flex gap-2">
									<button
										onclick={handlePasswordConfirm}
										disabled={verifying || !passwordValue.trim()}
										class="rounded-lg bg-[var(--color-accent-500)] px-4 py-1.5 text-xs font-medium
										       text-[var(--color-text-primary)] hover:bg-[var(--color-accent-400)]
										       disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
									>
										{verifying ? 'Checking…' : 'Confirm'}
									</button>
									<button onclick={() => { pendingAction = null; passwordError = ''; }}
										class="rounded-lg border border-[var(--color-surface-600)] px-4 py-1.5 text-xs
										       text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
										Cancel
									</button>
								</div>
							</div>
						{/if}

						{#if confirmUnshareId === item.id}
							<div class="flex flex-col gap-3 rounded-lg border border-[var(--color-warning-500)]/30
							            bg-[var(--color-warning-500)]/5 p-3">
								<p class="text-xs text-[var(--color-text-secondary)]">
									This will remove your content from search. Continue?
								</p>
								<div class="flex gap-2">
									<button onclick={() => handleUnshare(item.id, type)} disabled={saving}
										class="rounded-lg bg-[var(--color-error-500)]/15 px-3 py-1.5 text-xs font-medium
										       text-[var(--color-error-400)] hover:bg-[var(--color-error-500)]/25
										       disabled:opacity-50 transition-colors">
										Yes, remove
									</button>
									<button onclick={() => (confirmUnshareId = null)}
										class="rounded-lg border border-[var(--color-surface-600)] px-3 py-1.5 text-xs
										       text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
										Cancel
									</button>
								</div>
							</div>
						{/if}

						{#if editingId === item.id}
							<div class="flex flex-col gap-3">
								<div class="flex flex-col gap-1.5">
									<label for="share-title-{item.id}" class="text-xs font-medium text-[var(--color-text-secondary)]">
										Display title <span class="text-[var(--color-error-400)]">*</span>
									</label>
									<input id="share-title-{item.id}" bind:value={editTitle} type="text" placeholder="How it appears in search…"
										class="w-full rounded-lg border border-[var(--color-surface-600)]
										       bg-[var(--color-surface-900)] px-3 py-2 text-sm
										       text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]
										       focus:outline-none focus:border-[var(--color-accent-500)] transition-colors" />
								</div>
								<div class="flex flex-col gap-1.5">
									<label for="share-desc-{item.id}" class="text-xs font-medium text-[var(--color-text-secondary)]">
										Description (optional)
									</label>
									<input id="share-desc-{item.id}" bind:value={editDesc} type="text" placeholder="Brief description for search results…"
										class="w-full rounded-lg border border-[var(--color-surface-600)]
										       bg-[var(--color-surface-900)] px-3 py-2 text-sm
										       text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]
										       focus:outline-none focus:border-[var(--color-accent-500)] transition-colors" />
								</div>
								<div class="flex gap-2">
									<button onclick={() => handleSaveShare(item.id, type)}
										disabled={saving || !editTitle.trim()}
										class="rounded-lg bg-[var(--color-accent-500)] px-4 py-1.5 text-xs font-medium
										       text-[var(--color-text-primary)] hover:bg-[var(--color-accent-400)]
										       disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
										{saving ? 'Saving…' : 'Save'}
									</button>
									<button onclick={() => (editingId = null)}
										class="rounded-lg border border-[var(--color-surface-600)] px-4 py-1.5 text-xs
										       text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
										Cancel
									</button>
								</div>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	{/if}
</section>
