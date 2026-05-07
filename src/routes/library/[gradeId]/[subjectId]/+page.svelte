<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { base } from '$app/paths';
	import { db } from '$lib/db/db';
	import {
		countCardsInLesson,
		createLesson,
		deleteLesson,
		listLessons,
		renameLesson
	} from '$lib/db/queries';
	import type { Lesson, Subject } from '$lib/db/types';
	import AppHeader from '$lib/components/AppHeader.svelte';
	import LibraryRow from '$lib/components/LibraryRow.svelte';
	import NameDialog from '$lib/components/NameDialog.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import PlusIcon from '~icons/lucide/plus';

	const gradeId = $derived(page.params.gradeId!);
	const subjectId = $derived(page.params.subjectId!);
	let subject = $state<Subject | undefined>();
	let lessons = $state<Lesson[]>([]);
	let counts = $state<Record<string, number>>({});

	type Dialog =
		| { kind: 'create' }
		| { kind: 'rename'; target: Lesson }
		| { kind: 'delete'; target: Lesson }
		| null;
	let dlg = $state<Dialog>(null);

	async function refresh() {
		subject = await db.subjects.get(subjectId);
		lessons = await listLessons(subjectId);
		const entries = await Promise.all(
			lessons.map(async (l) => [l.id, await countCardsInLesson(l.id)] as const)
		);
		counts = Object.fromEntries(entries);
	}

	onMount(refresh);

	async function onCreate(name: string) {
		await createLesson(subjectId, name);
		dlg = null;
		await refresh();
	}

	async function onRename(name: string) {
		if (dlg?.kind !== 'rename') return;
		await renameLesson(dlg.target.id, name);
		dlg = null;
		await refresh();
	}

	async function onDelete() {
		if (dlg?.kind !== 'delete') return;
		await deleteLesson(dlg.target.id);
		dlg = null;
		await refresh();
	}
</script>

<AppHeader title={subject?.name ?? 'Fach'} back={`${base}/library/${gradeId}`}>
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
			href={`${base}/lesson/${l.id}`}
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
