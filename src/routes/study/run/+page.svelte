<script lang="ts">
	import { resolve } from '$app/paths';
	import type { Card } from '$lib/db/types';
	import { setPendingSession, type StudyConfig } from '$lib/study/session';
	import { isCorrectAnswer } from '$lib/study/check';
	import AppHeader from '$lib/components/AppHeader.svelte';
	import Markdown from '$lib/components/Markdown.svelte';
	import CheckIcon from '~icons/lucide/check';
	import XIcon from '~icons/lucide/x';
	import EyeIcon from '~icons/lucide/eye';
	import ArrowRightIcon from '~icons/lucide/arrow-right';
	import RotateCwIcon from '~icons/lucide/rotate-cw';

	let { data }: { data: { config: StudyConfig; cards: Card[] } } = $props();

	function initialConfig() {
		return data.config;
	}

	function initialCards() {
		return data.cards;
	}

	let config = $state<StudyConfig>(initialConfig());
	let allCards = $state<Card[]>([]);
	let stack = $state<string[]>([]);
	let stats = $state({ firstTryCorrect: 0, attempts: 0, total: 0 });
	let seenIds = new Set<string>();
	let ready = $state(true);

	// per-card state
	let revealed = $state(false);
	let picked = $state<string | null>(null);
	let userInput = $state('');
	let feedback = $state<'correct' | 'wrong' | null>(null);
	let mcOptions = $state<string[]>([]);

	const current = $derived(allCards.find((c) => c.id === stack[0]));

	function shuffle<T>(arr: T[]): T[] {
		const a = [...arr];
		for (let i = a.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[a[i], a[j]] = [a[j], a[i]];
		}
		return a;
	}

	function bootstrap(cfg: StudyConfig, cards: Card[]) {
		allCards = cfg.shuffle ? shuffle(cards) : cards;
		stack = allCards.map((c) => c.id);
		stats = { firstTryCorrect: 0, attempts: 0, total: allCards.length };
		seenIds = new Set();
		ready = true;
	}

	bootstrap(config, initialCards());

	// reset per-card state when card changes; rebuild MC options
	$effect(() => {
		const id = current?.id;
		revealed = false;
		picked = null;
		userInput = '';
		feedback = null;
		if (!id || !current || config?.mode !== 'mc') {
			mcOptions = [];
			return;
		}
		const correct = current.back;
		const pool = Array.from(new Set(allCards.map((c) => c.back).filter((b) => b && b !== correct)));
		const picks: string[] = [];
		while (picks.length < 3 && picks.length < pool.length) {
			const idx = Math.floor(Math.random() * pool.length);
			const v = pool[idx];
			if (!picks.includes(v)) picks.push(v);
		}
		mcOptions = shuffle([correct, ...picks]);
	});

	function answer(correct: boolean) {
		stats.attempts++;
		const id = current?.id;
		const seenBefore = id ? seenIds.has(id) : true;
		if (id) seenIds.add(id);
		if (correct) {
			if (!seenBefore) stats.firstTryCorrect++;
			stack = stack.slice(1);
		} else {
			const [first, ...rest] = stack;
			stack = [...rest, first];
		}
	}

	function pickMC(opt: string) {
		if (picked) return;
		picked = opt;
		feedback = opt === current?.back ? 'correct' : 'wrong';
	}

	function submitType(e?: Event) {
		e?.preventDefault();
		if (feedback !== null || !current) return;
		const ok = isCorrectAnswer(userInput, current.back, !!config?.typeTolerant);
		feedback = ok ? 'correct' : 'wrong';
	}

	function next() {
		if (feedback === null) return;
		answer(feedback === 'correct');
	}

	function restart() {
		if (!config) return;
		setPendingSession(config);
		ready = false;
		stack = [];
		bootstrap(config, initialCards());
	}

	const done = $derived(ready && stack.length === 0);
	const completed = $derived(stats.total - stack.length);
	const progress = $derived(stats.total ? Math.round((completed / stats.total) * 100) : 0);
</script>

<AppHeader title={done ? 'Fertig!' : 'Test läuft'} back={resolve('/study')} />

{#if !ready}
	<div class="flex min-h-[40vh] items-center justify-center">
		<span class="loading loading-spinner"></span>
	</div>
{:else if done}
	<div class="flex flex-col items-center gap-6 p-6">
		<div class="text-center">
			<div class="text-5xl font-bold">{stats.firstTryCorrect}/{stats.total}</div>
			<div class="mt-1 text-sm opacity-70">
				beim ersten Versuch · {stats.attempts}
				{stats.attempts === 1 ? 'Versuch' : 'Versuche'} insgesamt
			</div>
		</div>
		<div class="flex w-full max-w-sm flex-col gap-2">
			<button class="btn btn-primary" onclick={restart}>
				<RotateCwIcon class="size-4" />Nochmal
			</button>
			<a class="btn btn-ghost" href={resolve('/study')}>Zur Auswahl</a>
		</div>
	</div>
{:else if current}
	<div class="px-4 pt-2">
		<div class="mb-1 flex items-center justify-between text-xs opacity-70">
			<span>{completed} / {stats.total}</span>
			<span>{stack.length} verbleibend</span>
		</div>
		<progress class="progress w-full progress-primary" value={progress} max="100"></progress>
	</div>

	{#key current.id}
		<div class="flex flex-col gap-4 p-4">
			<!-- Front -->
			<div class="rounded-box border border-base-300 bg-base-100 p-5">
				<div class="text-xs font-semibold tracking-wide uppercase opacity-60">Frage</div>
				<div class="mt-2 text-lg">
					<Markdown md={current.front} />
				</div>
			</div>

			{#if config?.mode === 'flip'}
				{#if !revealed}
					<button class="btn w-full btn-lg btn-primary" onclick={() => (revealed = true)}>
						<EyeIcon class="size-5" />Antwort zeigen
					</button>
				{:else}
					<div class="rounded-box border border-base-300 bg-base-100 p-5">
						<div class="text-xs font-semibold tracking-wide uppercase opacity-60">Antwort</div>
						<div class="mt-2 text-lg">
							<Markdown md={current.back} />
						</div>
					</div>
					<div class="grid grid-cols-2 gap-2">
						<button class="btn btn-lg btn-error" onclick={() => answer(false)}>
							<XIcon class="size-5" />Wusste nicht
						</button>
						<button class="btn btn-lg btn-success" onclick={() => answer(true)}>
							<CheckIcon class="size-5" />Wusste ich
						</button>
					</div>
				{/if}
			{:else if config?.mode === 'mc'}
				<div class="grid gap-2">
					{#each mcOptions as opt, i (opt)}
						{@const isCorrect = opt === current.back}
						{@const isPicked = picked === opt}
						<button
							class="btn justify-start text-left whitespace-normal"
							class:btn-success={picked && isCorrect}
							class:btn-error={picked && isPicked && !isCorrect}
							class:btn-disabled={!!picked && !isPicked && !isCorrect}
							disabled={picked !== null && !isPicked && !isCorrect}
							onclick={() => pickMC(opt)}
						>
							<span class="opacity-60">{i + 1}.</span>
							<span class="flex-1">{opt}</span>
							{#if picked && isCorrect}<CheckIcon class="size-4" />{/if}
							{#if picked && isPicked && !isCorrect}<XIcon class="size-4" />{/if}
						</button>
					{/each}
				</div>
				{#if feedback}
					<button class="btn w-full btn-lg btn-primary" onclick={next}>
						Weiter <ArrowRightIcon class="size-4" />
					</button>
				{/if}
			{:else if config?.mode === 'type'}
				<form onsubmit={submitType} class="flex flex-col gap-2">
					<input
						type="text"
						bind:value={userInput}
						disabled={feedback !== null}
						placeholder="Antwort eingeben"
						autocapitalize="off"
						autocomplete="off"
						autocorrect="off"
						spellcheck="false"
						class="input-bordered input input-lg w-full"
					/>
					{#if feedback === null}
						<button
							type="submit"
							class="btn w-full btn-lg btn-primary"
							disabled={!userInput.trim()}
						>
							Prüfen
						</button>
					{:else}
						<div
							class="rounded-box border p-3 text-sm"
							class:border-success={feedback === 'correct'}
							class:bg-success={feedback === 'correct'}
							class:text-success-content={feedback === 'correct'}
							class:border-error={feedback === 'wrong'}
							class:bg-error={feedback === 'wrong'}
							class:text-error-content={feedback === 'wrong'}
						>
							{#if feedback === 'correct'}
								<div class="font-semibold">Richtig!</div>
							{:else}
								<div class="font-semibold">Falsch</div>
								<div class="mt-1 opacity-90">Erwartet: {current.back}</div>
							{/if}
						</div>
						<button type="button" class="btn w-full btn-lg btn-primary" onclick={next}>
							Weiter <ArrowRightIcon class="size-4" />
						</button>
					{/if}
				</form>
			{/if}
		</div>
	{/key}
{/if}
