export type AIProvider = 'openai' | 'anthropic' | 'gemini' | 'groq';

export type AIOutputType = 'paragraph' | 'bullet_list' | 'table' | 'flashcards';

export interface AIGenerationRequest {
	provider: AIProvider;
	apiKey: string;
	prompt: string;
	referenceImage?: string;
	existingContent?: string;
	outputType: AIOutputType;
	flashcardCount?: number;
}

export interface AIFlashcard {
	front_text: string;
	back_text: string;
}

export interface AIGenerationResult {
	outputType: AIOutputType;
	data: Record<string, unknown>;
}
