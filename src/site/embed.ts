import type { SiteConfig, VideoManifest, VideoManifestEntry } from './types.js';

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
	/** Site primary color — the widget's default accent */
	accent: string;
	/** Base-relative video path ("videos/<file>") */
	video: string;
	/** Base-relative poster image */
	poster?: string;
	/** Base-relative path of the full tutorial page ("<id>/") */
	page: string;
	steps: EmbedStep[];
}

export interface EmbedIndexEntry {
	id: string;
	title: string;
	duration: string;
	durationSeconds: number;
	lang: string;
	variant?: string;
}

export interface EmbedIndex {
	schemaVersion: number;
	tutorials: EmbedIndexEntry[];
}

/** config.lang may be a comma-separated list — the first entry is the site default */
const siteLang = (config: SiteConfig) => (config.lang || 'en').split(',')[0].trim();

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

	const poster = video.poster ?? (video.stepsDetail ?? []).find((s) => s.image)?.image;

	return {
		schemaVersion: EMBED_SCHEMA_VERSION,
		id: video.id,
		title: video.title,
		...(video.description ? { description: video.description } : {}),
		duration: video.duration,
		durationSeconds: video.durationSeconds ?? 0,
		...(video.variant ? { variant: video.variant } : {}),
		lang: video.lang || siteLang(config),
		accent: config.primaryColor || '#6366f1',
		video: `videos/${video.file}`,
		...(poster ? { poster: `videos/${poster}` } : {}),
		page: `${video.id}/`,
		steps
	};
}

/** All the JSON files players consume: one payload per tutorial plus an
 *  index (slug discovery). Paths are relative to the site root — scaffold
 *  writes them under public/. */
export function buildEmbedFiles(manifest: VideoManifest, config: SiteConfig): { path: string; data: EmbedTutorial | EmbedIndex }[] {
	const files: { path: string; data: EmbedTutorial | EmbedIndex }[] = manifest.videos.map((v) => ({
		path: `embed/${v.id}.json`,
		data: buildEmbedTutorial(v, config)
	}));

	const index: EmbedIndex = {
		schemaVersion: EMBED_SCHEMA_VERSION,
		tutorials: manifest.videos.map((v) => ({
			id: v.id,
			title: v.title,
			duration: v.duration,
			durationSeconds: v.durationSeconds ?? 0,
			lang: v.lang || siteLang(config),
			...(v.variant ? { variant: v.variant } : {})
		}))
	};
	files.push({ path: 'embed/index.json', data: index });

	return files;
}
