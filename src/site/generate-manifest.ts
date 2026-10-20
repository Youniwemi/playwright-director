import type { ManifestStep, SiteConfig, VideoManifest, VideoManifestEntry } from './types.js';
import type { ScannedTutorial } from './scan-tutorials.js';

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

export function generateManifest(tutorials: ScannedTutorial[], config: SiteConfig): VideoManifest {
	const detectedCategories = new Set<string>();
	for (const t of tutorials) {
		detectedCategories.add(t.timeline.feature || 'general');
	}

	const categories: Record<string, { icon: string; label: string }> = {};
	for (const cat of detectedCategories) {
		categories[cat] = {
			icon: DEFAULT_CATEGORY_ICONS[cat] || '📹',
			label: cat.charAt(0).toUpperCase() + cat.slice(1).replace(/-/g, ' ')
		};
	}

	if (config.tutorials?.categories) {
		Object.assign(categories, config.tutorials.categories);
	}

	const videos: VideoManifestEntry[] = tutorials.map((t) => {
		const durationSec = Math.round(t.timeline.totalDurationMs / 1000);
		const minutes = Math.floor(durationSec / 60);
		const seconds = durationSec % 60;
		const { description, stepsDetail } = buildStepsDetail(t);

		return {
			id: t.timeline.testName,
			category: t.timeline.feature || 'general',
			// Older timelines don't carry `title` (the Tutorial display title) —
			// fall back to the Playwright test title, then the slug.
			title: t.timeline.title || t.timeline.testTitle || humanize(t.timeline.testName),
			duration: durationSec > 0 ? `${minutes}:${seconds.toString().padStart(2, '0')}` : '',
			durationSeconds: Math.round(t.timeline.totalDurationMs / 100) / 10,
			lang: t.timeline.lang,
			premium: false,
			file: t.videoFile,
			...(t.poster ? { poster: t.poster } : {}),
			feature: t.timeline.feature,
			variant: t.timeline.variant,
			uploadDate: new Date().toISOString().slice(0, 10),
			steps: t.stepScreenshots.length,
			description,
			stepsDetail: stepsDetail.length > 0 ? stepsDetail : undefined
		};
	});

	// Group the languages of one tutorial: `look`, `look.en`, `look.ar` share the slug `look`.
	const langsBySlug = new Map<string, Set<string>>();
	for (const v of videos) {
		const lang = v.lang ?? '';
		v.slug = lang && v.id.endsWith(`.${lang}`) ? v.id.slice(0, -lang.length - 1) : v.id;
		if (lang) (langsBySlug.get(v.slug) ?? langsBySlug.set(v.slug, new Set()).get(v.slug)!).add(lang);
	}
	for (const v of videos) v.langs = [...(langsBySlug.get(v.slug!) ?? [])].sort();

	return {
		categories,
		videos,
		ui: {
			heroTitle: config.tutorials?.ui?.heroTitle || config.title,
			heroSubtitle: config.tutorials?.ui?.heroSubtitle || 'Video tutorials'
		}
	};
}
