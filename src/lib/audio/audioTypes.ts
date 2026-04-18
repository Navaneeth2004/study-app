export type AudioTemplate = 'podcast' | 'story' | 'commentary' | 'plain';
export type TTSProvider   = 'browser' | 'openai' | 'elevenlabs';

export interface AudioSegment {
	speaker: 'host' | 'guest' | 'narrator';
	text: string;
}

export interface AudioScript {
	template: AudioTemplate;
	segments: AudioSegment[];
}

export interface ChapterAudio {
	id: string;
	chapter: string;
	owner: string;
	template: AudioTemplate;
	title: string;
	script: AudioScript;
	audioUrl: string;
	duration: number;
	ttsProvider: TTSProvider;
	created: string;
}

export interface PlayerTrack {
	audio: ChapterAudio;
	chapterTitle: string;
	textbookTitle?: string;
}

export const TEMPLATE_META: Record<AudioTemplate, { label: string; emoji: string; desc: string }> = {
	podcast:    { label: 'Podcast',    emoji: '🎙️', desc: 'Two-speaker dialogue' },
	story:      { label: 'Story',      emoji: '📖', desc: 'Narrative with flair' },
	commentary: { label: 'Commentary', emoji: '💬', desc: 'Summarized insights'  },
	plain:      { label: 'Plain',      emoji: '🔊', desc: 'Clean reading'         }
};

export const OPENAI_VOICES = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'] as const;
export type OpenAIVoice = (typeof OPENAI_VOICES)[number];
