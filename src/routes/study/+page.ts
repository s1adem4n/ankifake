import { listStudyTree } from '$lib/db/queries';

export const load = async () => {
	return { tree: await listStudyTree() };
};
