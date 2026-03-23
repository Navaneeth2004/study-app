/** Remove HTML tags and decode common entities */
export function stripHtml(html: string): string {
	return html
		.replace(/<[^>]+>/g, '')
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&nbsp;/g, ' ')
		.replace(/&#39;/g, "'")
		.replace(/&quot;/g, '"')
		.trim();
}

/** Convert a File to a bare base64 string (no data URL prefix) */
export function fileToBase64(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => {
			const result = reader.result as string;
			// Strip "data:image/jpeg;base64," prefix
			const base64 = result.split(',')[1] ?? result;
			resolve(base64);
		};
		reader.onerror = () => reject(new Error('Failed to read file'));
		reader.readAsDataURL(file);
	});
}

/** Returns true if the file is a supported image type */
export function isImageFile(file: File): boolean {
	return file.type.startsWith('image/');
}

/** Human-readable confidence label */
export function formatConfidence(confidence: number): string {
	if (confidence >= 80) return `High confidence (${Math.round(confidence)}%)`;
	if (confidence >= 50) return `Medium confidence (${Math.round(confidence)}%)`;
	return `Low confidence (${Math.round(confidence)}%)`;
}

/** Confidence level for colour coding: 'high' | 'medium' | 'low' */
export function confidenceLevel(confidence: number): 'high' | 'medium' | 'low' {
	if (confidence >= 80) return 'high';
	if (confidence >= 50) return 'medium';
	return 'low';
}
