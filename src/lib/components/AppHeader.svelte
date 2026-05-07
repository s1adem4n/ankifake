<script lang="ts">
	import { goto } from '$app/navigation';
	import ArrowLeftIcon from '~icons/lucide/arrow-left';
	import type { Snippet } from 'svelte';

	interface Props {
		title: string;
		back?: string | (() => void);
		actions?: Snippet;
	}

	let { title, back, actions }: Props = $props();

	function handleBack() {
		if (typeof back === 'function') back();
		else if (typeof back === 'string') goto(back);
		else history.back();
	}
</script>

<header
	class="sticky top-0 z-10 flex items-center gap-2 border-b border-base-300 bg-base-100 px-2 py-2"
	style="padding-top: calc(0.5rem + env(safe-area-inset-top));"
>
	{#if back !== undefined}
		<button class="btn btn-square btn-ghost btn-sm" onclick={handleBack} aria-label="Zurück">
			<ArrowLeftIcon class="size-5" />
		</button>

		<h1 class="flex-1 truncate text-lg font-semibold">{title}</h1>
	{:else}
		<h1 class="flex-1 truncate pl-2 text-lg font-semibold">{title}</h1>
	{/if}
	{#if actions}
		<div class="flex items-center gap-1">
			{@render actions()}
		</div>
	{/if}
</header>
