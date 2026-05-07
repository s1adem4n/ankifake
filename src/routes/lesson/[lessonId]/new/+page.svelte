<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { base } from '$app/paths';
	import AppHeader from '$lib/components/AppHeader.svelte';
	import CardEditor from '$lib/components/CardEditor.svelte';

	const lessonId = $derived(page.params.lessonId!);
	const back = $derived(`${base}/lesson/${lessonId}`);
</script>

<AppHeader title="Neue Karte" {back} />
<CardEditor {lessonId} onSaved={() => goto(back)} />
