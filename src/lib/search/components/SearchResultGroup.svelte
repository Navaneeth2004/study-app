<script lang="ts">
	import { goto } from '$app/navigation';
	import type { SearchResultItem } from '$lib/search/searchTypes';

	interface Props {
		title: string;
		items: SearchResultItem[];
		emptyMessage?: string;
		maxItems?: number;
	}

	let { title, items, emptyMessage = '', maxItems }: Props = $props();

	const displayed = $derived(maxItems ? items.slice(0, maxItems) : items);

	const TYPE_LABELS: Record<string, string> = {
		textbook: 'Textbook', chapter: 'Chapter', block: 'Content',
		category: 'Deck', flashcard: 'Flashcard'
	};
</script>

{#if items.length > 0 || emptyMessage}
	<div class="flex flex-col gap-2">
		<h3 class="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
			{title} {#if items.length > 0}<span class="font-normal normal-case tracking-normal">({items.length})</span>{/if}
		</h3>

		{#if displayed.length === 0 && emptyMessage}
			<p class="text-sm text-[var(--color-text-muted)]">{emptyMessage}</p>
		{:else}
			<div class="flex flex-col gap-1.5">
				{#each displayed as item (item.id)}
					<button
						onclick={() => goto(item.navigationPath)}
						class="group flex items-start gap-3 rounded-xl border border-[var(--color-surface-700)]
						       bg-[var(--color-surface-900)] px-4 py-3 text-left transition-colors
						       hover:border-[var(--color-surface-600)] hover:bg-[var(--color-surface-800)]"
					>
						<!-- Type icon -->
						<div class="shrink-0 flex h-7 w-7 items-center justify-center rounded-lg mt-0.5"
						     style="background: color-mix(in srgb, var(--color-accent-500) 12%, transparent);">
							{#if item.type === 'textbook'}
								<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="color: var(--color-accent-400);">
									<path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
								</svg>
							{:else if item.type === 'chapter' || item.type === 'block'}
								<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="color: var(--color-accent-400);">
									<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
									<polyline points="14 2 14 8 20 8"/>
									<line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
								</svg>
							{:else if item.type === 'category'}
								<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="color: var(--color-accent-400);">
									<rect x="2" y="4" width="14" height="10" rx="2"/><rect x="8" y="10" width="14" height="10" rx="2"/>
								</svg>
							{:else}
								<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="color: var(--color-accent-400);">
									<rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
								</svg>
							{/if}
						</div>

						<div class="flex-1 min-w-0">
							<div class="flex items-baseline gap-2 flex-wrap">
								<span class="text-sm font-medium text-[var(--color-text-primary)] group-hover:text-[var(--color-accent-400)] transition-colors truncate">
									{item.title}
								</span>
								<span class="shrink-0 text-xs text-[var(--color-text-muted)]">
									{TYPE_LABELS[item.type] ?? item.type}
								</span>
							</div>
							{#if item.subtitle}
								<p class="text-xs text-[var(--color-text-muted)] truncate">{item.subtitle}</p>
							{/if}
							{#if item.excerpt}
								<p class="text-xs text-[var(--color-text-secondary)] mt-1 line-clamp-2 leading-relaxed">
									{item.excerpt}
								</p>
							{/if}
						</div>
					</button>
				{/each}
			</div>
		{/if}
	</div>
{/if}
