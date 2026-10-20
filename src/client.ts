/**
 * Headless data API for a deployed playwright-director gallery — "bring your own UI".
 *
 *   import { load } from 'playwright-director/client';
 *   const t = await load('create-account', { baseUrl: 'https://tutorials.example.com/', lang: 'fr' });
 *   video.src = t.video; t.steps.forEach((s) => addChapter(s.at, s.title));
 *
 * Browser-safe, zero dependencies. The gallery also serves this file as
 * `<site>/client.js`; widget.js builds on it (`PlaywrightDirector.load()`).
 * Payload schema: schemas/embed-v1.schema.json.
 */
import type { EmbedIndex, EmbedStep, EmbedTutorial } from './site/embed.js';

export type { EmbedIndex, EmbedIndexEntry, EmbedStep, EmbedTutorial } from './site/embed.js';

/** A tutorial payload with every URL (video, poster, page, steps[].image) made absolute. */
export interface TutorialData extends EmbedTutorial {
	/** Absolute base URL the payload was loaded from */
	baseUrl: string;
	steps: EmbedStep[];
}

export interface LoadOptions {
	/** Gallery base URL (the directory serving embed/). Relative URLs resolve against the page. */
	baseUrl: string;
	/** Preferred narration language; falls back to the tutorial's default language */
	lang?: string;
	fetch?: typeof fetch;
}

function absoluteBase(baseUrl: string): string {
	const withSlash = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
	const here = typeof location !== 'undefined' ? location.href : undefined;
	return new URL(withSlash, here).href;
}

async function getJson<T>(url: string, what: string, base: string, fetchFn: typeof fetch): Promise<T | null> {
	let res: Response;
	try {
		res = await fetchFn(url);
	} catch (error) {
		throw new Error(
			`[playwright-director] Could not fetch ${url}: network error, or the tutorials host sends no ` +
				`Access-Control-Allow-Origin header for this origin (${error instanceof Error ? error.message : error}).`
		);
	}
	if (res.status === 404) return null;
	if (!res.ok) throw new Error(`[playwright-director] ${what}: ${url} answered HTTP ${res.status}.`);
	try {
		return (await res.json()) as T;
	} catch {
		throw new Error(`[playwright-director] ${what}: ${url} is not JSON — is ${base} the gallery base URL?`);
	}
}

/** All tutorials of the gallery (embed/index.json). */
export async function loadIndex(options: Omit<LoadOptions, 'lang'>): Promise<EmbedIndex> {
	const base = absoluteBase(options.baseUrl);
	const url = `${base}embed/index.json`;
	const index = await getJson<EmbedIndex>(url, 'Index', base, options.fetch ?? fetch);
	if (!index) throw new Error(`[playwright-director] No index at ${url} (HTTP 404) — is ${base} the gallery base URL?`);
	return index;
}

/** One tutorial, URLs resolved. Rejects with a message naming the URL and the reason. */
export async function load(slug: string, options: LoadOptions): Promise<TutorialData> {
	const base = absoluteBase(options.baseUrl);
	const fetchFn = options.fetch ?? fetch;
	const what = `Tutorial "${slug}"`;
	const candidates = [
		...(options.lang ? [`${base}embed/${encodeURIComponent(slug)}.${encodeURIComponent(options.lang)}.json`] : []),
		`${base}embed/${encodeURIComponent(slug)}.json`
	];
	let data: EmbedTutorial | null = null;
	for (const url of candidates) {
		data = await getJson<EmbedTutorial>(url, what, base, fetchFn);
		if (data) break;
	}
	if (!data) {
		throw new Error(
			`[playwright-director] ${what} not found: ${candidates.join(' and ')} answered HTTP 404. ` +
				`Known slugs: ${base}embed/index.json`
		);
	}
	const abs = (path: string) => new URL(path, base).href;
	return {
		...data,
		baseUrl: base,
		video: abs(data.video),
		...(data.poster ? { poster: abs(data.poster) } : {}),
		page: abs(data.page),
		steps: data.steps.map((s) => (s.image ? { ...s, image: abs(s.image) } : s))
	};
}

/** The chapter playing at `time` seconds — the last step whose `at` is reached. */
export function currentStep(steps: EmbedStep[], time: number): EmbedStep | undefined {
	let found: EmbedStep | undefined;
	for (const s of steps) if (s.at !== undefined && s.at <= time + 0.25) found = s;
	return found;
}
