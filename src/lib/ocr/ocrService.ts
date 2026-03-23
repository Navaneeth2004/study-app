import type { OCRRequest, OCRResult, OCRProgress } from './ocrTypes';
import { fileToBase64, stripHtml } from './ocrUtils';

export async function extractText(
	request: OCRRequest,
	onProgress?: (progress: OCRProgress) => void
): Promise<OCRResult> {
	if (request.provider === 'tesseract') {
		return runTesseract(request.imageFile, onProgress);
	}
	return runAI(request, onProgress);
}

async function runTesseract(
	imageFile: File,
	onProgress?: (progress: OCRProgress) => void
): Promise<OCRResult> {
	const { createWorker } = await import('tesseract.js');
	const worker = await createWorker('eng', 1, {
		logger: (m: { status: string; progress: number }) => {
			onProgress?.({ status: m.status, progress: typeof m.progress === 'number' ? m.progress : 0 });
		}
	});
	try {
		const result = await worker.recognize(imageFile);
		return { text: result.data.text.trim(), confidence: result.data.confidence };
	} finally {
		await worker.terminate();
	}
}

async function runAI(
	request: OCRRequest,
	onProgress?: (progress: OCRProgress) => void
): Promise<OCRResult> {
	if (!request.aiProvider || !request.aiApiKey) throw new Error('AI provider and API key are required.');
	onProgress?.({ status: 'Analysing image…', progress: 0.3 });
	const base64 = await fileToBase64(request.imageFile);
	const { generateContent } = await import('$lib/ai/aiService');
	const result = await generateContent({
		provider: request.aiProvider as import('$lib/ai/aiTypes').AIProvider,
		apiKey: request.aiApiKey,
		outputType: 'paragraph',
		prompt: 'Extract all text from this image exactly as it appears. Preserve line breaks. Return only the extracted text with no explanation.',
		referenceImage: base64
	});
	onProgress?.({ status: 'Processing result…', progress: 0.9 });
	const raw = (result.data?.html as string) ?? '';
	return { text: stripHtml(raw) };
}
