import type { ManifestStep, SiteConfig, VideoManifest, VideoManifestEntry } from './types.js';
import type { ScannedTutorial } from './scan-tutorials.js';
import { mergeStrings, uiString } from './strings.js';
import { siteLang } from './embed.js';

const DEFAULT_CATEGORY_ICONS: Record<string, string> = {
	'getting-started': '⭐',
	premium: '💎',
	portal: '👥',
	accountant: '🧾',
	payroll: '💰',
	accounting: '📊',
	settings: '⚙️'
};

function humanize(slug: string): string {
	const s = slug.replace(/[-_]/g, ' ').trim();
	return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Merge a tutorial's timeline narration with its step screenshots into the
 * step-by-step guide shown on the video page. Leading context narrations
 * become the page description; mid-flow contexts stay in the list as
 * unnumbered entries; screenshots of non-voiced steps (absent from the
 * timeline) are inserted at their step position with no text.
 */
export function buildStepsDetail(t: ScannedTutorial): { description?: string; stepsDetail: ManifestStep[] } {
	const shotByN = new Map(t.stepScreenshots.map((s) => [s.n, s.file]));
	const usedShots = new Set<number>();
	const stepsDetail: ManifestStep[] = [];
	const leadingContext: string[] = [];
	let seenStep = false;

	for (const s of t.timeline.steps) {
		const at = Math.round(s.startMs / 10) / 100;
		if (s.step === 0 && s.title === 'Context') {
			if (!s.text) continue;
			if (seenStep) stepsDetail.push({ at, text: s.text, context: true });
			else leadingContext.push(s.text);
			continue;
		}
		if (s.title === 'Complete') continue;
		seenStep = true;
		const image = shotByN.get(s.step);
		if (image !== undefined) usedShots.add(s.step);
		// An untranslated step (identity translate) has its key as title — show the narration's first sentence instead.
		const title = s.key && s.title === s.key && s.text ? s.text.split('. ')[0].replace(/\.$/, '') : s.title;
		stepsDetail.push({
			n: s.step,
			at,
			title,
			...(s.key ? { key: s.key } : {}),
			...(s.text ? { text: s.text } : {}),
			...(image ? { image } : {})
		});
	}

	for (const shot of t.stepScreenshots) {
		if (usedShots.has(shot.n)) continue;
		const at = stepsDetail.findIndex((d) => d.n !== undefined && d.n > shot.n);
		const entry: ManifestStep = { n: shot.n, image: shot.file };
		if (at === -1) stepsDetail.push(entry);
		else stepsDetail.splice(at, 0, entry);
	}

	return {
		description: leadingContext.length > 0 ? leadingContext.join(' ') : undefined,
		stepsDetail
	};
}

/** A link path on an origin (`{lang}` replaced); full URLs and missing origins leave the path as is. */
export function resolveLink(path: string | undefined, origin: string | undefined, lang: string): string | undefined {
	if (!path) return undefined;
	if (/^[a-z]+:/i.test(path) || !origin) return path;
	return origin.replaceAll('{lang}', lang).replace(/\/$/, '') + (path.startsWith('/') ? path : `/${path}`);
}

/** id without its `.<lang>` suffix (TUTORIAL_LANG recordings) */
const slugOf = (id: string, lang?: string) => (lang && id.endsWith(`.${lang}`) ? id.slice(0, -lang.length - 1) : id);

/** The name the config uses (`items`, `premium`, `links`): the slug without its `-<variant>` suffix too */
const configSlugOf = (t: ScannedTutorial) => {
	const slug = slugOf(t.timeline.testName, t.timeline.lang);
	const variant = t.timeline.variant;
	return variant && slug.endsWith(`-${variant}`) ? slug.slice(0, -variant.length - 1) : slug;
};

export function generateManifest(tutorials: ScannedTutorial[], config: SiteConfig): VideoManifest {
	const configured = config.tutorials?.categories ?? {};
	// A slug listed in a configured section's `items` belongs there, whatever its timeline feature.
	const listed = new Map<string, { category: string; rank: number }>();
	for (const [id, cat] of Object.entries(configured)) {
		(cat.items ?? []).forEach((slug, rank) => listed.set(slug, { category: id, rank }));
	}
	const categoryOf = (t: ScannedTutorial) => listed.get(configSlugOf(t))?.category ?? (t.timeline.feature || 'general');

	// Configured sections first, in config order, then the detected ones.
	const categories: VideoManifest['categories'] = {};
	for (const [id, cat] of Object.entries(configured)) {
		categories[id] = { icon: cat.icon ?? DEFAULT_CATEGORY_ICONS[id] ?? '📹', label: cat.label, blurb: cat.blurb };
	}
	for (const t of tutorials) {
		const cat = categoryOf(t);
		categories[cat] ??= { icon: DEFAULT_CATEGORY_ICONS[cat] || '📹', label: cat.charAt(0).toUpperCase() + cat.slice(1).replace(/-/g, ' ') };
	}

	// Recording dates per slug (all languages and variants): first = uploadDate, last = dateModified.
	const dates = new Map<string, string[]>();
	for (const t of tutorials) {
		const slug = configSlugOf(t);
		(dates.get(slug) ?? dates.set(slug, []).get(slug)!).push(t.recordedAt.slice(0, 10));
	}
	const premium = new Set(config.tutorials?.premium ?? []);

	const videos: VideoManifestEntry[] = tutorials.map((t) => {
		const durationSec = Math.round(t.timeline.totalDurationMs / 1000);
		const minutes = Math.floor(durationSec / 60);
		const seconds = durationSec % 60;
		const { description, stepsDetail } = buildStepsDetail(t);
		const slug = configSlugOf(t);
		const slugDates = dates.get(slug)!.sort();
		const raw = { ...t.timeline.links, ...config.tutorials?.links?.[slug] };
		const links = {
			app: resolveLink(raw.app, config.appUrl, t.timeline.lang),
			docs: resolveLink(raw.docs, config.docsUrl, t.timeline.lang)
		};

		return {
			id: t.timeline.testName,
			category: categoryOf(t),
			// Older timelines don't carry `title` (the Tutorial display title) —
			// fall back to the Playwright test title, then the slug.
			title: t.timeline.title || t.timeline.testTitle || humanize(t.timeline.testName),
			duration: durationSec > 0 ? `${minutes}:${seconds.toString().padStart(2, '0')}` : '',
			durationSeconds: Math.round(t.timeline.totalDurationMs / 100) / 10,
			lang: t.timeline.lang,
			premium: premium.has(slug),
			file: t.videoFile,
			...(t.poster ? { poster: t.poster } : {}),
			feature: t.timeline.feature,
			variant: t.timeline.variant,
			uploadDate: slugDates[0],
			dateModified: slugDates[slugDates.length - 1],
			...(links.app || links.docs ? { links } : {}),
			steps: t.stepScreenshots.length,
			description: description ?? stepsDetail.find((s) => s.text && !s.context)?.text,
			stepsDetail: stepsDetail.length > 0 ? stepsDetail : undefined
		};
	});

	// Group the languages of one tutorial: `look`, `look.en`, `look.ar` share the slug `look`.
	const langsBySlug = new Map<string, Set<string>>();
	for (const v of videos) {
		const lang = v.lang ?? '';
		v.slug = slugOf(v.id, lang);
		if (lang) (langsBySlug.get(v.slug) ?? langsBySlug.set(v.slug, new Set()).get(v.slug)!).add(lang);
	}
	for (const v of videos) v.langs = [...(langsBySlug.get(v.slug!) ?? [])].sort();

	// Section order, then the configured `items` order; unlisted videos keep the scan order (stable sort).
	const sectionRank = Object.keys(categories);
	const slugById = new Map(tutorials.map((t) => [t.timeline.testName, configSlugOf(t)]));
	const rank = (v: VideoManifestEntry) => listed.get(slugById.get(v.id)!)?.rank ?? Infinity;
	videos.sort((a, b) => sectionRank.indexOf(a.category) - sectionRank.indexOf(b.category) || rank(a) - rank(b));

	return {
		categories,
		...(config.tutorials?.featured ? { featured: config.tutorials.featured } : {}),
		videos,
		ui: {
			heroTitle: config.tutorials?.ui?.heroTitle || config.title,
			heroSubtitle:
				config.tutorials?.ui?.heroSubtitle ||
				uiString(mergeStrings(config.strings), siteLang(config), 'videoTutorials')
		}
	};
}
