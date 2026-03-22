<script lang="ts">
	import { onMount } from 'svelte';

	interface Props {
		data: Map<string, number>;
	}
	let { data }: Props = $props();

	let scrollEl: HTMLDivElement;

	onMount(() => {
		// Scroll to the right so the most recent weeks are visible
		if (scrollEl) scrollEl.scrollLeft = scrollEl.scrollWidth;
	});

	const cells = $derived.by(() => {
		const today = new Date();
		const days: string[] = [];
		const cursor = new Date(today);
		cursor.setDate(cursor.getDate() - 363);
		const dow = (cursor.getDay() + 6) % 7;
		cursor.setDate(cursor.getDate() - dow);
		while (cursor <= today) {
			const y = cursor.getFullYear();
			const m = String(cursor.getMonth() + 1).padStart(2, '0');
			const d = String(cursor.getDate()).padStart(2, '0');
			days.push(`${y}-${m}-${d}`);
			cursor.setDate(cursor.getDate() + 1);
		}
		return days;
	});

	const weeks = $derived.by(() => {
		const ws: string[][] = [];
		for (let i = 0; i < cells.length; i += 7) ws.push(cells.slice(i, i + 7));
		return ws;
	});

	const todayStr = new Date().toISOString().slice(0, 10);

	function intensity(date: string): number { return data.get(date) ?? 0; }

	function cellColor(date: string): string {
		const v = intensity(date);
		if (date > todayStr) return 'var(--color-surface-800)';
		if (v === 0) return 'var(--color-surface-700)';
		if (v === 1) return 'color-mix(in srgb, var(--color-accent-500) 30%, transparent)';
		if (v === 2) return 'color-mix(in srgb, var(--color-accent-500) 50%, transparent)';
		if (v === 3) return 'color-mix(in srgb, var(--color-accent-500) 70%, transparent)';
		return 'var(--color-accent-500)';
	}

	function cellTitle(date: string): string {
		const v = intensity(date);
		const d = new Date(date + 'T00:00:00');
		const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
		return label + (v > 0 ? ` · intensity ${v}/4` : '');
	}

	const DAY_LABELS = ['Mon', '', 'Wed', '', 'Fri', '', ''];

	const monthLabels = $derived.by(() => {
		const labels: { label: string; colIndex: number }[] = [];
		let lastMonth = -1;
		weeks.forEach((week, wi) => {
			const m = parseInt(week[0].slice(5, 7));
			if (m !== lastMonth) {
				lastMonth = m;
				const d = new Date(week[0] + 'T00:00:00');
				labels.push({ label: d.toLocaleDateString('en-US', { month: 'short' }), colIndex: wi });
			}
		});
		return labels;
	});
</script>

<div class="overflow-x-auto" bind:this={scrollEl}>
	<div style="display:inline-flex;flex-direction:column;gap:4px;min-width:max-content;">
		<!-- Month labels -->
		<div style="display:flex;gap:3px;padding-left:28px;">
			{#each weeks as _week, wi}
				{@const ml = monthLabels.find(l => l.colIndex === wi)}
				<div style="width:11px;font-size:10px;color:var(--color-text-muted);overflow:visible;white-space:nowrap;">
					{ml?.label ?? ''}
				</div>
			{/each}
		</div>
		<!-- Rows -->
		{#each [0,1,2,3,4,5,6] as rowIndex}
			<div style="display:flex;align-items:center;gap:3px;">
				<div style="width:24px;font-size:10px;color:var(--color-text-muted);text-align:right;padding-right:4px;flex-shrink:0;">
					{DAY_LABELS[rowIndex]}
				</div>
				{#each weeks as week}
					{@const date = week[rowIndex] ?? ''}
					<div
						title={date ? cellTitle(date) : ''}
						style="width:11px;height:11px;border-radius:2px;flex-shrink:0;background:{date ? cellColor(date) : 'transparent'};"
					></div>
				{/each}
			</div>
		{/each}
		<!-- Legend -->
		<div style="display:flex;align-items:center;gap:6px;padding-left:28px;margin-top:4px;">
			<span style="font-size:10px;color:var(--color-text-muted);">Less</span>
			{#each [0,1,2,3,4] as v}
				<div style="width:11px;height:11px;border-radius:2px;flex-shrink:0;
				     background:{v===0?'var(--color-surface-700)':v===1?'color-mix(in srgb,var(--color-accent-500) 30%,transparent)':v===2?'color-mix(in srgb,var(--color-accent-500) 50%,transparent)':v===3?'color-mix(in srgb,var(--color-accent-500) 70%,transparent)':'var(--color-accent-500)'};"></div>
			{/each}
			<span style="font-size:10px;color:var(--color-text-muted);">More</span>
		</div>
	</div>
</div>
