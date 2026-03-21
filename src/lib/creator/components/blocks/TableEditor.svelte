<script lang="ts">
	import type { TableBlock } from '$lib/creator/contentTypes';

	interface Props {
		data: TableBlock['data'];
		onUpdate: (data: TableBlock['data']) => void;
	}

	let { data, onUpdate }: Props = $props();

	function updateHeader(colIndex: number, value: string) {
		const headers = [...data.headers];
		headers[colIndex] = value;
		onUpdate({ ...data, headers });
	}

	function updateCell(rowIndex: number, colIndex: number, value: string) {
		const rows = data.rows.map((r) => [...r]);
		rows[rowIndex][colIndex] = value;
		onUpdate({ ...data, rows });
	}

	function addColumn() {
		const headers = [...data.headers, `Column ${data.headers.length + 1}`];
		const rows = data.rows.map((r) => [...r, '']);
		onUpdate({ headers, rows });
	}

	function removeColumn(colIndex: number) {
		if (data.headers.length <= 1) return;
		const headers = data.headers.filter((_, i) => i !== colIndex);
		const rows = data.rows.map((r) => r.filter((_, i) => i !== colIndex));
		onUpdate({ headers, rows });
	}

	function addRow() {
		const rows = [...data.rows, data.headers.map(() => '')];
		onUpdate({ ...data, rows });
	}

	function removeRow(rowIndex: number) {
		if (data.rows.length <= 1) return;
		const rows = data.rows.filter((_, i) => i !== rowIndex);
		onUpdate({ ...data, rows });
	}
</script>

<div class="flex flex-col gap-3 overflow-x-auto">
	<table class="w-full text-sm border-collapse">
		<thead>
			<tr>
				{#each data.headers as header, colIndex}
					<th class="p-0">
						<div class="group relative flex items-center gap-1 border-b border-[var(--color-surface-600)] pb-1">
							<input
								type="text"
								value={header}
								oninput={(e) => updateHeader(colIndex, (e.target as HTMLInputElement).value)}
								class="flex-1 bg-transparent text-xs font-semibold uppercase tracking-wider
								       text-[var(--color-text-secondary)] focus:outline-none min-w-16 px-1"
							/>
							{#if data.headers.length > 1}
								<button
									onclick={() => removeColumn(colIndex)}
									aria-label="Remove column"
									class="opacity-0 group-hover:opacity-100 text-[var(--color-text-muted)]
									       hover:text-[var(--color-error-400)] transition-all"
								>
									<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
										<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
									</svg>
								</button>
							{/if}
						</div>
					</th>
				{/each}
				<th class="w-8 pb-1">
					<button
						onclick={addColumn}
						aria-label="Add column"
						class="text-[var(--color-text-muted)] hover:text-[var(--color-accent-400)] transition-colors"
					>
						<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
							<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
						</svg>
					</button>
				</th>
			</tr>
		</thead>
		<tbody>
			{#each data.rows as row, rowIndex}
				<tr class="group">
					{#each row as cell, colIndex}
						<td class="p-0 py-1 pr-2">
							<input
								type="text"
								value={cell}
								oninput={(e) => updateCell(rowIndex, colIndex, (e.target as HTMLInputElement).value)}
								placeholder="—"
								class="w-full bg-transparent text-sm text-[var(--color-text-primary)]
								       placeholder:text-[var(--color-surface-600)] focus:outline-none px-1 min-w-16"
							/>
						</td>
					{/each}
					<td class="w-8 py-1">
						{#if data.rows.length > 1}
							<button
								onclick={() => removeRow(rowIndex)}
								aria-label="Remove row"
								class="opacity-0 group-hover:opacity-100 text-[var(--color-text-muted)]
								       hover:text-[var(--color-error-400)] transition-all"
							>
								<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
									<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
								</svg>
							</button>
						{/if}
					</td>
				</tr>
			{/each}
		</tbody>
	</table>

	<button
		onclick={addRow}
		class="self-start text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]
		       transition-colors"
	>
		+ Add row
	</button>
</div>