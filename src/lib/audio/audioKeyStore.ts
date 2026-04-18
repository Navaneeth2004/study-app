import { pb } from '$lib/shared/pocketbase';
import type { TTSProvider } from './audioTypes';

const P = 'audio_';

function k(key: string): string {
	const uid = pb.authStore.record?.id ?? 'anon';
	return `${P}${uid}_${key}`;
}
function g(key: string, fallback = ''): string {
	if (typeof localStorage === 'undefined') return fallback;
	return localStorage.getItem(k(key)) ?? fallback;
}
function s(key: string, val: string): void {
	if (typeof localStorage !== 'undefined') localStorage.setItem(k(key), val);
}

export const getTTSProvider      = (): TTSProvider => (g('provider', 'browser') as TTSProvider);
export const setTTSProvider      = (v: TTSProvider) => s('provider', v);
export const getOpenAIVoice1     = () => g('oai_v1', 'alloy');
export const setOpenAIVoice1     = (v: string) => s('oai_v1', v);
export const getOpenAIVoice2     = () => g('oai_v2', 'nova');
export const setOpenAIVoice2     = (v: string) => s('oai_v2', v);
export const getElevenLabsKey    = () => g('el_key');
export const setElevenLabsKey    = (v: string) => s('el_key', v);
export const getElevenLabsVoice1 = () => g('el_v1', '');
export const setElevenLabsVoice1 = (v: string) => s('el_v1', v);
export const getElevenLabsVoice2 = () => g('el_v2', '');
export const setElevenLabsVoice2 = (v: string) => s('el_v2', v);
export const getBrowserVoice1Idx = (): number => parseInt(g('br_v1', '0')) || 0;
export const setBrowserVoice1Idx = (v: number) => s('br_v1', String(v));
export const getBrowserVoice2Idx = (): number => parseInt(g('br_v2', '1')) || 1;
export const setBrowserVoice2Idx = (v: number) => s('br_v2', String(v));
