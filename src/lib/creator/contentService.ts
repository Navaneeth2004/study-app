import { pb } from '$lib/shared/pocketbase';
import { ClientResponseError } from 'pocketbase';
import type { RuntimeBlock, BlockType } from './contentTypes';
import { defaultBlockData } from './contentTypes';

function toBlock(r: Record<string, unknown>): RuntimeBlock {
	return {
		id: r.id as string,
		chapter: r.chapter as string,
		owner: r.owner as string,
		type: r.type as BlockType,
		order: r.order as number,
		data: r.data as Record<string, unknown>
	};
}

export async function listBlocks(chapterId: string): Promise<RuntimeBlock[]> {
	try {
		const records = await pb.collection('chapter_blocks').getFullList({
			filter: `chapter = "${chapterId}"`,
			sort: 'order'
		});
		return records.map(toBlock);
	} catch (e) {
		if (e instanceof ClientResponseError) throw new Error(e.message);
		throw e;
	}
}

export async function createBlock(
	chapterId: string,
	type: BlockType,
	order: number
): Promise<RuntimeBlock> {
	try {
		const r = await pb.collection('chapter_blocks').create({
			chapter: chapterId,
			owner: pb.authStore.record?.id,
			type,
			order,
			data: defaultBlockData(type)
		});
		return toBlock(r);
	} catch (e) {
		if (e instanceof ClientResponseError) throw new Error(e.message);
		throw e;
	}
}

export async function updateBlock(
	blockId: string,
	data: Record<string, unknown>
): Promise<void> {
	try {
		await pb.collection('chapter_blocks').update(blockId, { data });
	} catch (e) {
		if (e instanceof ClientResponseError) throw new Error(e.message);
		throw e;
	}
}

export async function deleteBlock(blockId: string): Promise<void> {
	try {
		await pb.collection('chapter_blocks').delete(blockId);
	} catch (e) {
		if (e instanceof ClientResponseError) throw new Error(e.message);
		throw e;
	}
}

export async function reorderBlocks(blocks: RuntimeBlock[]): Promise<void> {
	try {
		await Promise.all(
			blocks.map((block, index) =>
				pb.collection('chapter_blocks').update(block.id, { order: index + 1 })
			)
		);
	} catch (e) {
		if (e instanceof ClientResponseError) throw new Error(e.message);
		throw e;
	}
}

export async function uploadFile(
	file: File,
	blockId: string,
	fileType: 'image' | 'audio'
): Promise<string> {
	try {
		const fieldName = fileType === 'image' ? 'imageFile' : 'audioFile';
		const formData = new FormData();
		formData.append(fieldName, file);
		const r = await pb.collection('chapter_blocks').update(blockId, formData);
		const filename = Array.isArray(r[fieldName]) ? r[fieldName][0] : r[fieldName];
		return pb.files.getURL(r, filename as string);
	} catch (e) {
		if (e instanceof ClientResponseError) throw new Error(e.message);
		throw e;
	}
}