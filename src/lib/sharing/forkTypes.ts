export interface ForkTextbookRequest {
	textbookId: string;
	newTitle: string;
}

export interface ForkCategoryRequest {
	categoryId: string;
	newTitle: string;
}

export interface ForkProgress {
	step: number;
	total: number;
	message: string;
}
