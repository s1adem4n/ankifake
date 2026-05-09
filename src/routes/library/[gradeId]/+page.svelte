<script lang="ts">
	import { resolve } from '$app/paths';
	import { db } from '$lib/db/db';
	import { createSubject, deleteSubject, listSubjects, renameSubject } from '$lib/db/queries';
	import { Subscription } from '$lib/db/subscription.svelte';
	import type { Grade, Subject } from '$lib/db/types';
	import AppHeader from '$lib/components/AppHeader.svelte';
	import LibraryRow from '$lib/components/LibraryRow.svelte';
	import NameDialog from '$lib/components/NameDialog.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import PlusIcon from '~icons/lucide/plus';

	let {
		data
	}: {
		data: { gradeId: string; grade: Grade | undefined; subjects: Subject[] };
	} = $props();
	const gradeId = $derived(data.gradeId);
	const model = new Subscription(
		() => {
			const id = gradeId;
			return async () => ({
				grade: await db.grades.get(id),
				subjects: await listSubjects(id)
			});
		},
		() => ({ grade: data.grade, subjects: data.subjects })
	);
	const grade = $derived(model.value.grade);
	const subjects = $derived(model.value.subjects);

	type Dialog =
		| { kind: 'create' }
		| { kind: 'rename'; target: Subject }
		| { kind: 'delete'; target: Subject }
		| null;
	let dlg = $state<Dialog>(null);

	async function onCreate(name: string) {
		await createSubject(gradeId, name);
		dlg = null;
	}

	async function onRename(name: string) {
		if (dlg?.kind !== 'rename') return;
		await renameSubject(dlg.target.id, name);
		dlg = null;
	}

	async function onDelete() {
		if (dlg?.kind !== 'delete') return;
		await deleteSubject(dlg.target.id);
		dlg = null;
	}
</script>

<AppHeader title={grade?.name ?? 'Klassenstufe'} back={resolve('/library')}>
	{#snippet actions()}
		<button
			class="btn btn-square btn-sm btn-primary"
			aria-label="Neues Fach"
			onclick={() => (dlg = { kind: 'create' })}
		>
			<PlusIcon class="size-4" />
		</button>
	{/snippet}
</AppHeader>

<ul class="list">
	{#each subjects as s (s.id)}
		<LibraryRow
			name={s.name}
			href={resolve('/library/[gradeId]/[subjectId]', { gradeId, subjectId: s.id })}
			onRename={() => (dlg = { kind: 'rename', target: s })}
			onDelete={() => (dlg = { kind: 'delete', target: s })}
		/>
	{:else}
		<li class="p-8 text-center opacity-60">Noch keine Fächer.</li>
	{/each}
</ul>

<NameDialog
	open={dlg?.kind === 'create'}
	title="Neues Fach"
	label="Name"
	initial=""
	onConfirm={onCreate}
	onClose={() => (dlg = null)}
/>

<NameDialog
	open={dlg?.kind === 'rename'}
	title="Fach umbenennen"
	label="Name"
	initial={dlg?.kind === 'rename' ? dlg.target.name : ''}
	onConfirm={onRename}
	onClose={() => (dlg = null)}
/>

<ConfirmDialog
	open={dlg?.kind === 'delete'}
	title="Fach löschen?"
	message={dlg?.kind === 'delete'
		? `„${dlg.target.name}" und alle enthaltenen Lektionen werden gelöscht.`
		: ''}
	onConfirm={onDelete}
	onClose={() => (dlg = null)}
/>
