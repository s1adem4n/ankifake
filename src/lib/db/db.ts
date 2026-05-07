import Dexie, { type Table } from 'dexie';
import type { Attachment, Card, Grade, Lesson, Subject } from './types';

export class CardsDB extends Dexie {
	grades!: Table<Grade, string>;
	subjects!: Table<Subject, string>;
	lessons!: Table<Lesson, string>;
	cards!: Table<Card, string>;
	attachments!: Table<Attachment, string>;

	constructor() {
		super('ankifake');
		this.version(1).stores({
			grades: 'id, order, name',
			subjects: 'id, gradeId, order, name',
			lessons: 'id, subjectId, order, name',
			cards: 'id, lessonId, order, createdAt',
			attachments: 'id, cardId, createdAt'
		});
	}
}

export const db = new CardsDB();

export const newId = () => crypto.randomUUID();
