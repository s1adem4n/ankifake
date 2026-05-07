<script lang="ts">
	import {
		clearAll,
		exportBackup,
		importBackup,
		type ImportMode,
		type ImportResult
	} from '$lib/backup';
	import AppHeader from '$lib/components/AppHeader.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import DownloadIcon from '~icons/lucide/download';
	import UploadIcon from '~icons/lucide/upload';
	import TrashIcon from '~icons/lucide/trash-2';

	let busy = $state(false);
	let lastResult = $state<ImportResult | null>(null);
	let lastError = $state<string | null>(null);
	let pendingFile = $state<File | null>(null);
	let pendingMode = $state<ImportMode>('merge');
	let confirmReset = $state(false);
	let importDialog = $state<HTMLDialogElement | undefined>();

	$effect(() => {
		if (!importDialog) return;
		if (pendingFile && !importDialog.open) importDialog.showModal();
		else if (!pendingFile && importDialog.open) importDialog.close();
	});

	async function doExport() {
		busy = true;
		lastError = null;
		try {
			await exportBackup();
		} catch (e) {
			lastError = e instanceof Error ? e.message : String(e);
		} finally {
			busy = false;
		}
	}

	async function pickImport(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (!file) return;
		pendingFile = file;
	}

	async function confirmImport() {
		if (!pendingFile) return;
		busy = true;
		lastError = null;
		lastResult = null;
		try {
			lastResult = await importBackup(pendingFile, pendingMode);
		} catch (e) {
			lastError = e instanceof Error ? e.message : String(e);
		} finally {
			pendingFile = null;
			busy = false;
		}
	}

	async function doReset() {
		busy = true;
		try {
			await clearAll();
			confirmReset = false;
			lastResult = null;
		} finally {
			busy = false;
		}
	}
</script>

<AppHeader title="Einstellungen" />

<div class="flex flex-col gap-6 p-4">
	<section>
		<h2 class="mb-2 text-sm font-semibold tracking-wide uppercase opacity-70">Backup</h2>

		<div class="flex flex-col gap-2">
			<button class="btn btn-outline" disabled={busy} onclick={doExport}>
				<DownloadIcon class="size-4" />
				Backup als ZIP exportieren
			</button>

			<label class="btn btn-outline">
				<UploadIcon class="size-4" />
				Backup importieren …
				<input
					type="file"
					accept=".zip,application/zip"
					class="hidden"
					disabled={busy}
					onchange={pickImport}
				/>
			</label>
		</div>

		{#if lastResult}
			<div class="mt-3 alert text-sm alert-success">
				Importiert: {lastResult.grades} Klassen, {lastResult.subjects} Fächer,
				{lastResult.lessons} Lektionen, {lastResult.cards} Karten,
				{lastResult.attachments} Anhänge.
			</div>
		{/if}
		{#if lastError}
			<div class="mt-3 alert text-sm alert-error">
				{lastError}
			</div>
		{/if}
	</section>

	<section>
		<h2 class="mb-2 text-sm font-semibold tracking-wide uppercase opacity-70">Daten</h2>
		<button class="btn btn-outline btn-error" disabled={busy} onclick={() => (confirmReset = true)}>
			<TrashIcon class="size-4" />
			Alle Daten löschen
		</button>
	</section>

	<section class="text-xs opacity-60">
		Alle Daten liegen lokal in deinem Browser. Verwende den Export, um sie zu sichern oder auf ein
		anderes Gerät zu übertragen.
	</section>
</div>

<!-- Import-Modus-Modal -->
<dialog
	bind:this={importDialog}
	class="modal modal-bottom sm:modal-middle"
	onclose={() => (pendingFile = null)}
>
	<div class="modal-box">
		<h3 class="text-lg font-semibold">Wie importieren?</h3>
		<p class="mt-1 text-sm opacity-80">
			Datei: <span class="font-mono">{pendingFile?.name}</span>
		</p>

		<div class="mt-4 flex flex-col gap-2">
			<label class="flex cursor-pointer items-start gap-3 rounded-lg bg-base-200 p-3">
				<input type="radio" class="radio mt-1 radio-sm" bind:group={pendingMode} value="merge" />
				<div>
					<div class="text-sm font-medium">Zusammenführen</div>
					<div class="text-xs opacity-70">
						Vorhandene Einträge mit gleicher ID werden überschrieben, andere bleiben erhalten.
					</div>
				</div>
			</label>
			<label class="flex cursor-pointer items-start gap-3 rounded-lg bg-base-200 p-3">
				<input type="radio" class="radio mt-1 radio-sm" bind:group={pendingMode} value="replace" />
				<div>
					<div class="text-sm font-medium">Ersetzen</div>
					<div class="text-xs opacity-70">
						Alle bestehenden Daten werden gelöscht und durch das Backup ersetzt.
					</div>
				</div>
			</label>
		</div>

		<div class="modal-action">
			<button class="btn btn-ghost" onclick={() => (pendingFile = null)}>Abbrechen</button>
			<button class="btn btn-primary" disabled={busy} onclick={confirmImport}> Importieren </button>
		</div>
	</div>
	<form method="dialog" class="modal-backdrop">
		<button onclick={() => (pendingFile = null)}>close</button>
	</form>
</dialog>

<ConfirmDialog
	open={confirmReset}
	title="Wirklich alles löschen?"
	message="Alle Klassen, Fächer, Lektionen, Karten und Anhänge werden unwiderruflich entfernt."
	confirmLabel="Alles löschen"
	onConfirm={doReset}
	onClose={() => (confirmReset = false)}
/>
