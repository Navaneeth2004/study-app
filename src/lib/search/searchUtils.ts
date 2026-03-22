/**
 * Pure utility — no PocketBase calls.
 * Extracts a 120-char snippet around the first occurrence of `query`.
 */
export function getExcerpt(text: string, query: string, maxLen = 120): string {
	if (!text || !query) return '';
	const lower = text.toLowerCase();
	const idx = lower.indexOf(query.toLowerCase());
	if (idx === -1) return text.slice(0, maxLen) + (text.length > maxLen ? '…' : '');
	const half = Math.floor(maxLen / 2);
	const start = Math.max(0, idx - half);
	const end = Math.min(text.length, start + maxLen);
	const snippet = text.slice(start, end);
	return (start > 0 ? '…' : '') + snippet + (end < text.length ? '…' : '');
}

/**
 * Extract plain text from block data object based on block type.
 */
export function blockToText(type: string, data: Record<string, unknown>): string {
	if (!data) return '';
	switch (type) {
		case 'title':
		case 'subtitle':
			return (data.text as string) ?? '';
		case 'paragraph':
			return ((data.html as string) ?? '').replace(/<[^>]+>/g, ' ').trim();
		case 'bullet_list':
			return ((data.items as string[]) ?? []).join(' ');
		case 'table': {
			const headers = ((data.headers as string[]) ?? []).join(' ');
			const rows = ((data.rows as string[][]) ?? []).flat().join(' ');
			return `${headers} ${rows}`.trim();
		}
		case 'callout':
			return (data.text as string) ?? '';
		default:
			return '';
	}
}
