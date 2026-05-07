import { db } from '$lib/db/db';
import { listCards } from '$lib/db/queries';

export const load = async ({ params }) => {
	const lessonId = params.lessonId;
	const lesson = await db.lessons.get(lessonId);

	return {
		lessonId,
		lesson,
		subject: lesson ? await db.subjects.get(lesson.subjectId) : undefined,
		cards: await listCards(lessonId)
	};
};
