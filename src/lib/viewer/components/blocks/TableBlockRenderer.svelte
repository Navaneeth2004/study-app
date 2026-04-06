<script lang="ts">
	import type { TableBlock } from '$lib/creator/contentTypes';
	interface Props { data: TableBlock['data'] }
	let { data }: Props = $props();
	const caption = $derived((data as Record<string, unknown>).caption as string ?? '');
</script>
<figure class="flex flex-col gap-2">
	<div class="overflow-x-auto rounded-xl border border-[var(--color-surface-700)]">
		<table class="w-full text-sm">
			<thead class="bg-[var(--color-surface-800)]">
				<tr>
					{#each data.headers as header}
						<th class="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] border-b border-[var(--color-surface-700)]">{header}</th>
					{/each}
				</tr>
			</thead>
			<tbody>
				{#each data.rows as row, i}
					<tr class={i % 2 === 0 ? '' : 'bg-[var(--color-surface-950)]/50'}>
						{#each row as cell}
							<td class="px-4 py-2.5 text-[var(--color-text-primary)] border-b border-[var(--color-surface-700)]/50">{cell}</td>
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
	{#if caption}
		<figcaption class="text-center text-xs text-[var(--color-text-muted)]">{caption}</figcaption>
	{/if}
</figure>
