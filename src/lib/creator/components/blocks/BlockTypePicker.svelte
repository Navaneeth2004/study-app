<script lang="ts">
	import type { BlockType } from '$lib/creator/contentTypes';
	import { BLOCK_TYPE_LABELS } from '$lib/creator/contentTypes';

	interface Props {
		onSelect: (type: BlockType) => void;
	}

	let { onSelect }: Props = $props();

	let open = $state(false);
	let openUpward = $state(false);
	let wrapperEl: HTMLDivElement;

	const PICKER_HEIGHT = 380;

	const blockTypes: BlockType[] = [
		'title', 'subtitle', 'paragraph', 'bullet_list', 'table',
		'image', 'audio', 'divider', 'callout', 'video', 'quote'
	];

	$effect(() => {
		if (open && wrapperEl) {
			const rect = wrapperEl.getBoundingClientRect();
			openUpward = (window.innerHeight - rect.bottom) < PICKER_HEIGHT;
		}
	});

	function select(type: BlockType) {
		open = false;
		onSelect(type);
	}
</script>

<div class="relative" bind:this={wrapperEl}>
	<button
		onclick={() => (open = !open)}
		class="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed
		       border-[var(--color-surface-600)] px-4 py-3 text-sm text-[var(--color-text-muted)]
		       hover:border-[var(--color-accent-500)] hover:text-[var(--color-accent-400)] transition-colors"
	>
		<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
			<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
		</svg>
		Add Block
	</button>

	{#if open}
		<div class="fixed inset-0 z-10" role="button" tabindex="-1" aria-label="Close picker"
		     onclick={() => (open = false)} onkeydown={(e) => e.key === 'Escape' && (open = false)}></div>
		<div
			class="absolute left-0 z-20 w-full overflow-hidden rounded-xl border
			       border-[var(--color-surface-700)] bg-[var(--color-surface-800)] shadow-2xl"
			style={openUpward
				? 'position:absolute;bottom:100%;margin-bottom:0.5rem;top:auto;'
				: 'position:absolute;top:100%;margin-top:0.5rem;bottom:auto;'}
		>
			{#each blockTypes as type}
				<button onclick={() => select(type)}
					class="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm
					       text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-700)]
					       hover:text-[var(--color-text-primary)] transition-colors">
					{BLOCK_TYPE_LABELS[type]}
				</button>
			{/each}
		</div>
	{/if}
</div>
