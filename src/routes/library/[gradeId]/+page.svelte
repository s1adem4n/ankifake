<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { base } from '$app/paths';
	import { db } from '$lib/db/db';
	import { createSubject, deleteSubject, listSubjects, renameSubject } from '$lib/db/queries';
	import type { Grade, Subject } from '$lib/db/types';
	import AppHeader from '$lib/components/AppHeader.svelte';
	import LibraryRow from '$lib/components/LibraryRow.svelte';
	import NameDialog from '$lib/components/NameDialog.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import PlusIcon from '~icons/lucide/plus';

	const gradeId = $derived(page.params.gradeId!);
	let grade = $state<Grade | undefined>();
	let subjects = $state<Subject[]>([]);

	type Dialog =
		| { kind: 'create' }
		| { kind: 'rename'; target: Subject }
		| { kind: 'delete'; target: Subject }
		| null;
	let dlg = $state<Dialog>(null);

	async function refresh() {
		grade = await db.grades.get(gradeId);
		subjects = await listSubjects(gradeId);
	}

	onMount(refresh);

	async function onCreate(name: string) {
		await createSubject(gradeId, name);
		dlg = null;
		await refresh();
	}

	async function onRename(name: string) {
		if (dlg?.kind !== 'rename') return;
		await renameSubject(dlg.target.id, name);
		dlg = null;
		await refresh();
	}

	async function onDelete() {
		if (dlg?.kind !== 'delete') return;
		await deleteSubject(dlg.target.id);
		dlg = null;
		await refresh();
	}
</script>

<AppHeader title={grade?.name ?? 'Klassenstufe'} back="{base}/library">
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
			href={`/library/${gradeId}/${s.id}`}
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
