import { liveQuery } from 'dexie';

export class Subscription<T> {
	value = $state<T>() as T;

	constructor(
		private createQuerier: () => () => T | Promise<T>,
		getInitialValue?: () => T
	) {
		const initialValue = getInitialValue?.();
		if (initialValue !== undefined) this.value = initialValue;

		$effect(() => {
			const querier = this.createQuerier();
			const subscription = liveQuery(querier).subscribe({
				next: (value) => {
					this.value = value;
				},
				error: (err) => console.error('Dexie LiveQuery Error:', err)
			});

			return () => subscription.unsubscribe();
		});
	}
}
