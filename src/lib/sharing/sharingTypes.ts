export interface SharedTextbook {
	id: string;
	title: string;
	description: string;
	shareTitle: string;
	shareDescription: string;
	owner: string;
	ownerName: string;
	created: string;
}

export interface SharedCategory {
	id: string;
	name: string;
	shareTitle: string;
	shareDescription: string;
	owner: string;
	ownerName: string;
	created: string;
}

export interface Install {
	id: string;
	user: string;
	contentType: 'textbook' | 'flashcard_category';
	contentId: string;
	installedAt: string;
}

export interface ShareForm {
	title: string;
	description: string;
}
