import { db, newId } from './db';
import type { Card, Grade, Lesson, Subject } from './types';

const now = () => Date.now();

async function nextOrder<T extends { order: number }>(items: Promise<T[]> | T[]): Promise<number> {
	const arr = await items;
	if (!arr.length) return 0;
	return Math.max(...arr.map((i) => i.order)) + 1;
}

// ---- Grades ----
export async function listGrades(): Promise<Grade[]> {
	return db.grades.orderBy('order').toArray();
}

export async function createGrade(name: string): Promise<Grade> {
	const order = await nextOrder(db.grades.toArray());
	const grade: Grade = { id: newId(), name: name.trim(), order };
	await db.grades.add(grade);
	return grade;
}

export async function renameGrade(id: string, name: string) {
	await db.grades.update(id, { name: name.trim() });
}

export async function deleteGrade(id: string) {
	await db.transaction(
		'rw',
		[db.grades, db.subjects, db.lessons, db.cards, db.attachments],
		async () => {
			const subjects = await db.subjects.where('gradeId').equals(id).toArray();
			for (const s of subjects) await deleteSubject(s.id);
			await db.grades.delete(id);
		}
	);
}

// ---- Subjects ----
export async function listSubjects(gradeId: string): Promise<Subject[]> {
	return db.subjects.where('gradeId').equals(gradeId).sortBy('order');
}

export async function createSubject(gradeId: string, name: string): Promise<Subject> {
	const order = await nextOrder(db.subjects.where('gradeId').equals(gradeId).toArray());
	const subject: Subject = { id: newId(), gradeId, name: name.trim(), order };
	await db.subjects.add(subject);
	return subject;
}

export async function renameSubject(id: string, name: string) {
	await db.subjects.update(id, { name: name.trim() });
}

export async function deleteSubject(id: string) {
	await db.transaction('rw', [db.subjects, db.lessons, db.cards, db.attachments], async () => {
		const lessons = await db.lessons.where('subjectId').equals(id).toArray();
		for (const l of lessons) await deleteLesson(l.id);
		await db.subjects.delete(id);
	});
}

// ---- Lessons ----
export async function listLessons(subjectId: string): Promise<Lesson[]> {
	return db.lessons.where('subjectId').equals(subjectId).sortBy('order');
}

export async function getLesson(id: string): Promise<Lesson | undefined> {
	return db.lessons.get(id);
}

export async function createLesson(subjectId: string, name: string): Promise<Lesson> {
	const order = await nextOrder(db.lessons.where('subjectId').equals(subjectId).toArray());
	const lesson: Lesson = { id: newId(), subjectId, name: name.trim(), order };
	await db.lessons.add(lesson);
	return lesson;
}

export async function renameLesson(id: string, name: string) {
	await db.lessons.update(id, { name: name.trim() });
}

export async function deleteLesson(id: string) {
	await db.transaction('rw', [db.lessons, db.cards, db.attachments], async () => {
		const cards = await db.cards.where('lessonId').equals(id).toArray();
		for (const c of cards) await deleteCard(c.id);
		await db.lessons.delete(id);
	});
}

// ---- Cards ----
export async function listCards(lessonId: string): Promise<Card[]> {
	return db.cards.where('lessonId').equals(lessonId).sortBy('order');
}

export async function getCard(id: string): Promise<Card | undefined> {
	return db.cards.get(id);
}

export async function createCard(lessonId: string, front: string, back: string): Promise<Card> {
	const order = await nextOrder(db.cards.where('lessonId').equals(lessonId).toArray());
	const ts = now();
	const card: Card = {
		id: newId(),
		lessonId,
		front,
		back,
		order,
		createdAt: ts,
		updatedAt: ts
	};
	await db.cards.add(card);
	return card;
}

export async function bulkCreateCards(
	lessonId: string,
	rows: { front: string; back: string }[]
): Promise<number> {
	const existing = await db.cards.where('lessonId').equals(lessonId).count();
	const ts = now();
	const cards: Card[] = rows.map((r, i) => ({
		id: newId(),
		lessonId,
		front: r.front,
		back: r.back,
		order: existing + i,
		createdAt: ts,
		updatedAt: ts
	}));
	await db.cards.bulkAdd(cards);
	return cards.length;
}

export async function updateCard(id: string, patch: Pick<Card, 'front' | 'back'>) {
	await db.cards.update(id, { ...patch, updatedAt: now() });
}

export async function deleteCard(id: string) {
	await db.transaction('rw', [db.cards, db.attachments], async () => {
		const atts = await db.attachments.where('cardId').equals(id).toArray();
		await db.attachments.bulkDelete(atts.map((a) => a.id));
		await db.cards.delete(id);
	});
}

// ---- Attachments ----
export async function addAttachment(
	cardId: string,
	file: { filename: string; mime: string; blob: Blob }
): Promise<string> {
	const id = newId();
	await db.attachments.add({
		id,
		cardId,
		filename: file.filename,
		mime: file.mime,
		blob: file.blob,
		createdAt: now()
	});
	return id;
}

export async function getAttachment(id: string) {
	return db.attachments.get(id);
}

// Used by editor: persist a batch of pending attachments after card is saved
export async function attachPending(
	cardId: string,
	pending: { id: string; filename: string; mime: string; blob: Blob }[]
) {
	if (!pending.length) return;
	const ts = now();
	await db.attachments.bulkAdd(
		pending.map((p) => ({
			id: p.id,
			cardId,
			filename: p.filename,
			mime: p.mime,
			blob: p.blob,
			createdAt: ts
		}))
	);
}

// ---- Aggregates / counts ----
export async function countCardsInLesson(lessonId: string): Promise<number> {
	return db.cards.where('lessonId').equals(lessonId).count();
}

export type StudyLessonEntry = { lesson: Lesson; count: number };
export type StudySubjectNode = { subject: Subject; lessons: StudyLessonEntry[] };
export type StudyGradeNode = { grade: Grade; subjects: StudySubjectNode[] };

export async function listStudyTree(): Promise<StudyGradeNode[]> {
	const grades = await listGrades();
	const tree: StudyGradeNode[] = [];

	for (const grade of grades) {
		const subjects = await listSubjects(grade.id);
		const subjectEntries: StudySubjectNode[] = [];

		for (const subject of subjects) {
			const lessons = await listLessons(subject.id);
			const lessonEntries: StudyLessonEntry[] = [];

			for (const lesson of lessons) {
				const count = await countCardsInLesson(lesson.id);
				if (count > 0) lessonEntries.push({ lesson, count });
			}

			if (lessonEntries.length) subjectEntries.push({ subject, lessons: lessonEntries });
		}

		if (subjectEntries.length) tree.push({ grade, subjects: subjectEntries });
	}

	return tree;
}
