export type OCRProvider = 'tesseract' | 'ai';

export interface OCRRequest {
	provider: OCRProvider;
	imageFile: File;
	aiProvider?: string;
	aiApiKey?: string;
}

export interface OCRResult {
	text: string;
	confidence?: number;
}

export interface OCRProgress {
	status: string;
	progress: number;
}
