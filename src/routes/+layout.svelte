<script lang="ts">
	import './layout.css';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import LibraryIcon from '~icons/lucide/library-big';
	import BrainIcon from '~icons/lucide/brain';
	import SettingsIcon from '~icons/lucide/settings';

	let { children } = $props();

	const navItems = [
		{ href: resolve('/study'), label: 'Lernen', icon: BrainIcon, match: /^\/study/ },
		{
			href: resolve('/library'),
			label: 'Bibliothek',
			icon: LibraryIcon,
			match: /^\/(library|lesson|$)/
		},
		{ href: resolve('/settings'), label: 'Mehr', icon: SettingsIcon, match: /^\/settings/ }
	];

	const currentPath = $derived(page.route.id ?? page.url.pathname);

	function isActive(re: RegExp) {
		if (currentPath === '/' && re.source.includes('library')) return true;
		return re.test(currentPath);
	}

	function resolvePath(path: `/${string}`) {
		return (resolve as (path: `/${string}`) => string)(path);
	}
</script>

<svelte:head>
	<link rel="icon" href={resolvePath('/icon.svg')} />
	<link rel="apple-touch-icon" href={resolvePath('/icons/icon-180.png')} />
</svelte:head>

<div class="flex min-h-svh flex-col bg-base-200 pb-[calc(4rem+env(safe-area-inset-bottom))]">
	<main class="flex-1">
		{@render children()}
	</main>

	<nav class="dock dock-sm border-t border-base-300 bg-base-100">
		{#each navItems as item (item.href)}
			{@const Icon = item.icon}
			{@const active = isActive(item.match)}
			<a href={item.href} class:dock-active={active} aria-current={active ? 'page' : undefined}>
				<Icon class="size-5" />
				<span class="dock-label">{item.label}</span>
			</a>
		{/each}
	</nav>
</div>
