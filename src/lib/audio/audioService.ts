import { pb } from '$lib/shared/pocketbase';
import { ClientResponseError } from 'pocketbase';
import type { ChapterAudio, AudioScript, AudioTemplate, TTSProvider } from './audioTypes';

function toAudio(r: Record<string, unknown>): ChapterAudio {
	let script: AudioScript = { template: 'plain', segments: [] };
	try {
		const raw = r.script;
		if (raw && typeof raw === 'object') script = raw as AudioScript;
		else if (typeof raw === 'string' && raw) script = JSON.parse(raw);
	} catch { /* ignore */ }
	return {
		id:          r.id as string,
		chapter:     r.chapter as string,
		owner:       r.owner as string,
		template:    r.template as AudioTemplate,
		title:       r.title as string,
		script,
		audioUrl:    r.audioFile
			? pb.files.getURL(r as Parameters<typeof pb.files.getURL>[0], r.audioFile as string)
			: '',
		duration:    (r.duration as number) ?? 0,
		ttsProvider: (r.ttsProvider as TTSProvider) ?? 'browser',
		created:     r.created as string
	};
}

export async function listChapterAudio(chapterId: string): Promise<ChapterAudio[]> {
	try {
		const records = await pb.collection('chapter_audio').getFullList({
			requestKey: null,
			filter: `chapter = "${chapterId}"`,
			sort: '-created'
		});
		return records.map(toAudio);
	} catch (e) {
		if (e instanceof ClientResponseError) throw new Error(e.message);
		throw e;
	}
}

export async function createChapterAudio(data: {
	chapterId:   string;
	template:    AudioTemplate;
	title:       string;
	script:      AudioScript;
	audioBlob?:  Blob;
	duration:    number;
	ttsProvider: TTSProvider;
}): Promise<ChapterAudio> {
	try {
		const fd = new FormData();
		fd.append('chapter',     data.chapterId);
		fd.append('owner',       pb.authStore.record?.id ?? '');
		fd.append('template',    data.template);
		fd.append('title',       data.title);
		fd.append('script',      JSON.stringify(data.script));
		fd.append('duration',    String(Math.round(data.duration)));
		fd.append('ttsProvider', data.ttsProvider);
		if (data.audioBlob) {
			fd.append('audioFile', new File([data.audioBlob], `audio_${Date.now()}.mp3`, { type: 'audio/mpeg' }));
		}
		const r = await pb.collection('chapter_audio').create(fd, { requestKey: null });
		return toAudio(r);
	} catch (e) {
		if (e instanceof ClientResponseError) throw new Error(e.message);
		throw e;
	}
}

export async function deleteChapterAudio(id: string): Promise<void> {
	try {
		await pb.collection('chapter_audio').delete(id, { requestKey: null });
	} catch (e) {
		if (e instanceof ClientResponseError) throw new Error(e.message);
		throw e;
	}
}
