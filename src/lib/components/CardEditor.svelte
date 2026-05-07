<script lang="ts">
	import { newId } from '$lib/db/db';
	import { attachPending, createCard, getCard, updateCard } from '$lib/db/queries';
	import { renderMarkdown } from '$lib/markdown';
	import ImageIcon from '~icons/lucide/image';
	import CheckIcon from '~icons/lucide/check';

	interface Props {
		lessonId: string;
		cardId?: string;
		onSaved: () => void;
	}

	let { lessonId, cardId, onSaved }: Props = $props();

	type Tab = 'front' | 'back' | 'preview';
	let tab = $state<Tab>('front');
	let front = $state('');
	let back = $state('');
	let pending = $state<{ id: string; filename: string; mime: string; blob: Blob }[]>([]);
	let saving = $state(false);
	let frontEl = $state<HTMLTextAreaElement | undefined>();
	let backEl = $state<HTMLTextAreaElement | undefined>();
	let previewHtml = $state({ front: '', back: '' });

	$effect(() => {
		const id = cardId;
		(async () => {
			if (id) {
				const c = await getCard(id);
				if (c) {
					front = c.front;
					back = c.back;
				}
			} else {
				front = '';
				back = '';
			}
			pending = [];
		})();
	});

	$effect(() => {
		if (tab !== 'preview') return;
		// trigger when front/back/pending change
		const f = front;
		const b = back;
		const p = pending;
		let cancelled = false;
		let dispose: (() => void) | null = null;
		(async () => {
			const fr = await renderMarkdown(f, p);
			const br = await renderMarkdown(b, p);
			if (cancelled) {
				fr.dispose();
				br.dispose();
				return;
			}
			previewHtml = { front: fr.html, back: br.html };
			dispose = () => {
				fr.dispose();
				br.dispose();
			};
		})();
		return () => {
			cancelled = true;
			dispose?.();
		};
	});

	function activeTextarea(): HTMLTextAreaElement | undefined {
		return tab === 'back' ? backEl : frontEl;
	}

	function insertAtCursor(text: string) {
		const el = activeTextarea();
		const side = tab === 'back' ? 'back' : 'front';
		if (!el) {
			if (side === 'front') front += text;
			else back += text;
			return;
		}
		const start = el.selectionStart ?? el.value.length;
		const end = el.selectionEnd ?? el.value.length;
		const before = el.value.slice(0, start);
		const after = el.value.slice(end);
		const newVal = before + text + after;
		if (side === 'front') front = newVal;
		else back = newVal;
		const pos = start + text.length;
		requestAnimationFrame(() => {
			el.focus();
			el.setSelectionRange(pos, pos);
		});
	}

	function handleFile(file: File) {
		const id = newId();
		pending = [...pending, { id, filename: file.name, mime: file.type, blob: file }];
		const alt = file.name.replace(/[\[\]]/g, '');
		insertAtCursor(`\n![${alt}](attachment:${id})\n`);
	}

	function onPickFile(e: Event) {
		const input = e.target as HTMLInputElement;
		for (const f of Array.from(input.files ?? [])) handleFile(f);
		input.value = '';
	}

	function onPaste(e: ClipboardEvent) {
		const items = e.clipboardData?.items ?? [];
		for (const item of items) {
			if (item.type.startsWith('image/')) {
				const file = item.getAsFile();
				if (file) {
					e.preventDefault();
					handleFile(file);
				}
			}
		}
	}

	function onDrop(e: DragEvent) {
		const files = e.dataTransfer?.files;
		if (!files || !files.length) return;
		e.preventDefault();
		for (const f of Array.from(files)) {
			if (f.type.startsWith('image/')) handleFile(f);
		}
	}

	const canSave = $derived(!saving && (front.trim().length > 0 || back.trim().length > 0));

	export async function save() {
		if (!canSave) return;
		saving = true;
		try {
			if (cardId) {
				await updateCard(cardId, { front, back });
				await attachPending(cardId, pending);
			} else {
				const c = await createCard(lessonId, front, back);
				await attachPending(c.id, pending);
			}
			pending = [];
			onSaved();
		} finally {
			saving = false;
		}
	}
</script>

<div class="flex flex-col gap-3 p-3">
	<div role="tablist" class="tabs-box tabs w-full">
		<button
			role="tab"
			class="tab flex-1"
			class:tab-active={tab === 'front'}
			onclick={() => (tab = 'front')}
		>
			Vorderseite
		</button>
		<button
			role="tab"
			class="tab flex-1"
			class:tab-active={tab === 'back'}
			onclick={() => (tab = 'back')}
		>
			Rückseite
		</button>
		<button
			role="tab"
			class="tab flex-1"
			class:tab-active={tab === 'preview'}
			onclick={() => (tab = 'preview')}
		>
			Vorschau
		</button>
	</div>

	{#if tab === 'front'}
		<textarea
			bind:this={frontEl}
			bind:value={front}
			onpaste={onPaste}
			ondrop={onDrop}
			ondragover={(e) => e.preventDefault()}
			placeholder="Vorderseite (Markdown)"
			class="textarea-bordered textarea min-h-[40vh] w-full font-mono text-sm leading-relaxed"
		></textarea>
	{:else if tab === 'back'}
		<textarea
			bind:this={backEl}
			bind:value={back}
			onpaste={onPaste}
			ondrop={onDrop}
			ondragover={(e) => e.preventDefault()}
			placeholder="Rückseite (Markdown)"
			class="textarea-bordered textarea min-h-[40vh] w-full font-mono text-sm leading-relaxed"
		></textarea>
	{:else}
		<div class="rounded-box border border-base-300 bg-base-100 p-4">
			<div class="text-xs font-semibold tracking-wide uppercase opacity-60">Vorderseite</div>
			<div class="markdown mt-1">
				{@html previewHtml.front || '<em class="opacity-60">leer</em>'}
			</div>
			<div class="my-3 border-t border-base-300"></div>
			<div class="text-xs font-semibold tracking-wide uppercase opacity-60">Rückseite</div>
			<div class="markdown mt-1">
				{@html previewHtml.back || '<em class="opacity-60">leer</em>'}
			</div>
		</div>
	{/if}

	<div class="flex flex-wrap items-center gap-2">
		<label class="btn btn-outline btn-sm">
			<ImageIcon class="size-4" />
			Bild
			<input type="file" accept="image/*" multiple class="hidden" onchange={onPickFile} />
		</label>
		<span class="text-xs opacity-60">Markdown unterstützt. Bilder per Drop / Paste.</span>
	</div>

	<button class="btn mt-2 w-full btn-primary" disabled={!canSave} onclick={save}>
		<CheckIcon class="size-4" />
		{cardId ? 'Speichern' : 'Karte hinzufügen'}
	</button>
</div>
