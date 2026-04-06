export interface BlockBase {
	id: string;
	chapter: string;
	owner: string;
	order: number;
}

export interface TitleBlock extends BlockBase {
	type: 'title';
	data: { text: string };
}

export interface SubtitleBlock extends BlockBase {
	type: 'subtitle';
	data: { text: string };
}

export interface ParagraphBlock extends BlockBase {
	type: 'paragraph';
	data: { html: string };
}

export interface BulletListBlock extends BlockBase {
	type: 'bullet_list';
	data: { items: string[] };
}

export interface TableBlock extends BlockBase {
	type: 'table';
	data: { headers: string[]; rows: string[][] };
}

export interface ImageBlock extends BlockBase {
	type: 'image';
	data: { url: string; caption: string };
}

export interface AudioBlock extends BlockBase {
	type: 'audio';
	data: { url: string; label: string };
}

export interface DividerBlock extends BlockBase {
	type: 'divider';
	data: Record<string, never>;
}

export interface CalloutBlock extends BlockBase {
	type: 'callout';
	data: { variant: 'info' | 'warning' | 'tip'; text: string };
}

export interface VideoBlock extends BlockBase {
	type: 'video';
	data: { url: string; description: string };
}

export interface QuoteBlock extends BlockBase {
	type: 'quote';
	data: { text: string; attribution: string };
}

export type BlockType =
	| 'title'
	| 'subtitle'
	| 'paragraph'
	| 'bullet_list'
	| 'table'
	| 'image'
	| 'audio'
	| 'divider'
	| 'callout'
	| 'video'
	| 'quote';

export type ChapterBlock =
	| TitleBlock
	| SubtitleBlock
	| ParagraphBlock
	| BulletListBlock
	| TableBlock
	| ImageBlock
	| AudioBlock
	| DividerBlock
	| CalloutBlock
	| VideoBlock
	| QuoteBlock;

export type BlockData = ChapterBlock['data'];

// Used in pages where block data is handled generically
export interface RuntimeBlock {
	id: string;
	chapter: string;
	owner: string;
	order: number;
	type: BlockType;
	data: Record<string, unknown>;
}

export const BLOCK_TYPE_LABELS: Record<BlockType, string> = {
	title: 'Title',
	subtitle: 'Subtitle',
	paragraph: 'Paragraph',
	bullet_list: 'Bullet List',
	table: 'Table',
	image: 'Image',
	audio: 'Audio',
	divider: 'Divider',
	callout: 'Callout',
	video: 'Video',
	quote: 'Quote'
};

export function defaultBlockData(type: BlockType): ChapterBlock['data'] {
	switch (type) {
		case 'title':
		case 'subtitle':
			return { text: '' };
		case 'paragraph':
			return { html: '' };
		case 'bullet_list':
			return { items: [''] };
		case 'table':
			return { headers: ['Column 1', 'Column 2'], rows: [['', '']] };
		case 'image':
			return { url: '', caption: '' };
		case 'audio':
			return { url: '', label: '' };
		case 'divider':
			return {};
		case 'callout':
			return { variant: 'info', text: '' };
		case 'video':
			return { url: '', description: '' };
		case 'quote':
			return { text: '', attribution: '' };
	}
}
