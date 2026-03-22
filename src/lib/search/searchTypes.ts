export interface SearchResultItem {
	type: 'textbook' | 'chapter' | 'block' | 'category' | 'flashcard';
	id: string;
	title: string;
	subtitle?: string;
	excerpt?: string;
	navigationPath: string;
}

export interface SearchResults {
	textbooks: SearchResultItem[];
	chapters: SearchResultItem[];
	blocks: SearchResultItem[];
	categories: SearchResultItem[];
	flashcards: SearchResultItem[];
}
