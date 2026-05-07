import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { db } from './db/db';
import type { Attachment, Card, Grade, Lesson, Subject } from './db/types';

export interface BackupManifest {
	version: 1;
	exportedAt: string;
}

interface AttachmentMeta {
	id: string;
	cardId: string;
	filename: string;
	mime: string;
	createdAt: number;
}

interface BackupData {
	grades: Grade[];
	subjects: Subject[];
	lessons: Lesson[];
	cards: Card[];
	attachments: AttachmentMeta[];
}

function extFromMime(mime: string): string {
	if (mime.startsWith('image/')) return mime.slice(6).replace('+xml', '').toLowerCase();
	if (mime === 'application/pdf') return 'pdf';
	return 'bin';
}

function extFromName(name: string): string {
	const m = /\.([a-zA-Z0-9]+)$/.exec(name);
	return m ? m[1].toLowerCase() : '';
}

export async function exportBackup(): Promise<void> {
	const [grades, subjects, lessons, cards, attachments] = await Promise.all([
		db.grades.toArray(),
		db.subjects.toArray(),
		db.lessons.toArray(),
		db.cards.toArray(),
		db.attachments.toArray()
	]);

	const zip = new JSZip();
	const manifest: BackupManifest = {
		version: 1,
		exportedAt: new Date().toISOString()
	};
	zip.file('manifest.json', JSON.stringify(manifest, null, 2));

	const attMeta: AttachmentMeta[] = attachments.map((a) => ({
		id: a.id,
		cardId: a.cardId,
		filename: a.filename,
		mime: a.mime,
		createdAt: a.createdAt
	}));

	const data: BackupData = { grades, subjects, lessons, cards, attachments: attMeta };
	zip.file('data.json', JSON.stringify(data, null, 2));

	for (const a of attachments) {
		const ext = extFromName(a.filename) || extFromMime(a.mime) || 'bin';
		zip.file(`attachments/${a.id}.${ext}`, a.blob);
	}

	const blob = await zip.generateAsync({ type: 'blob' });
	const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
	saveAs(blob, `karteikarten-${ts}.zip`);
}

export type ImportMode = 'replace' | 'merge';

export interface ImportResult {
	grades: number;
	subjects: number;
	lessons: number;
	cards: number;
	attachments: number;
}

export async function importBackup(file: File, mode: ImportMode): Promise<ImportResult> {
	const zip = await JSZip.loadAsync(file);
	const dataFile = zip.file('data.json');
	if (!dataFile) throw new Error('data.json fehlt im Backup.');
	const data: BackupData = JSON.parse(await dataFile.async('string'));

	const attachmentBlobs = new Map<string, Blob>();
	for (const path of Object.keys(zip.files)) {
		if (!path.startsWith('attachments/') || zip.files[path].dir) continue;
		const filename = path.slice('attachments/'.length);
		const id = filename.replace(/\.[^.]+$/, '');
		attachmentBlobs.set(id, await zip.files[path].async('blob'));
	}

	const attachments: Attachment[] = data.attachments.map((a) => ({
		id: a.id,
		cardId: a.cardId,
		filename: a.filename,
		mime: a.mime,
		createdAt: a.createdAt,
		blob: attachmentBlobs.get(a.id) ?? new Blob([], { type: a.mime })
	}));

	await db.transaction(
		'rw',
		[db.grades, db.subjects, db.lessons, db.cards, db.attachments],
		async () => {
			if (mode === 'replace') {
				await Promise.all([
					db.grades.clear(),
					db.subjects.clear(),
					db.lessons.clear(),
					db.cards.clear(),
					db.attachments.clear()
				]);
				await db.grades.bulkAdd(data.grades);
				await db.subjects.bulkAdd(data.subjects);
				await db.lessons.bulkAdd(data.lessons);
				await db.cards.bulkAdd(data.cards);
				await db.attachments.bulkAdd(attachments);
			} else {
				await db.grades.bulkPut(data.grades);
				await db.subjects.bulkPut(data.subjects);
				await db.lessons.bulkPut(data.lessons);
				await db.cards.bulkPut(data.cards);
				await db.attachments.bulkPut(attachments);
			}
		}
	);

	return {
		grades: data.grades.length,
		subjects: data.subjects.length,
		lessons: data.lessons.length,
		cards: data.cards.length,
		attachments: attachments.length
	};
}

export async function clearAll(): Promise<void> {
	await db.transaction(
		'rw',
		[db.grades, db.subjects, db.lessons, db.cards, db.attachments],
		async () => {
			await Promise.all([
				db.grades.clear(),
				db.subjects.clear(),
				db.lessons.clear(),
				db.cards.clear(),
				db.attachments.clear()
			]);
		}
	);
}
