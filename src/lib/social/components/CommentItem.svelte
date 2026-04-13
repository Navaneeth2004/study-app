<script lang="ts">
	import CommentInput from './CommentInput.svelte';
	import type { Comment } from '$lib/social/socialTypes';
	import { pb } from '$lib/shared/pocketbase';
	import { likeComment, unlikeComment, isLiked, getLikeCount } from '$lib/social/commentLikeService';
	import { onMount } from 'svelte';

	interface Props {
		comment: Comment;
		contentOwnerId?: string;
		contentTitle?: string;
		isContentOwner?: boolean;
		isPinned?: boolean;
		depth?: number;
		onReply: (parentId: string, text: string) => Promise<void>;
		onEdit: (id: string, text: string) => Promise<void>;
		onDelete: (id: string) => Promise<void>;
		onVote: (id: string, vote: 1 | -1) => Promise<void>;
		onPin?: (id: string) => Promise<void>;
		onUnpin?: (id: string) => Promise<void>;
	}

	let {
		comment, contentOwnerId = '', contentTitle = '', isContentOwner = false,
		isPinned = false, depth = 0,
		onReply, onEdit, onDelete, onVote, onPin, onUnpin
	}: Props = $props();

	const currentUserId = pb.authStore.record?.id ?? '';
	const isOwner = $derived(comment.user === currentUserId);
	const isCommentAuthor = $derived(!!contentOwnerId && comment.user === contentOwnerId);
	const displayName = $derived(comment.expand?.user?.name || comment.expand?.user?.email || 'Anonymous');
	const commentUserId = $derived(comment.expand?.user?.id || comment.user);
	const isOwnComment = $derived(commentUserId === currentUserId);

	let showReply = $state(false);
	let showReplies = $state(false);
	let editing = $state(false);
	let editText = $state(comment.text);
	let confirmDelete = $state(false);
	let votingUp = $state(false);
	let votingDown = $state(false);
	let likeId = $state<string | null>(null);
	let likeCount = $state(0);
	let liking = $state(false);
	let pinning = $state(false);

	onMount(async () => {
		const [id, count] = await Promise.all([isLiked(comment.id), getLikeCount(comment.id)]);
		likeId = id;
		likeCount = count;
	});

	async function handleLike() {
		if (liking) return;
		liking = true;
		try {
			if (likeId) {
				await unlikeComment(likeId);
				likeId = null;
				likeCount = Math.max(0, likeCount - 1);
			} else {
				const result = await likeComment(comment.id, comment.user, contentTitle);
				likeId = result.likeId;
				likeCount = result.likeCount;
			}
		} catch { /* silent */ } finally { liking = false; }
	}

	async function handlePin() {
		if (pinning) return;
		pinning = true;
		try { await onPin?.(comment.id); }
		finally { pinning = false; }
	}

	async function handleUnpin() {
		if (pinning) return;
		pinning = true;
		try { await onUnpin?.(comment.id); }
		finally { pinning = false; }
	}

	function formatDate(iso: string): string {
		const d = new Date(iso);
		return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
	}

	const netVotes = $derived(comment.upvotes - comment.downvotes);
</script>

<div class="flex flex-col gap-2 {depth > 0 ? 'ml-6 pl-4 border-l border-[var(--color-surface-700)]' : ''}">
	<div class="flex flex-col gap-2 rounded-xl border
	            {isPinned ? 'border-[var(--color-accent-500)]/30 bg-[var(--color-accent-500)]/5' : 'border-[var(--color-surface-700)] bg-[var(--color-surface-900)]'}
	            px-4 py-3">
		<!-- Header -->
		<div class="flex items-center gap-2 flex-wrap">
			{#if isOwnComment}
				<span class="text-sm font-medium text-[var(--color-text-primary)]">{displayName}</span>
			{:else}
				<a href="/profile/{commentUserId}" class="text-sm font-medium text-[var(--color-text-primary)] hover:text-[var(--color-accent-400)] transition-colors">{displayName}</a>
			{/if}
			{#if isCommentAuthor}
				<span class="rounded-full px-2 py-0.5 text-xs font-medium" style="background: color-mix(in srgb, var(--color-accent-500) 15%, transparent); color: var(--color-accent-400);">Author</span>
			{/if}
			{#if isPinned}
				<span class="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium" style="background: color-mix(in srgb, var(--color-accent-500) 10%, transparent); color: var(--color-accent-400);">
					📌 Pinned
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
			<div class="flex flex-col gap-2">
				<textarea bind:value={editText} rows={3}
					class="w-full resize-none rounded-lg border border-[var(--color-surface-600)]
					       bg-[var(--color-surface-800)] px-3 py-2 text-sm text-[var(--color-text-primary)]
					       focus:outline-none focus:border-[var(--color-accent-500)] transition-colors"></textarea>
				<div class="flex gap-2">
					<button onclick={async () => { await onEdit(comment.id, editText); editing = false; }}
						class="rounded-lg bg-[var(--color-accent-500)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[var(--color-accent-400)] transition-colors">Save</button>
					<button onclick={() => (editing = false)}
						class="rounded-lg border border-[var(--color-surface-600)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">Cancel</button>
				</div>
			</div>
		{:else}
			<p class="text-sm text-[var(--color-text-primary)] leading-relaxed whitespace-pre-wrap">{comment.text}</p>
		{/if}

		<!-- Actions -->
		{#if !comment.isDeleted && !editing}
			<div class="flex items-center gap-2 flex-wrap">
				<!-- Upvote / Downvote -->
				<button onclick={async () => { votingUp = true; try { await onVote(comment.id, 1); } finally { votingUp = false; } }} disabled={votingUp}
					class="flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs transition-colors
					       {comment.userVote === 1 ? 'bg-[var(--color-success-500)]/15 text-[var(--color-success-500)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-success-500)] hover:bg-[var(--color-surface-800)]'}"
					aria-label="Upvote">
					<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="18 15 12 9 6 15"/></svg>
					{comment.upvotes}
				</button>
				<button onclick={async () => { votingDown = true; try { await onVote(comment.id, -1); } finally { votingDown = false; } }} disabled={votingDown}
					class="flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs transition-colors
					       {comment.userVote === -1 ? 'bg-[var(--color-error-500)]/15 text-[var(--color-error-400)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-error-400)] hover:bg-[var(--color-surface-800)]'}"
					aria-label="Downvote">
					<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>
					{comment.downvotes}
				</button>
				{#if netVotes !== 0}
					<span class="text-xs {netVotes > 0 ? 'text-[var(--color-success-500)]' : 'text-[var(--color-error-400)]'}">{netVotes > 0 ? '+' : ''}{netVotes}</span>
				{/if}

				<!-- Like -->
				<button onclick={handleLike} disabled={liking}
					class="flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs transition-colors
					       {likeId ? 'text-[var(--color-error-400)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-error-400)] hover:bg-[var(--color-surface-800)]'}"
					aria-label={likeId ? 'Unlike' : 'Like'}>
					<svg width="12" height="12" viewBox="0 0 24 24" fill={likeId ? 'currentColor' : 'none'} stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
					</svg>
					{#if likeCount > 0}{likeCount}{/if}
				</button>

				{#if depth === 0}
					<button onclick={() => (showReply = !showReply)}
						class="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors">Reply</button>
				{/if}

				{#if (comment.replies?.length ?? 0) > 0 && depth === 0}
					<button onclick={() => (showReplies = !showReplies)}
						class="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors">
						{showReplies ? 'Hide' : 'Show'} {comment.replies!.length} {comment.replies!.length === 1 ? 'reply' : 'replies'}
					</button>
				{/if}

				<!-- Pin/Unpin - only for content owner, only on top-level comments -->
				{#if isContentOwner && depth === 0 && onPin && onUnpin}
					<button onclick={isPinned ? handleUnpin : handlePin} disabled={pinning}
						class="text-xs transition-colors
						       {isPinned ? 'text-[var(--color-accent-400)] hover:text-[var(--color-text-muted)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-accent-400)]'}">
						{isPinned ? '📌 Unpin' : 'Pin'}
					</button>
				{/if}

				{#if isOwner && !editing}
					<div class="flex items-center gap-2 ml-auto">
						<button onclick={() => { editing = true; editText = comment.text; }}
							class="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors">Edit</button>
						{#if !confirmDelete}
							<button onclick={() => (confirmDelete = true)}
								class="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-error-400)] transition-colors">Delete</button>
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
			<CommentInput placeholder="Write a reply…" compact={true}
				onPost={async (text) => { await onReply(comment.id, text); showReply = false; showReplies = true; }} />
		</div>
	{/if}

	{#if showReplies && comment.replies && depth === 0}
		{#each comment.replies as reply (reply.id)}
			<svelte:self comment={reply} {contentOwnerId} {contentTitle} {isContentOwner}
				isPinned={false} depth={1} {onReply} {onEdit} {onDelete} {onVote} />
		{/each}
	{/if}
</div>
