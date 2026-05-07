import { db } from '$lib/db/db';
import { countCardsInLesson, listLessons } from '$lib/db/queries';

export const load = async ({ params }) => {
	const { gradeId, subjectId } = params;
	const lessons = await listLessons(subjectId);
	const entries = await Promise.all(
		lessons.map(async (lesson) => [lesson.id, await countCardsInLesson(lesson.id)] as const)
	);

	return {
		gradeId,
		subjectId,
		subject: await db.subjects.get(subjectId),
		lessons,
		counts: Object.fromEntries(entries)
	};
};
