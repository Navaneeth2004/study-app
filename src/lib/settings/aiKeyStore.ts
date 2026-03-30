import type { AIProvider } from '$lib/ai/aiTypes';
import { pb } from '$lib/shared/pocketbase';

const KEY_PREFIX = 'ai_key_';
const ALL_PROVIDERS: AIProvider[] = ['openai', 'anthropic', 'gemini', 'groq'];

/** Returns a user-scoped storage key, e.g. "ai_key_USER123_openai" */
function storageKey(provider: AIProvider): string {
	const uid = pb.authStore.record?.id ?? 'anon';
	return `${KEY_PREFIX}${uid}_${provider}`;
}

export function getKey(provider: AIProvider): string {
	if (typeof localStorage === 'undefined') return '';
	return localStorage.getItem(storageKey(provider)) ?? '';
}

export function setKey(provider: AIProvider, key: string): void {
	localStorage.setItem(storageKey(provider), key);
}

export function clearKey(provider: AIProvider): void {
	localStorage.removeItem(storageKey(provider));
}

export function hasKey(provider: AIProvider): boolean {
	return !!getKey(provider);
}

export function getAvailableProviders(): AIProvider[] {
	return ALL_PROVIDERS.filter(hasKey);
}
