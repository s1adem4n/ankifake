<script lang="ts">
	import { resolve } from '$app/paths';
	import { db } from '$lib/db/db';
	import { deleteCard, listCards } from '$lib/db/queries';
	import { Subscription } from '$lib/db/subscription.svelte';
	import type { Card, Lesson, Subject } from '$lib/db/types';
	import AppHeader from '$lib/components/AppHeader.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import PlusIcon from '~icons/lucide/plus';
	import MoreVerticalIcon from '~icons/lucide/more-vertical';
	import UploadIcon from '~icons/lucide/upload';
	import PencilIcon from '~icons/lucide/pencil';
	import TrashIcon from '~icons/lucide/trash-2';

	let {
		data
	}: {
		data: {
			lessonId: string;
			lesson: Lesson | undefined;
			subject: Subject | undefined;
			cards: Card[];
		};
	} = $props();
	const lessonId = $derived(data.lessonId);
	const model = new Subscription(
		() => {
			const id = lessonId;
			return async () => {
				const lesson = await db.lessons.get(id);

				return {
					lesson,
					subject: lesson ? await db.subjects.get(lesson.subjectId) : undefined,
					cards: await listCards(id)
				};
			};
		},
		() => ({ lesson: data.lesson, subject: data.subject, cards: data.cards })
	);
	const lesson = $derived(model.value.lesson);
	const subject = $derived(model.value.subject);
	const cards = $derived(model.value.cards);
	let toDelete = $state<Card | null>(null);

	const backHref = $derived(
		subject
			? resolve('/library/[gradeId]/[subjectId]', {
					gradeId: subject.gradeId,
					subjectId: subject.id
				})
			: resolve('/library')
	);

	function preview(text: string): string {
		const stripped = text
			.replace(/!\[[^\]]*\]\([^)]*\)/g, '🖼')
			.replace(/[#*_`>~-]/g, '')
			.replace(/\s+/g, ' ')
			.trim();
		return stripped.length > 80 ? stripped.slice(0, 80) + '…' : stripped;
	}

	function blurActive() {
		(document.activeElement as HTMLElement | null)?.blur();
	}

	async function onDelete() {
		if (!toDelete) return;
		await deleteCard(toDelete.id);
		toDelete = null;
	}
</script>

<AppHeader title={lesson?.name ?? 'Lektion'} back={backHref}>
	{#snippet actions()}
		<a
			href={resolve('/lesson/[lessonId]/new', { lessonId })}
			class="btn btn-square btn-sm btn-primary"
			aria-label="Neue Karte"
		>
			<PlusIcon class="size-4" />
		</a>
		<div class="dropdown dropdown-end">
			<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
			<div tabindex="0" role="button" class="btn btn-square btn-ghost btn-sm" aria-label="Mehr">
				<MoreVerticalIcon class="size-4" />
			</div>
			<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
			<ul
				tabindex="0"
				class="dropdown-content menu z-20 w-52 rounded-box bg-base-100 p-1 shadow-lg"
			>
				<li>
					<a href={resolve('/lesson/[lessonId]/import', { lessonId })} onclick={blurActive}>
						<UploadIcon class="size-4" />CSV importieren
					</a>
				</li>
			</ul>
		</div>
	{/snippet}
</AppHeader>

<ul class="list">
	{#each cards as c (c.id)}
		<li class="flex items-center border-b border-base-300 bg-base-100 last:border-b-0">
			<a
				href={resolve('/lesson/[lessonId]/[cardId]', { lessonId, cardId: c.id })}
				class="flex min-w-0 flex-1 flex-col gap-1 px-4 py-3"
			>
				<div class="truncate text-sm font-medium">{preview(c.front) || '(leer)'}</div>
				<div class="truncate text-xs opacity-60">{preview(c.back) || '(leer)'}</div>
			</a>
			<div class="dropdown dropdown-end mr-2">
				<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
				<div
					tabindex="0"
					role="button"
					class="btn btn-square btn-ghost btn-sm"
					aria-label="Aktionen"
				>
					<MoreVerticalIcon class="size-4" />
				</div>
				<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
				<ul
					tabindex="0"
					class="dropdown-content menu z-20 w-44 rounded-box bg-base-100 p-1 shadow-lg"
				>
					<li>
						<a
							href={resolve('/lesson/[lessonId]/[cardId]', { lessonId, cardId: c.id })}
							onclick={blurActive}
						>
							<PencilIcon class="size-4" />Bearbeiten
						</a>
					</li>
					<li>
						<button
							class="text-error"
							onclick={() => {
								blurActive();
								toDelete = c;
							}}
						>
							<TrashIcon class="size-4" />Löschen
						</button>
					</li>
				</ul>
			</div>
		</li>
	{:else}
		<li class="p-8 text-center opacity-60">
			Noch keine Karten. Tippe auf <span class="font-semibold">+</span> oder importiere ein CSV.
		</li>
	{/each}
</ul>

<ConfirmDialog
	open={toDelete !== null}
	title="Karte löschen?"
	message="Die Karte wird unwiderruflich entfernt."
	onConfirm={onDelete}
	onClose={() => (toDelete = null)}
/>
