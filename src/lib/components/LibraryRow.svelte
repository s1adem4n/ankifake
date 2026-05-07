<script lang="ts">
	import ChevronRightIcon from '~icons/lucide/chevron-right';
	import MoreVerticalIcon from '~icons/lucide/more-vertical';
	import PencilIcon from '~icons/lucide/pencil';
	import TrashIcon from '~icons/lucide/trash-2';

	interface Props {
		name: string;
		href: string;
		meta?: string;
		onRename: () => void;
		onDelete: () => void;
	}

	let { name, href, meta, onRename, onDelete }: Props = $props();

	function blurActive() {
		(document.activeElement as HTMLElement | null)?.blur();
	}
</script>

<li class="flex items-center border-b border-base-300 bg-base-100 last:border-b-0">
	<a {href} class="flex min-w-0 flex-1 items-center gap-3 px-4 py-4">
		<div class="min-w-0 flex-1">
			<div class="truncate font-medium">{name}</div>
			{#if meta}
				<div class="mt-0.5 text-xs opacity-60">{meta}</div>
			{/if}
		</div>
		<ChevronRightIcon class="size-4 opacity-40" />
	</a>
	<div class="dropdown dropdown-end mr-2">
		<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
		<div tabindex="0" role="button" class="btn btn-square btn-ghost btn-sm" aria-label="Aktionen">
			<MoreVerticalIcon class="size-4" />
		</div>
		<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
		<ul tabindex="0" class="dropdown-content menu z-20 w-44 rounded-box bg-base-100 p-1 shadow-lg">
			<li>
				<button
					onclick={() => {
						blurActive();
						onRename();
					}}
				>
					<PencilIcon class="size-4" />Umbenennen
				</button>
			</li>
			<li>
				<button
					class="text-error"
					onclick={() => {
						blurActive();
						onDelete();
					}}
				>
					<TrashIcon class="size-4" />Löschen
				</button>
			</li>
		</ul>
	</div>
</li>
