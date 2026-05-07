import { db } from '$lib/db/db';
import { listSubjects } from '$lib/db/queries';

export const load = async ({ params }) => {
	const gradeId = params.gradeId;

	return {
		gradeId,
		grade: await db.grades.get(gradeId),
		subjects: await listSubjects(gradeId)
	};
};
