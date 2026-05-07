import { listGrades } from '$lib/db/queries';

export const load = async () => {
	return {
		grades: await listGrades()
	};
};
