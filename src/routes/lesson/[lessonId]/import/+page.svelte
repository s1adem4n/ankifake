<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import Papa from 'papaparse';
	import { bulkCreateCards } from '$lib/db/queries';
	import AppHeader from '$lib/components/AppHeader.svelte';
	import UploadIcon from '~icons/lucide/upload';

	const lessonId = $derived(page.params.lessonId!);
	const back = $derived(resolve('/lesson/[lessonId]', { lessonId }));

	let text = $state('');
	let importing = $state(false);

	function parseCsv(input: string) {
		const trimmed = input.trim();
		if (!trimmed) return { rows: [] as { front: string; back: string }[], skipped: 0 };
		const result = Papa.parse<string[]>(trimmed, { skipEmptyLines: true });
		const data = result.data ?? [];
		let startIdx = 0;
		const firstCell = (data[0]?.[0] ?? '').toLowerCase().trim();
		if (/^(front|vorderseite|frage|question|q)$/.test(firstCell)) startIdx = 1;
		const rows: { front: string; back: string }[] = [];
		let skipped = 0;
		for (let i = startIdx; i < data.length; i++) {
			const cols = data[i] ?? [];
			const front = (cols[0] ?? '').trim();
			const backVal = (cols[1] ?? '').trim();
			if (!front || !backVal) {
				skipped++;
				continue;
			}
			rows.push({ front, back: backVal });
		}
		return { rows, skipped };
	}

	const parsed = $derived(parseCsv(text));

	async function pickFile(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		text = await file.text();
		input.value = '';
	}

	async function doImport() {
		if (!parsed.rows.length) return;
		importing = true;
		try {
			await bulkCreateCards(lessonId, parsed.rows);
			goto(back);
		} finally {
			importing = false;
		}
	}
</script>

<AppHeader title="CSV importieren" {back} />

<div class="flex flex-col gap-4 p-4">
	<label class="form-control w-full">
		<span class="label-text mb-1 text-sm">CSV-Datei wählen</span>
		<input
			type="file"
			accept=".csv,text/csv,text/plain"
			class="file-input w-full"
			onchange={pickFile}
		/>
	</label>

	<div class="divider my-0">oder</div>

	<label class="form-control w-full">
		<span class="label-text mb-1 text-sm">Text einfügen</span>
		<textarea
			bind:value={text}
			class="textarea-bordered textarea min-h-[24vh] w-full font-mono text-xs leading-relaxed"
			placeholder={'front,back\nHund,dog\nKatze,cat'}
		></textarea>
	</label>

	{#if text.trim()}
		<div class="alert alert-soft py-2 text-sm">
			{parsed.rows.length}
			{parsed.rows.length === 1 ? 'Karte erkannt' : 'Karten erkannt'}{parsed.skipped > 0
				? `, ${parsed.skipped} übersprungen (leer)`
				: ''}.
		</div>

		{#if parsed.rows.length}
			<div class="overflow-x-auto rounded-box border border-base-300">
				<table class="table table-sm">
					<thead>
						<tr>
							<th>Vorderseite</th>
							<th>Rückseite</th>
						</tr>
					</thead>
					<tbody>
						{#each parsed.rows.slice(0, 10) as r, i (i)}
							<tr>
								<td class="max-w-[40vw] truncate">{r.front}</td>
								<td class="max-w-[40vw] truncate">{r.back}</td>
							</tr>
						{/each}
					</tbody>
				</table>
				{#if parsed.rows.length > 10}
					<div class="px-3 py-2 text-xs opacity-60">
						… und {parsed.rows.length - 10} weitere
					</div>
				{/if}
			</div>
		{/if}

		<button
			class="btn w-full btn-primary"
			disabled={!parsed.rows.length || importing}
			onclick={doImport}
		>
			<UploadIcon class="size-4" />
			{parsed.rows.length}
			{parsed.rows.length === 1 ? 'Karte' : 'Karten'} importieren
		</button>
	{/if}
</div>
