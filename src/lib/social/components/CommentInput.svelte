<script lang="ts">
	interface Props {
		placeholder?: string;
		onPost: (text: string) => Promise<void>;
		compact?: boolean;
	}

	let { placeholder = 'Write a comment…', onPost, compact = false }: Props = $props();

	let text = $state('');
	let posting = $state(false);
	let error = $state('');

	async function handlePost() {
		if (!text.trim()) return;
		posting = true; error = '';
		try {
			await onPost(text.trim());
			text = '';
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not post.';
		} finally { posting = false; }
	}
</script>

<div class="flex flex-col gap-2">
	<textarea
		bind:value={text}
		{placeholder}
		rows={compact ? 2 : 3}
		class="w-full resize-none rounded-xl border border-[var(--color-surface-700)]
		       bg-[var(--color-surface-800)] px-3 py-2 text-sm text-[var(--color-text-primary)]
		       placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent-500)]
		       focus:outline-none transition-colors"
	></textarea>
	{#if error}<p class="text-xs text-[var(--color-error-400)]">{error}</p>{/if}
	<div class="flex items-center justify-end gap-2">
		<button
			onclick={handlePost}
			disabled={posting || !text.trim()}
			class="rounded-xl bg-[var(--color-accent-500)] px-4 py-1.5 text-sm font-medium
			       text-white hover:bg-[var(--color-accent-400)]
			       disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
		>
			{posting ? 'Posting…' : 'Post'}
		</button>
	</div>
</div>
