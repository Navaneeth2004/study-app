export interface Textbook {
	id: string;
	title: string;
	description: string;
	owner: string;
	ownerName?: string;
	created: string;
	updated: string;
	chaptersCount?: number;
}

export interface Chapter {
	id: string;
	title: string;
	order: number;
	textbook: string;
	owner: string;
	created: string;
	updated: string;
}

export interface TextbookFormData {
	title: string;
	description: string;
}

export interface ChapterFormData {
	title: string;
}

export interface TextbookFormErrors {
	title?: string;
}

export interface ChapterFormErrors {
	title?: string;
}
