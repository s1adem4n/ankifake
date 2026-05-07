<script lang="ts">
	import { resolve } from '$app/paths';
	import { createGrade, deleteGrade, listGrades, renameGrade } from '$lib/db/queries';
	import type { Grade } from '$lib/db/types';
	import AppHeader from '$lib/components/AppHeader.svelte';
	import LibraryRow from '$lib/components/LibraryRow.svelte';
	import NameDialog from '$lib/components/NameDialog.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import PlusIcon from '~icons/lucide/plus';

	let { data }: { data: { grades: Grade[] } } = $props();

	function initialGrades() {
		return data.grades;
	}

	let grades = $state(initialGrades());

	type Dialog =
		| { kind: 'create' }
		| { kind: 'rename'; target: Grade }
		| { kind: 'delete'; target: Grade }
		| null;
	let dlg = $state<Dialog>(null);

	async function refresh() {
		grades = await listGrades();
	}

	async function onCreate(name: string) {
		await createGrade(name);
		dlg = null;
		await refresh();
	}

	async function onRename(name: string) {
		if (dlg?.kind !== 'rename') return;
		await renameGrade(dlg.target.id, name);
		dlg = null;
		await refresh();
	}

	async function onDelete() {
		if (dlg?.kind !== 'delete') return;
		await deleteGrade(dlg.target.id);
		dlg = null;
		await refresh();
	}
</script>

<AppHeader title="Klassenstufen">
	{#snippet actions()}
		<button
			class="btn btn-square btn-sm btn-primary"
			aria-label="Neue Klassenstufe"
			onclick={() => (dlg = { kind: 'create' })}
		>
			<PlusIcon class="size-4" />
		</button>
	{/snippet}
</AppHeader>

<ul class="list">
	{#each grades as g (g.id)}
		<LibraryRow
			name={g.name}
			href={resolve('/library/[gradeId]', { gradeId: g.id })}
			onRename={() => (dlg = { kind: 'rename', target: g })}
			onDelete={() => (dlg = { kind: 'delete', target: g })}
		/>
	{:else}
		<li class="p-8 text-center opacity-60">
			Noch keine Klassenstufen. Tippe auf <span class="font-semibold">+</span>.
		</li>
	{/each}
</ul>

<NameDialog
	open={dlg?.kind === 'create'}
	title="Neue Klassenstufe"
	label="Name"
	initial=""
	onConfirm={onCreate}
	onClose={() => (dlg = null)}
/>

<NameDialog
	open={dlg?.kind === 'rename'}
	title="Klassenstufe umbenennen"
	label="Name"
	initial={dlg?.kind === 'rename' ? dlg.target.name : ''}
	onConfirm={onRename}
	onClose={() => (dlg = null)}
/>

<ConfirmDialog
	open={dlg?.kind === 'delete'}
	title="Klassenstufe löschen?"
	message={dlg?.kind === 'delete'
		? `„${dlg.target.name}" und alle enthaltenen Fächer, Lektionen und Karten werden gelöscht.`
		: ''}
	confirmLabel="Löschen"
	onConfirm={onDelete}
	onClose={() => (dlg = null)}
/>
