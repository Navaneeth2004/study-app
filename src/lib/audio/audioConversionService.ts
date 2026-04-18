import type { AudioScript, AudioTemplate } from './audioTypes';

const PROMPTS: Record<AudioTemplate, string> = {
	podcast: `You are converting educational text into a podcast script with TWO speakers.
Speaker "host" introduces topics and asks questions.
Speaker "guest" explains concepts with examples.
Return ONLY valid JSON: { "template": "podcast", "segments": [{"speaker": "host"|"guest", "text": "..."}] }
Aim for 8-16 natural-sounding segments.`,

	story: `Convert educational text into an engaging narrative story.
Add vivid descriptions and smooth transitions while keeping all key information.
Use a single narrator voice.
Return ONLY valid JSON: { "template": "story", "segments": [{"speaker": "narrator", "text": "..."}] }`,

	commentary: `Convert educational text into sharp, opinionated commentary.
Highlight the most important ideas. Be direct and punchy.
Return ONLY valid JSON: { "template": "commentary", "segments": [{"speaker": "narrator", "text": "..."}] }`,

	plain: `Clean educational text for smooth text-to-speech playback.
Remove HTML tags, markdown, bullet symbols. Fix awkward phrasing. Keep all information.
Return ONLY valid JSON: { "template": "plain", "segments": [{"speaker": "narrator", "text": "..."}] }`
};

export async function generateScript(
	chapterTitle: string,
	chapterText:  string,
	template:     AudioTemplate,
	aiProvider:   string,
	apiKey:       string
): Promise<AudioScript> {
	const system  = PROMPTS[template];
	const content = `Chapter: "${chapterTitle}"\n\n${chapterText.slice(0, 9000)}`;
	let text = '';

	if (aiProvider === 'openai') {
		const res = await fetch('https://api.openai.com/v1/chat/completions', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
			body: JSON.stringify({
				model: 'gpt-4o',
				response_format: { type: 'json_object' },
				messages: [{ role: 'system', content: system }, { role: 'user', content }]
			})
		});
		if (!res.ok) throw new Error(res.status === 401 ? 'Invalid OpenAI key.' : `OpenAI error (${res.status}).`);
		const j = await res.json();
		text = j.choices[0].message.content;

	} else if (aiProvider === 'anthropic') {
		const res = await fetch('https://api.anthropic.com/v1/messages', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-api-key': apiKey,
				'anthropic-version': '2023-06-01',
				'anthropic-dangerous-direct-browser-access': 'true'
			},
			body: JSON.stringify({
				model: 'claude-3-5-sonnet-20241022', max_tokens: 4096,
				system, messages: [{ role: 'user', content }]
			})
		});
		if (!res.ok) throw new Error(`Anthropic error (${res.status}).`);
		const j = await res.json();
		text = j.content[0].text;

	} else if (aiProvider === 'gemini') {
		const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
		const res = await fetch(url, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				contents: [{ parts: [{ text: `${system}\n\n${content}` }] }],
				generationConfig: { responseMimeType: 'application/json' }
			})
		});
		if (!res.ok) throw new Error(`Gemini error (${res.status}).`);
		const j = await res.json();
		text = j.candidates[0].content.parts[0].text;

	} else if (aiProvider === 'groq') {
		const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
			body: JSON.stringify({
				model: 'llama-3.3-70b-versatile',
				response_format: { type: 'json_object' },
				messages: [{ role: 'system', content: system }, { role: 'user', content }]
			})
		});
		if (!res.ok) throw new Error(`Groq error (${res.status}).`);
		const j = await res.json();
		text = j.choices[0].message.content;

	} else {
		throw new Error('No AI provider configured. Add an API key in Settings → AI Settings.');
	}

	const clean = text.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim();
	try { return JSON.parse(clean) as AudioScript; }
	catch { throw new Error('AI returned invalid JSON. Try again.'); }
}

// ── OpenAI TTS ────────────────────────────────────────────────────────────────
async function openaiTTS(text: string, voice: string, apiKey: string): Promise<ArrayBuffer> {
	const res = await fetch('https://api.openai.com/v1/audio/speech', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
		body: JSON.stringify({ model: 'tts-1', input: text, voice, response_format: 'mp3' })
	});
	if (!res.ok) throw new Error(`OpenAI TTS error (${res.status}).`);
	return await res.arrayBuffer();
}

// ── ElevenLabs TTS ────────────────────────────────────────────────────────────
async function elevenLabsTTS(text: string, voiceId: string, apiKey: string): Promise<ArrayBuffer> {
	if (!voiceId) throw new Error('ElevenLabs voice ID not configured in Settings → Audio.');
	const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', 'xi-api-key': apiKey },
		body: JSON.stringify({ text, model_id: 'eleven_monolingual_v1', voice_settings: { stability: 0.5, similarity_boost: 0.75 } })
	});
	if (!res.ok) throw new Error(`ElevenLabs error (${res.status}).`);
	return await res.arrayBuffer();
}

export interface TTSConfig {
	provider:         'openai' | 'elevenlabs';
	openaiKey:        string;
	openaiVoice1:     string;
	openaiVoice2:     string;
	elevenLabsKey:    string;
	elevenLabsVoice1: string;
	elevenLabsVoice2: string;
}

export async function synthesizeScript(
	script:      AudioScript,
	config:      TTSConfig,
	onProgress?: (pct: number) => void
): Promise<Blob> {
	const buffers: ArrayBuffer[] = [];
	const total = script.segments.length;
	for (let i = 0; i < total; i++) {
		const seg    = script.segments[i];
		const isAlt  = seg.speaker === 'guest';
		onProgress?.(Math.round((i / total) * 100));
		let buf: ArrayBuffer;
		if (config.provider === 'openai') {
			buf = await openaiTTS(seg.text, isAlt ? config.openaiVoice2 : config.openaiVoice1, config.openaiKey);
		} else {
			buf = await elevenLabsTTS(seg.text, isAlt ? config.elevenLabsVoice2 : config.elevenLabsVoice1, config.elevenLabsKey);
		}
		buffers.push(buf);
	}
	onProgress?.(100);
	return new Blob(buffers, { type: 'audio/mpeg' });
}

// ── Browser TTS ───────────────────────────────────────────────────────────────
export interface BrowserTTSHandle {
	stop:     () => void;
	isActive: () => boolean;
}

export function playBrowserTTS(
	script:           AudioScript,
	voice1Idx:        number,
	voice2Idx:        number,
	rate:             number = 1.0,
	startFrom:        number = 0,
	onSegmentChange?: (idx: number) => void,
	onEnd?:           () => void
): BrowserTTSHandle {
	const synth = window.speechSynthesis;
	synth.cancel();
	let active = true;
	let segIndex = startFrom;

	function speak() {
		if (!active || segIndex >= script.segments.length) {
			if (active) onEnd?.();
			active = false;
			return;
		}
		const seg    = script.segments[segIndex];
		const voices = synth.getVoices();
		const v1     = voices[voice1Idx] ?? voices[0];
		const v2     = voices[voice2Idx] ?? voices[1] ?? voices[0];
		const utt    = new SpeechSynthesisUtterance(seg.text);
		utt.rate  = rate;
		utt.voice = seg.speaker === 'guest' ? v2 : v1;
		onSegmentChange?.(segIndex);
		utt.onend   = () => { segIndex++; speak(); };
		utt.onerror = () => { segIndex++; speak(); };
		synth.speak(utt);
	}

	if (synth.getVoices().length === 0) {
		synth.addEventListener('voiceschanged', () => speak(), { once: true });
	} else {
		speak();
	}

	return {
		stop:     () => { active = false; synth.cancel(); },
		isActive: () => active && segIndex < script.segments.length
	};
}

export function getBrowserVoices(): SpeechSynthesisVoice[] {
	if (typeof window === 'undefined' || !window.speechSynthesis) return [];
	return window.speechSynthesis.getVoices();
}
