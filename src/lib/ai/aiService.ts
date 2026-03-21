import type { AIGenerationRequest, AIGenerationResult } from './aiTypes';

function buildSystemPrompt(outputType: string, flashcardCount?: number): string {
	switch (outputType) {
		case 'paragraph':
			return 'Return ONLY a JSON object with this exact shape: { "html": string } containing a rich paragraph using <b> and <i> tags where appropriate. No markdown, no explanation, just the JSON.';
		case 'bullet_list':
			return 'Return ONLY a JSON object: { "items": string[] }';
		case 'table':
			return 'Return ONLY a JSON object: { "headers": string[], "rows": string[][] }';
		case 'flashcards':
			return `Return ONLY a JSON object: { "flashcards": Array<{ "front_text": string, "back_text": string }> } with exactly ${flashcardCount ?? 10} cards.`;
		default:
			throw new Error(`Unknown output type: ${outputType}`);
	}
}

function buildUserText(request: AIGenerationRequest): string {
	let text = request.prompt;
	if (request.existingContent) {
		text += `\n\nHere is existing content to rewrite or use as reference: ${request.existingContent}`;
	}
	return text;
}

function parseJson(text: string): Record<string, unknown> {
	const cleaned = text.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim();
	try {
		return JSON.parse(cleaned) as Record<string, unknown>;
	} catch {
		throw new Error('Failed to parse AI response as JSON.');
	}
}

function handleHttpError(status: number): never {
	if (status === 401) throw new Error('Invalid API key.');
	if (status === 429) throw new Error('Rate limit exceeded.');
	throw new Error(`API error (${status}).`);
}

async function callOpenAI(
	request: AIGenerationRequest,
	systemPrompt: string
): Promise<Record<string, unknown>> {
	const userContent: unknown[] = [];
	if (request.referenceImage) {
		userContent.push({
			type: 'image_url',
			image_url: { url: `data:image/jpeg;base64,${request.referenceImage}` }
		});
	}
	userContent.push({ type: 'text', text: buildUserText(request) });

	const res = await fetch('https://api.openai.com/v1/chat/completions', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${request.apiKey}`
		},
		body: JSON.stringify({
			model: 'gpt-4o',
			response_format: { type: 'json_object' },
			messages: [
				{ role: 'system', content: systemPrompt },
				{ role: 'user', content: userContent }
			]
		})
	});
	if (!res.ok) handleHttpError(res.status);
	const json = await res.json();
	return parseJson(json.choices[0].message.content as string);
}

async function callAnthropic(
	request: AIGenerationRequest,
	systemPrompt: string
): Promise<Record<string, unknown>> {
	const userContent: unknown[] = [];
	if (request.referenceImage) {
		userContent.push({
			type: 'image',
			source: { type: 'base64', media_type: 'image/jpeg', data: request.referenceImage }
		});
	}
	userContent.push({ type: 'text', text: buildUserText(request) });

	const res = await fetch('https://api.anthropic.com/v1/messages', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'x-api-key': request.apiKey,
			'anthropic-version': '2023-06-01',
			'anthropic-dangerous-direct-browser-access': 'true'
		},
		body: JSON.stringify({
			model: 'claude-3-5-sonnet-20241022',
			max_tokens: 4096,
			system: systemPrompt,
			messages: [{ role: 'user', content: userContent }]
		})
	});
	if (!res.ok) handleHttpError(res.status);
	const json = await res.json();
	return parseJson(json.content[0].text as string);
}

async function callGemini(
	request: AIGenerationRequest,
	systemPrompt: string
): Promise<Record<string, unknown>> {
	const fullText = `${systemPrompt}\n\n${buildUserText(request)}`;
	const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${request.apiKey}`;

	const res = await fetch(url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			contents: [{ parts: [{ text: fullText }] }],
			generationConfig: { responseMimeType: 'application/json' }
		})
	});
	if (!res.ok) handleHttpError(res.status);
	const json = await res.json();
	return parseJson(json.candidates[0].content.parts[0].text as string);
}

async function callGroq(
	request: AIGenerationRequest,
	systemPrompt: string
): Promise<Record<string, unknown>> {
	const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${request.apiKey}`
		},
		body: JSON.stringify({
			model: 'llama-3.3-70b-versatile',
			response_format: { type: 'json_object' },
			messages: [
				{ role: 'system', content: systemPrompt },
				{ role: 'user', content: buildUserText(request) }
			]
		})
	});
	if (!res.ok) handleHttpError(res.status);
	const json = await res.json();
	return parseJson(json.choices[0].message.content as string);
}

export async function generateContent(
	request: AIGenerationRequest
): Promise<AIGenerationResult> {
	const systemPrompt = buildSystemPrompt(request.outputType, request.flashcardCount);

	let data: Record<string, unknown>;
	switch (request.provider) {
		case 'openai':
			data = await callOpenAI(request, systemPrompt);
			break;
		case 'anthropic':
			data = await callAnthropic(request, systemPrompt);
			break;
		case 'gemini':
			data = await callGemini(request, systemPrompt);
			break;
		case 'groq':
			data = await callGroq(request, systemPrompt);
			break;
		default:
			throw new Error('Unknown provider.');
	}

	return { outputType: request.outputType, data };
}
