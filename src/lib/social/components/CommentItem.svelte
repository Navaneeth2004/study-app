<script lang="ts">
	import CommentInput from './CommentInput.svelte';
	import type { Comment } from '$lib/social/socialTypes';
	import { pb } from '$lib/shared/pocketbase';

	interface Props {
		comment: Comment;
		contentOwnerId?: string;
		depth?: number;
		onReply: (parentId: string, text: string) => Promise<void>;
		onEdit: (id: string, text: string) => Promise<void>;
		onDelete: (id: string) => Promise<void>;
		onVote: (id: string, vote: 1 | -1) => Promise<void>;
	}

	let { comment, contentOwnerId = '', depth = 0, onReply, onEdit, onDelete, onVote }: Props = $props();

	const currentUserId = pb.authStore.record?.id ?? '';
	const isOwner = $derived(comment.user === currentUserId);
	const isContentAuthor = $derived(!!contentOwnerId && comment.user === contentOwnerId);
	const displayName = $derived(comment.expand?.user?.name || comment.expand?.user?.email || 'Anonymous');

	let showReply = $state(false);
	let showReplies = $state(false);
	let editing = $state(false);
	let editText = $state(comment.text);
	let confirmDelete = $state(false);
	let votingUp = $state(false);
	let votingDown = $state(false);

	function formatDate(iso: string): string {
		const d = new Date(iso);
		return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
	}

	const netVotes = $derived(comment.upvotes - comment.downvotes);
</script>

<div class="flex flex-col gap-2 {depth > 0 ? 'ml-6 pl-4 border-l border-[var(--color-surface-700)]' : ''}">
	<div class="flex flex-col gap-2 rounded-xl border border-[var(--color-surface-700)]
	            bg-[var(--color-surface-900)] px-4 py-3">
		<!-- Header -->
		<div class="flex items-center gap-2 flex-wrap">
			<span class="text-sm font-medium text-[var(--color-text-primary)]">{displayName}</span>
			{#if isContentAuthor}
				<span class="rounded-full px-2 py-0.5 text-xs font-medium"
				      style="background: color-mix(in srgb, var(--color-accent-500) 15%, transparent); color: var(--color-accent-400);">
					Author
				</span>
			{/if}
			<span class="text-xs text-[var(--color-text-muted)]">{formatDate(comment.created)}</span>
			{#if comment.updated !== comment.created && !comment.isDeleted}
				<span class="text-xs text-[var(--color-text-muted)]">(edited)</span>
			{/if}
		</div>

		<!-- Body -->
		{#if comment.isDeleted}
			<p class="text-sm italic text-[var(--color-text-muted)]">This comment was deleted.</p>
		{:else if editing}
			<textarea
				bind:value={editText}
				rows={3}
				class="w-full resize-none rounded-xl border border-[var(--color-surface-700)]
				       bg-[var(--color-surface-800)] px-3 py-2 text-sm text-[var(--color-text-primary)]
				       placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent-500)]
				       focus:outline-none transition-colors"
			></textarea>
			<div class="flex gap-2">
				<button
					onclick={async () => { await onEdit(comment.id, editText); editing = false; }}
					disabled={!editText.trim()}
					class="rounded-lg bg-[var(--color-accent-500)] px-3 py-1 text-xs font-medium
					       text-white hover:bg-[var(--color-accent-400)] disabled:opacity-50 transition-colors">
					Save
				</button>
				<button onclick={() => { editing = false; editText = comment.text; }}
					class="rounded-lg border border-[var(--color-surface-600)] px-3 py-1 text-xs
					       text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
					Cancel
				</button>
			</div>
		{:else}
			<p class="text-sm text-[var(--color-text-primary)] leading-relaxed whitespace-pre-wrap">{comment.text}</p>
		{/if}

		<!-- Actions row -->
		{#if !comment.isDeleted}
			<div class="flex items-center gap-3 pt-0.5 flex-wrap">
				<!-- Vote buttons -->
				<div class="flex items-center gap-1">
					<button
						onclick={async () => { votingUp = true; try { await onVote(comment.id, 1); } finally { votingUp = false; } }}
						disabled={votingUp}
						class="flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs transition-colors
						       {comment.userVote === 1
							? 'bg-[var(--color-success-500)]/15 text-[var(--color-success-500)]'
							: 'text-[var(--color-text-muted)] hover:text-[var(--color-success-500)] hover:bg-[var(--color-surface-800)]'}"
						aria-label="Upvote"
					>
						<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
							<polyline points="18 15 12 9 6 15"/>
						</svg>
						{comment.upvotes}
					</button>
					<button
						onclick={async () => { votingDown = true; try { await onVote(comment.id, -1); } finally { votingDown = false; } }}
						disabled={votingDown}
						class="flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs transition-colors
						       {comment.userVote === -1
							? 'bg-[var(--color-error-500)]/15 text-[var(--color-error-400)]'
							: 'text-[var(--color-text-muted)] hover:text-[var(--color-error-400)] hover:bg-[var(--color-surface-800)]'}"
						aria-label="Downvote"
					>
						<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
							<polyline points="6 9 12 15 18 9"/>
						</svg>
						{comment.downvotes}
					</button>
					{#if netVotes !== 0}
						<span class="text-xs {netVotes > 0 ? 'text-[var(--color-success-500)]' : 'text-[var(--color-error-400)]'}">
							{netVotes > 0 ? '+' : ''}{netVotes}
						</span>
					{/if}
				</div>

				{#if depth === 0}
					<button
						onclick={() => (showReply = !showReply)}
						class="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
					>
						Reply
					</button>
				{/if}

				{#if (comment.replies?.length ?? 0) > 0 && depth === 0}
					<button
						onclick={() => (showReplies = !showReplies)}
						class="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
					>
						{showReplies ? 'Hide' : 'Show'} {comment.replies!.length} {comment.replies!.length === 1 ? 'reply' : 'replies'}
					</button>
				{/if}

				{#if isOwner && !editing}
					<div class="flex items-center gap-2 ml-auto">
						<button onclick={() => { editing = true; editText = comment.text; }}
							class="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors">
							Edit
						</button>
						{#if !confirmDelete}
							<button onclick={() => (confirmDelete = true)}
								class="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-error-400)] transition-colors">
								Delete
							</button>
						{:else}
							<span class="text-xs text-[var(--color-text-secondary)]">Delete?</span>
							<button onclick={async () => { await onDelete(comment.id); confirmDelete = false; }}
								class="text-xs text-[var(--color-error-400)] hover:underline">Yes</button>
							<button onclick={() => (confirmDelete = false)}
								class="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]">No</button>
						{/if}
					</div>
				{/if}
			</div>
		{/if}
	</div>

	{#if showReply && depth === 0}
		<div class="ml-6">
			<CommentInput
				placeholder="Write a reply…"
				compact={true}
				onPost={async (text) => { await onReply(comment.id, text); showReply = false; showReplies = true; }}
			/>
		</div>
	{/if}

	{#if showReplies && comment.replies && depth === 0}
		{#each comment.replies as reply (reply.id)}
			<svelte:self
				comment={reply}
				{contentOwnerId}
				depth={1}
				{onReply}
				{onEdit}
				{onDelete}
				{onVote}
			/>
		{/each}
	{/if}
</div>
