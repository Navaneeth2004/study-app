export type BookmarkContentType = 'textbook' | 'chapter' | 'flashcard' | 'flashcard_category';

export interface Bookmark {
	id: string;
	user: string;
	folder: string | null;
	contentType: BookmarkContentType;
	contentId: string;
	contentTitle: string;
	contentSubtitle: string;
	contentMeta: Record<string, string>; // e.g. { textbookId, categoryId }
	order: number;
	created: string;
}

export interface BookmarkFolder {
	id: string;
	user: string;
	name: string;
	order: number;
	created: string;
}

export interface CreateBookmarkData {
	contentType: BookmarkContentType;
	contentId: string;
	contentTitle: string;
	contentSubtitle?: string;
	contentMeta?: Record<string, string>;
	folderId?: string | null;
}

export interface GroupedBookmarks {
	folder: BookmarkFolder | null;
	bookmarks: Bookmark[];
}
