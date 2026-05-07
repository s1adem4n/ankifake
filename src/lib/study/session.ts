export type StudyMode = 'flip' | 'mc' | 'type';

export interface StudyConfig {
	lessonIds: string[];
	mode: StudyMode;
	shuffle: boolean;
	typeTolerant: boolean;
}

let pending: StudyConfig | null = null;

export function setPendingSession(config: StudyConfig) {
	pending = config;
}

export function takePendingSession(): StudyConfig | null {
	const c = pending;
	pending = null;
	return c;
}
