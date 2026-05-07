<script lang="ts">
	interface Props {
		open: boolean;
		title: string;
		message?: string;
		confirmLabel?: string;
		danger?: boolean;
		onConfirm: () => void;
		onClose: () => void;
	}

	let {
		open,
		title,
		message = '',
		confirmLabel = 'Löschen',
		danger = true,
		onConfirm,
		onClose
	}: Props = $props();

	let dialog: HTMLDialogElement | undefined = $state();

	$effect(() => {
		if (!dialog) return;
		if (open && !dialog.open) dialog.showModal();
		else if (!open && dialog.open) dialog.close();
	});
</script>

<dialog bind:this={dialog} class="modal modal-bottom sm:modal-middle" onclose={onClose}>
	<div class="modal-box">
		<h3 class="text-lg font-semibold">{title}</h3>
		{#if message}
			<p class="mt-2 text-sm opacity-80">{message}</p>
		{/if}
		<div class="modal-action">
			<button type="button" class="btn btn-ghost" onclick={onClose}>Abbrechen</button>
			<button
				type="button"
				class="btn"
				class:btn-error={danger}
				class:btn-primary={!danger}
				onclick={onConfirm}
			>
				{confirmLabel}
			</button>
		</div>
	</div>
	<form method="dialog" class="modal-backdrop">
		<button onclick={onClose}>close</button>
	</form>
</dialog>
