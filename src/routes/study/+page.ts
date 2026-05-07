import { countCardsInLesson, listGrades, listLessons, listSubjects } from '$lib/db/queries';
import type { Grade, Lesson, Subject } from '$lib/db/types';

type LeafEntry = { lesson: Lesson; count: number };
type SubjectNode = { subject: Subject; lessons: LeafEntry[] };
type GradeNode = { grade: Grade; subjects: SubjectNode[] };

export const load = async () => {
	const grades = await listGrades();
	const tree: GradeNode[] = [];

	for (const grade of grades) {
		const subjects = await listSubjects(grade.id);
		const subjectEntries: SubjectNode[] = [];

		for (const subject of subjects) {
			const lessons = await listLessons(subject.id);
			const lessonEntries: LeafEntry[] = [];

			for (const lesson of lessons) {
				const count = await countCardsInLesson(lesson.id);
				if (count > 0) lessonEntries.push({ lesson, count });
			}

			if (lessonEntries.length) subjectEntries.push({ subject, lessons: lessonEntries });
		}

		if (subjectEntries.length) tree.push({ grade, subjects: subjectEntries });
	}

	return { tree };
};
