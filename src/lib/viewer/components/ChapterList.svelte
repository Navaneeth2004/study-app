<script lang="ts">
	import type { Chapter } from '$lib/creator/creatorTypes';

	interface Props {
		chapters: Chapter[];
		textbookId: string;
	}

	let { chapters, textbookId }: Props = $props();
</script>

<div class="flex flex-col gap-2">
	{#each chapters as chapter}
		<a
			href="/viewer/textbooks/{textbookId}/chapters/{chapter.id}"
			class="app-card app-card-clickable flex-row items-center"
		>
			<span class="shrink-0 w-6 text-center text-xs font-mono text-[var(--color-text-muted)]">
				{chapter.order}
			</span>
			<span class="app-card-title flex-1">
				{chapter.title}
			</span>
			<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" class="shrink-0 text-[var(--color-text-muted)]">
				<polyline points="9 18 15 12 9 6"/>
			</svg>
		</a>
	{/each}
</div>
