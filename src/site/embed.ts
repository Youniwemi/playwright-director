import type { SiteConfig, VideoManifest, VideoManifestEntry } from './types.js';
import { THEME_PRIMARY } from './tokens.js';

/** Bumped on any breaking change to the embed payloads; additions keep it. */
export const EMBED_SCHEMA_VERSION = 1;

/** One step of a payload. Display numbers are precomputed
 *  (sequential, contexts don't count) so any player stays dumb. */
export interface EmbedStep {
	num?: number;
	/** Start time in the video, seconds — seek here for chapters. Absent for screenshot-only steps. */
	at?: number;
	/** Human heading (never the raw i18n key) */
	title?: string;
	/** i18n key the step was declared with */
	key?: string;
	text?: string;
	/** Base-relative screenshot path, e.g. "videos/demo-step-1.webp" */
	image?: string;
	context?: boolean;
}

/** Payload served at embed/<id>.json — everything a player needs to render
 *  one tutorial. All paths are relative to the site base URL (the directory
 *  serving widget.js and embed/). Schema: schemas/embed-v1.schema.json. */
export interface EmbedTutorial {
	schemaVersion: number;
	id: string;
	title: string;
	description?: string;
	/** "m:ss" display string ('' when unknown) */
	duration: string;
	durationSeconds: number;
	variant?: string;
	lang: string;
	/** id without its `.<lang>` suffix */
	slug?: string;
	/** Every language this tutorial was recorded in */
	langs?: string[];
	/** Site primary color — the widget's default accent */
	accent: string;
	/** Base-relative video path ("videos/<file>") */
	video: string;
	/** Base-relative poster image */
	poster?: string;
	/** Base-relative path of the full tutorial page ("<id>/") */
	page: string;
	/** Absolute URLs: the app screen this tutorial shows, its documentation page */
	links?: { app?: string; docs?: string };
	steps: EmbedStep[];
}

export interface EmbedIndexEntry {
	id: string;
	slug?: string;
	title: string;
	duration: string;
	durationSeconds: number;
	lang: string;
	langs?: string[];
	variant?: string;
}

export interface EmbedIndex {
	schemaVersion: number;
	/** Site default language — embed/<slug>.json holds it */
	defaultLang?: string;
	tutorials: EmbedIndexEntry[];
}

/** config.lang may be a comma-separated list — the first entry is the site default */
export const siteLang = (config: Pick<SiteConfig, 'lang'>) => (config.lang || 'en').split(',')[0].trim();

/** Poster: the recorded one, else the first step screenshot (the site template has its own copy in lib/site.ts) */
export const posterOf = (video: VideoManifestEntry) => video.poster ?? video.stepsDetail?.find((s) => s.image)?.image;

export function buildEmbedTutorial(video: VideoManifestEntry, config: SiteConfig): EmbedTutorial {
	let counter = 0;
	const steps: EmbedStep[] = (video.stepsDetail ?? []).map((s) => ({
		...(s.context ? {} : { num: ++counter }),
		...(s.at !== undefined ? { at: s.at } : {}),
		...(s.title ? { title: s.title } : {}),
		...(s.key ? { key: s.key } : {}),
		...(s.text ? { text: s.text } : {}),
		...(s.image ? { image: `videos/${s.image}` } : {}),
		...(s.context ? { context: true } : {})
	}));

	const poster = posterOf(video);

	return {
		schemaVersion: EMBED_SCHEMA_VERSION,
		id: video.id,
		title: video.title,
		...(video.description ? { description: video.description } : {}),
		duration: video.duration,
		durationSeconds: video.durationSeconds ?? 0,
		...(video.variant ? { variant: video.variant } : {}),
		...(video.slug ? { slug: video.slug } : {}),
		lang: video.lang || siteLang(config),
		...(video.langs?.length ? { langs: video.langs } : {}),
		accent: config.tokens?.primary || config.primaryColor || THEME_PRIMARY[config.theme ?? 'academy'],
		video: `videos/${video.file}`,
		...(poster ? { poster: `videos/${poster}` } : {}),
		page: `${video.id}/`,
		...(video.links ? { links: video.links } : {}),
		steps
	};
}

/** All the JSON files players consume: one payload per tutorial plus an
 *  index (slug discovery). Paths are relative to the site root — scaffold
 *  writes them under public/. */
export function buildEmbedFiles(manifest: VideoManifest, config: SiteConfig): { path: string; data: EmbedTutorial | EmbedIndex }[] {
	const defaultLang = siteLang(config);
	const files = new Map<string, EmbedTutorial | EmbedIndex>();
	for (const v of manifest.videos) files.set(`embed/${v.id}.json`, buildEmbedTutorial(v, config));

	// Per-language aliases: embed/<slug>.<lang>.json for every recorded language,
	// and embed/<slug>.json = the default language (else the first one recorded).
	const bySlug = new Map<string, VideoManifestEntry[]>();
	for (const v of manifest.videos) {
		const slug = v.slug ?? v.id;
		bySlug.set(slug, [...(bySlug.get(slug) ?? []), v]);
	}
	const primary: VideoManifestEntry[] = [];
	for (const [slug, group] of bySlug) {
		const langOf = (v: VideoManifestEntry) => v.lang || defaultLang;
		for (const v of group) {
			const path = `embed/${slug}.${langOf(v)}.json`;
			if (!files.has(path)) files.set(path, buildEmbedTutorial(v, config));
		}
		const main = group.find((v) => langOf(v) === defaultLang) ?? group[0];
		primary.push(main);
		if (!files.has(`embed/${slug}.json`)) files.set(`embed/${slug}.json`, buildEmbedTutorial(main, config));
	}

	const index: EmbedIndex = {
		schemaVersion: EMBED_SCHEMA_VERSION,
		defaultLang,
		tutorials: primary.map((v) => ({
			id: v.id,
			...(v.slug ? { slug: v.slug } : {}),
			title: v.title,
			duration: v.duration,
			durationSeconds: v.durationSeconds ?? 0,
			lang: v.lang || defaultLang,
			...(v.langs?.length ? { langs: v.langs } : {}),
			...(v.variant ? { variant: v.variant } : {})
		}))
	};
	files.set('embed/index.json', index);

	return [...files].map(([path, data]) => ({ path, data }));
}
