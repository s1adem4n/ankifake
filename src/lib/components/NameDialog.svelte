<script lang="ts">
	interface Props {
		open: boolean;
		title: string;
		label?: string;
		initial?: string;
		confirmLabel?: string;
		onConfirm: (name: string) => void;
		onClose: () => void;
	}

	let {
		open,
		title,
		label = 'Name',
		initial = '',
		confirmLabel = 'Speichern',
		onConfirm,
		onClose
	}: Props = $props();

	let dialog: HTMLDialogElement | undefined = $state();
	let value = $state('');

	$effect(() => {
		if (!dialog) return;
		if (open && !dialog.open) {
			value = initial;
			dialog.showModal();
		} else if (!open && dialog.open) {
			dialog.close();
		}
	});

	function submit(e: Event) {
		e.preventDefault();
		const trimmed = value.trim();
		if (!trimmed) return;
		onConfirm(trimmed);
	}
</script>

<dialog bind:this={dialog} class="modal modal-bottom sm:modal-middle" onclose={onClose}>
	<form method="dialog" class="modal-box" onsubmit={submit}>
		<h3 class="text-lg font-semibold">{title}</h3>
		<label class="form-control mt-3 w-full">
			<span class="label-text mb-1 text-sm">{label}</span>
			<input bind:value type="text" class="input-bordered input w-full" autocomplete="off" />
		</label>
		<div class="modal-action">
			<button type="button" class="btn btn-ghost" onclick={onClose}>Abbrechen</button>
			<button type="submit" class="btn btn-primary" disabled={!value.trim()}>
				{confirmLabel}
			</button>
		</div>
	</form>
	<form method="dialog" class="modal-backdrop">
		<button onclick={onClose}>close</button>
	</form>
</dialog>
