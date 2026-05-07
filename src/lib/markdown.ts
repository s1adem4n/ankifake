import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { db } from './db/db';

const ATTACHMENT_RE = /attachment:([0-9a-fA-F-]{36})/g;

marked.setOptions({ gfm: true, breaks: true });

export interface RenderResult {
	html: string;
	dispose: () => void;
}

export interface PendingAttachment {
	id: string;
	blob: Blob;
}

/**
 * Render markdown with `attachment:<uuid>` references resolved to blob URLs.
 * Pass `pending` to also resolve in-memory attachments (used by the editor's live preview).
 */
export async function renderMarkdown(
	md: string,
	pending: PendingAttachment[] = []
): Promise<RenderResult> {
	const ids = Array.from(new Set(Array.from(md.matchAll(ATTACHMENT_RE), (m) => m[1])));
	const urls = new Map<string, string>();

	for (const id of ids) {
		const fromPending = pending.find((p) => p.id === id);
		if (fromPending) {
			urls.set(id, URL.createObjectURL(fromPending.blob));
			continue;
		}
		const att = await db.attachments.get(id);
		if (att) urls.set(id, URL.createObjectURL(att.blob));
	}

	const swapped = md.replace(ATTACHMENT_RE, (_, id) => urls.get(id) ?? '#');
	const dirty = await marked.parse(swapped);
	const html = DOMPurify.sanitize(dirty, { ADD_ATTR: ['target'] });

	return {
		html,
		dispose: () => urls.forEach((u) => URL.revokeObjectURL(u))
	};
}
