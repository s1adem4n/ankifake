import { redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { listCards } from '$lib/db/queries';
import { takePendingSession } from '$lib/study/session';

export const load = async () => {
	const config = takePendingSession();

	if (!config) {
		throw redirect(307, resolve('/study'));
	}

	const lists = await Promise.all(config.lessonIds.map((id) => listCards(id)));

	return {
		config,
		cards: lists.flat()
	};
};
