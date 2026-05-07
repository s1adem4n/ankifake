export interface Grade {
	id: string;
	name: string;
	order: number;
}

export interface Subject {
	id: string;
	gradeId: string;
	name: string;
	order: number;
}

export interface Lesson {
	id: string;
	subjectId: string;
	name: string;
	order: number;
}

export interface Card {
	id: string;
	lessonId: string;
	front: string;
	back: string;
	order: number;
	createdAt: number;
	updatedAt: number;
}

export interface Attachment {
	id: string;
	cardId: string;
	filename: string;
	mime: string;
	blob: Blob;
	createdAt: number;
}

export type AnyEntity = Grade | Subject | Lesson | Card | Attachment;
