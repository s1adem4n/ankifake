<script lang="ts">
	import { resolve } from '$app/paths';
	import { db } from '$lib/db/db';
	import {
		countCardsInLesson,
		createLesson,
		deleteLesson,
		listLessons,
		renameLesson
	} from '$lib/db/queries';
	import { Subscription } from '$lib/db/subscription.svelte';
	import type { Lesson, Subject } from '$lib/db/types';
	import AppHeader from '$lib/components/AppHeader.svelte';
	import LibraryRow from '$lib/components/LibraryRow.svelte';
	import NameDialog from '$lib/components/NameDialog.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import PlusIcon from '~icons/lucide/plus';

	let {
		data
	}: {
		data: {
			gradeId: string;
			subjectId: string;
			subject: Subject | undefined;
			lessons: Lesson[];
			counts: Record<string, number>;
		};
	} = $props();
	const gradeId = $derived(data.gradeId);
	const subjectId = $derived(data.subjectId);
	const model = new Subscription(
		() => {
			const id = subjectId;
			return async () => {
				const lessons = await listLessons(id);
				const entries = await Promise.all(
					lessons.map(async (lesson) => [lesson.id, await countCardsInLesson(lesson.id)] as const)
				);

				return {
					subject: await db.subjects.get(id),
					lessons,
					counts: Object.fromEntries(entries)
				};
			};
		},
		() => ({ subject: data.subject, lessons: data.lessons, counts: data.counts })
	);
	const subject = $derived(model.value.subject);
	const lessons = $derived(model.value.lessons);
	const counts = $derived(model.value.counts);

	type Dialog =
		| { kind: 'create' }
		| { kind: 'rename'; target: Lesson }
		| { kind: 'delete'; target: Lesson }
		| null;
	let dlg = $state<Dialog>(null);

	async function onCreate(name: string) {
		await createLesson(subjectId, name);
		dlg = null;
	}

	async function onRename(name: string) {
		if (dlg?.kind !== 'rename') return;
		await renameLesson(dlg.target.id, name);
		dlg = null;
	}

	async function onDelete() {
		if (dlg?.kind !== 'delete') return;
		await deleteLesson(dlg.target.id);
		dlg = null;
	}
</script>

<AppHeader title={subject?.name ?? 'Fach'} back={resolve('/library/[gradeId]', { gradeId })}>
	{#snippet actions()}
		<button
			class="btn btn-square btn-sm btn-primary"
			aria-label="Neue Lektion"
			onclick={() => (dlg = { kind: 'create' })}
		>
			<PlusIcon class="size-4" />
		</button>
	{/snippet}
</AppHeader>

<ul class="list">
	{#each lessons as l (l.id)}
		{@const n = counts[l.id] ?? 0}
		<LibraryRow
			name={l.name}
			href={resolve('/lesson/[lessonId]', { lessonId: l.id })}
			meta={`${n} ${n === 1 ? 'Karte' : 'Karten'}`}
			onRename={() => (dlg = { kind: 'rename', target: l })}
			onDelete={() => (dlg = { kind: 'delete', target: l })}
		/>
	{:else}
		<li class="p-8 text-center opacity-60">Noch keine Lektionen.</li>
	{/each}
</ul>

<NameDialog
	open={dlg?.kind === 'create'}
	title="Neue Lektion"
	label="Name"
	initial=""
	onConfirm={onCreate}
	onClose={() => (dlg = null)}
/>

<NameDialog
	open={dlg?.kind === 'rename'}
	title="Lektion umbenennen"
	label="Name"
	initial={dlg?.kind === 'rename' ? dlg.target.name : ''}
	onConfirm={onRename}
	onClose={() => (dlg = null)}
/>

<ConfirmDialog
	open={dlg?.kind === 'delete'}
	title="Lektion löschen?"
	message={dlg?.kind === 'delete' ? `„${dlg.target.name}" und alle Karten werden gelöscht.` : ''}
	onConfirm={onDelete}
	onClose={() => (dlg = null)}
/>
