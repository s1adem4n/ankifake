<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import { countCardsInLesson, listGrades, listLessons, listSubjects } from '$lib/db/queries';
	import type { Grade, Lesson, Subject } from '$lib/db/types';
	import { setPendingSession, type StudyMode } from '$lib/study/session';
	import AppHeader from '$lib/components/AppHeader.svelte';
	import PlayIcon from '~icons/lucide/play';
	import RotateIcon from '~icons/lucide/rotate-3d';
	import ListIcon from '~icons/lucide/list-checks';
	import KeyboardIcon from '~icons/lucide/keyboard';
	import ChevronRightIcon from '~icons/lucide/chevron-right';
	import ChevronDownIcon from '~icons/lucide/chevron-down';

	type LeafEntry = { lesson: Lesson; count: number };
	type SubjectNode = { subject: Subject; lessons: LeafEntry[] };
	type GradeNode = { grade: Grade; subjects: SubjectNode[] };

	let tree = $state<GradeNode[]>([]);
	let selected = $state<Set<string>>(new Set());
	let expanded = $state<Set<string>>(new Set());
	let mode = $state<StudyMode>('flip');
	let typeTolerant = $state(true);
	let loaded = $state(false);

	async function load() {
		const grades = await listGrades();
		const result: GradeNode[] = [];
		for (const g of grades) {
			const subjects = await listSubjects(g.id);
			const subjEntries: SubjectNode[] = [];
			for (const s of subjects) {
				const lessons = await listLessons(s.id);
				const lEntries: LeafEntry[] = [];
				for (const l of lessons) {
					const count = await countCardsInLesson(l.id);
					if (count === 0) continue;
					lEntries.push({ lesson: l, count });
				}
				if (lEntries.length) subjEntries.push({ subject: s, lessons: lEntries });
			}
			if (subjEntries.length) result.push({ grade: g, subjects: subjEntries });
		}
		tree = result;
		loaded = true;
	}

	onMount(load);

	function isExpanded(id: string) {
		return expanded.has(id);
	}

	function toggleExpand(id: string) {
		const next = new Set(expanded);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		expanded = next;
	}

	function toggleLeaf(id: string) {
		const next = new Set(selected);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		selected = next;
	}

	function gradeStats(g: GradeNode) {
		let total = 0;
		let lessonsTotal = 0;
		let lessonsSelected = 0;
		for (const s of g.subjects) {
			for (const l of s.lessons) {
				total += l.count;
				lessonsTotal++;
				if (selected.has(l.lesson.id)) lessonsSelected++;
			}
		}
		return { cards: total, lessonsTotal, lessonsSelected };
	}

	function subjectStats(s: SubjectNode) {
		let total = 0;
		let lessonsSelected = 0;
		for (const l of s.lessons) {
			total += l.count;
			if (selected.has(l.lesson.id)) lessonsSelected++;
		}
		return { cards: total, lessonsTotal: s.lessons.length, lessonsSelected };
	}

	const totalSelectedCards = $derived.by(() => {
		let sum = 0;
		for (const g of tree) {
			for (const s of g.subjects) {
				for (const l of s.lessons) {
					if (selected.has(l.lesson.id)) sum += l.count;
				}
			}
		}
		return sum;
	});

	function clearSelection() {
		selected = new Set();
	}

	function start() {
		if (!selected.size) return;
		setPendingSession({
			lessonIds: [...selected],
			mode,
			shuffle: true,
			typeTolerant
		});
		goto(`${base}/study/run`);
	}

	const modes: { id: StudyMode; label: string; desc: string; icon: typeof PlayIcon }[] = [
		{ id: 'flip', label: 'Karte umdrehen', desc: 'Selbst einschätzen', icon: RotateIcon },
		{ id: 'mc', label: 'Multiple Choice', desc: '4 Optionen', icon: ListIcon },
		{ id: 'type', label: 'Eintippen', desc: 'Antwort tippen', icon: KeyboardIcon }
	];
</script>

<AppHeader title="Lernen" />

<div class="flex flex-col gap-5 p-4">
	<section>
		<div class="mb-2 flex items-center justify-between">
			<h2 class="text-sm font-semibold tracking-wide uppercase opacity-70">Lektionen</h2>
			{#if selected.size > 0}
				<button class="btn btn-ghost btn-xs" onclick={clearSelection}>
					Auswahl löschen ({selected.size})
				</button>
			{/if}
		</div>

		{#if !loaded}
			<div class="flex justify-center p-6"><span class="loading loading-spinner"></span></div>
		{:else if tree.length === 0}
			<div
				class="rounded-box border border-base-300 bg-base-100 p-6 text-center text-sm opacity-70"
			>
				Noch keine Lektion mit Karten vorhanden.
				<br />
				<a class="link" href="{base}/library">Zur Bibliothek</a>
			</div>
		{:else}
			<ul
				class="rounded-box divide-y divide-base-300 overflow-hidden border border-base-300 bg-base-100"
			>
				{#each tree as g (g.grade.id)}
					{@const gStats = gradeStats(g)}
					{@const gOpen = isExpanded(g.grade.id)}
					<li>
						<button
							class="flex w-full items-center gap-2 px-3 py-3 text-left"
							onclick={() => toggleExpand(g.grade.id)}
							aria-expanded={gOpen}
						>
							{#if gOpen}
								<ChevronDownIcon class="size-4 shrink-0 opacity-60" />
							{:else}
								<ChevronRightIcon class="size-4 shrink-0 opacity-60" />
							{/if}
							<span class="min-w-0 flex-1 truncate font-medium">{g.grade.name}</span>
							{#if gStats.lessonsSelected > 0}
								<span class="badge badge-sm badge-primary">
									{gStats.lessonsSelected}
								</span>
							{/if}
							<span class="badge badge-sm badge-ghost shrink-0">
								{gStats.lessonsTotal}
							</span>
						</button>

						{#if gOpen}
							<ul class="divide-y divide-base-300 border-t border-base-300 bg-base-200/40">
								{#each g.subjects as sub (sub.subject.id)}
									{@const sStats = subjectStats(sub)}
									{@const sOpen = isExpanded(sub.subject.id)}
									<li>
										<button
											class="flex w-full items-center gap-2 py-2.5 pr-3 pl-7 text-left"
											onclick={() => toggleExpand(sub.subject.id)}
											aria-expanded={sOpen}
										>
											{#if sOpen}
												<ChevronDownIcon class="size-4 shrink-0 opacity-60" />
											{:else}
												<ChevronRightIcon class="size-4 shrink-0 opacity-60" />
											{/if}
											<span class="min-w-0 flex-1 truncate text-sm">{sub.subject.name}</span>
											{#if sStats.lessonsSelected > 0}
												<span class="badge badge-xs badge-primary">
													{sStats.lessonsSelected}
												</span>
											{/if}
											<span class="badge badge-xs badge-ghost shrink-0">
												{sStats.lessonsTotal}
											</span>
										</button>

										{#if sOpen}
											<ul class="divide-y divide-base-300 border-t border-base-300 bg-base-100">
												{#each sub.lessons as it (it.lesson.id)}
													{@const checked = selected.has(it.lesson.id)}
													<li>
														<label class="flex cursor-pointer items-center gap-3 py-2.5 pr-3 pl-12">
															<input
																type="checkbox"
																class="checkbox checkbox-sm"
																{checked}
																onchange={() => toggleLeaf(it.lesson.id)}
															/>
															<span class="min-w-0 flex-1 truncate text-sm">{it.lesson.name}</span>
															<span class="badge badge-xs">{it.count}</span>
														</label>
													</li>
												{/each}
											</ul>
										{/if}
									</li>
								{/each}
							</ul>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
	</section>

	<section>
		<h2 class="mb-2 text-sm font-semibold tracking-wide uppercase opacity-70">Modus</h2>
		<div class="grid gap-2">
			{#each modes as m (m.id)}
				{@const Icon = m.icon}
				{@const active = mode === m.id}
				<button
					class="flex items-center gap-3 rounded-box border border-base-300 bg-base-100 p-3 text-left transition"
					class:!border-primary={active}
					onclick={() => (mode = m.id)}
					aria-pressed={active}
				>
					<div
						class="flex size-10 items-center justify-center rounded-full"
						class:bg-primary={active}
						class:text-primary-content={active}
						class:bg-base-200={!active}
					>
						<Icon class="size-5" />
					</div>
					<div class="flex-1">
						<div class="text-sm font-medium">{m.label}</div>
						<div class="text-xs opacity-60">{m.desc}</div>
					</div>
				</button>
			{/each}
		</div>

		{#if mode === 'type'}
			<label class="mt-3 flex items-center gap-2 text-sm">
				<input type="checkbox" bind:checked={typeTolerant} class="checkbox checkbox-sm" />
				Tippfehler erlauben (1–2 Zeichen)
			</label>
		{/if}
	</section>

	<button class="btn btn-primary btn-lg w-full" disabled={!selected.size} onclick={start}>
		<PlayIcon class="size-5" />
		Test starten
		{#if totalSelectedCards}
			<span class="badge badge-soft">{totalSelectedCards}</span>
		{/if}
	</button>
</div>
