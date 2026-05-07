<script lang="ts">
	import { renderMarkdown } from '$lib/markdown';

	interface Props {
		md: string;
		class?: string;
	}

	let { md, class: cls = '' }: Props = $props();
	let html = $state('');
	let cleanup: (() => void) | null = null;

	$effect(() => {
		const text = md;
		let cancelled = false;
		(async () => {
			const r = await renderMarkdown(text);
			if (cancelled) {
				r.dispose();
				return;
			}
			cleanup?.();
			cleanup = r.dispose;
			html = r.html;
		})();
		return () => {
			cancelled = true;
		};
	});

	$effect(() => () => cleanup?.());
</script>

<div class="markdown {cls}">{@html html}</div>
