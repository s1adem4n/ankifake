<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import AppHeader from '$lib/components/AppHeader.svelte';
	import CardEditor from '$lib/components/CardEditor.svelte';

	const lessonId = $derived(page.params.lessonId!);
	const cardId = $derived(page.params.cardId!);
	const back = $derived(resolve('/lesson/[lessonId]', { lessonId }));
</script>

<AppHeader title="Karte bearbeiten" {back} />
<CardEditor {lessonId} {cardId} onSaved={() => goto(back)} />
