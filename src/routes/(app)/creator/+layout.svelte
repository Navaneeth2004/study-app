<script lang="ts">
	import { goto } from '$app/navigation';
	import { roleStore } from '$lib/shared/stores/roleStore';
	import { page } from '$app/stores';

	interface Props {
		children: import('svelte').Snippet;
	}

	let { children }: Props = $props();

	$effect(() => {
		if ($roleStore !== 'creator') {
			goto('/viewer');
		}
	});

	// Pages that render their own breadcrumbs (or need none) suppress the layout one
	const suppressBreadcrumb = $derived(
		$page.url.pathname === '/creator' ||
		$page.url.pathname === '/creator/flashcards' ||
		/\/creator\/textbooks\/[^/]+\/chapters\/[^/]+$/.test($page.url.pathname) ||
		/\/creator\/textbooks\/[^/]+\/chapters\/[^/]+\/flashcards/.test($page.url.pathname) ||
		/\/creator\/flashcards\/[^/]+/.test($page.url.pathname)
	);

	const breadcrumbs = $derived.by(() => {
		const path = $page.url.pathname;
		const crumbs: { label: string; href: string }[] = [{ label: 'Creator', href: '/creator' }];

		const textbooksMatch = path.match(/\/textbooks\/([^/]+)/);
		if (textbooksMatch) {
			if (path.includes('/textbooks/new')) {
				crumbs.push({ label: 'New Textbook', href: path });
			} else {
				crumbs.push({ label: 'Textbook', href: `/creator/textbooks/${textbooksMatch[1]}` });
			}
		}

		if (path.includes('/chapters/new')) {
			crumbs[crumbs.length - 1].href = path.replace('/chapters/new', '');
			crumbs.push({ label: 'New Chapter', href: path });
		}

		return crumbs;
	});
</script>

{#if $roleStore === 'creator'}
	<div class="flex flex-col gap-6">
		{#if !suppressBreadcrumb}
			<nav class="flex items-center gap-2 text-sm">
				{#each breadcrumbs as crumb, i}
					{#if i > 0}
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" class="text-[var(--color-text-muted)]">
							<polyline points="9 18 15 12 9 6"/>
						</svg>
					{/if}
					{#if i === breadcrumbs.length - 1}
						<span class="text-[var(--color-text-secondary)]">{crumb.label}</span>
					{:else}
						<a href={crumb.href} class="text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors">
							{crumb.label}
						</a>
					{/if}
				{/each}
			</nav>
		{/if}

		{@render children()}
	</div>
{/if}
