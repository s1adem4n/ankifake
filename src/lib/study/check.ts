function levenshtein(a: string, b: string): number {
	if (a === b) return 0;
	const m = a.length;
	const n = b.length;
	if (!m) return n;
	if (!n) return m;
	let v0 = new Array<number>(n + 1);
	let v1 = new Array<number>(n + 1);
	for (let i = 0; i <= n; i++) v0[i] = i;
	for (let i = 0; i < m; i++) {
		v1[0] = i + 1;
		for (let j = 0; j < n; j++) {
			const cost = a.charCodeAt(i) === b.charCodeAt(j) ? 0 : 1;
			v1[j + 1] = Math.min(v1[j] + 1, v0[j + 1] + 1, v0[j] + cost);
		}
		[v0, v1] = [v1, v0];
	}
	return v0[n];
}

function normalize(s: string): string {
	return s
		.toLowerCase()
		.normalize('NFKD')
		.trim()
		.replace(/\s+/g, ' ')
		.replace(/[.,;:!?¿¡"„""'`´]/g, '');
}

export function isCorrectAnswer(input: string, expected: string, tolerant: boolean): boolean {
	const a = normalize(input);
	const b = normalize(expected);
	if (!a) return false;
	if (a === b) return true;
	if (!tolerant) return false;
	const len = Math.max(a.length, b.length);
	if (len <= 4) return false;
	const allowed = len <= 8 ? 1 : 2;
	return levenshtein(a, b) <= allowed;
}
