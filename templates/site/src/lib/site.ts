// Data helpers shared by every theme: the manifest (data/tutorials.json) in, page-ready values out.
import tutorials from '../data/tutorials.json';
import siteConfig from '../data/site-config.json';
import { siteLang, t } from '../i18n';

export type Step = { n?: number; at?: number; title?: string; key?: string; text?: string; image?: string; context?: boolean };
export type NumberedStep = Step & { num?: number };
export type Video = {
	id: string;
	slug?: string;
	title: string;
	category: string;
	duration: string;
	durationSeconds: number;
	/** Page language */
	lang?: string;
	/** Fallback page: language of the recording it plays */
	videoLang?: string;
	langs?: string[];
	variant?: string;
	premium?: boolean;
	file: string;
	poster?: string;
	description?: string;
	stepsDetail?: Step[];
	[key: string]: any;
};
type Localized = string | Record<string, string>;
export type Category = { id: string; icon?: string; label: Localized; blurb?: Localized };

export const manifest = tutorials as any;
export const config = siteConfig as any;
export const allVideos: Video[] = manifest.videos;
/** Base path without trailing slash ('' at the root) */
export const base = import.meta.env.BASE_URL.replace(/\/$/, '');

/** A config text: a string, or one per language (falls back to the site language, then any) */
export function loc(value: string | Record<string, string> | undefined, lang?: string): string {
	if (!value || typeof value === 'string') return value ?? '';
	return value[lang ?? siteLang] ?? value[siteLang] ?? Object.values(value)[0] ?? '';
}

/** `*word*` in a config title marks emphasis: odd entries are emphasized ("Learn *fast*" → ['Learn ', 'fast', '']) */
export const emphasisParts = (s: string) => s.split(/\*(.+?)\*/);
/** The same title without the emphasis marks (for <title>, meta, alt) */
export const plainText = (s: string) => s.replace(/\*(.+?)\*/g, '$1');

export const media = (file: string) => `${base}/videos/${file}`;
export const videoHref = (v: Video) => `${base}/${v.id}/`;
export const homeOf = (lang?: string) => (!lang || lang === siteLang ? `${base}/` : `${base}/${lang}/`);
export const mmss = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;

const configLangs = String(config.lang || '').split(',').map((l) => l.trim());
/** Config `lang` order first, then alphabetical */
const byLang = (a: string, b: string) => {
	const rank = (l: string) => (configLangs.includes(l) ? configLangs.indexOf(l) : Infinity);
	return rank(a) - rank(b) || a.localeCompare(b);
};

/** Every page language — the recorded ones plus, with several config languages, all of them (fallback pages) */
export const pageLangs = (): string[] =>
	([...new Set(allVideos.map((v) => v.lang).filter(Boolean))] as string[]).sort(byLang);

/** Content language of a page's video texts: the recording's on a fallback page */
export const textLang = (v: Video) => v.videoLang ?? v.lang;

/** "This video is in French." on a fallback page, '' otherwise */
export const videoLangNote = (v: Video, lang: string) =>
	v.videoLang ? t(lang, 'videoInLang', { lang: new Intl.DisplayNames([lang], { type: 'language' }).of(v.videoLang) ?? v.videoLang }) : '';

/** One tutorial across its languages: slug + variant */
export const tutorialKey = (v: Video) => `${v.slug ?? v.id}|${v.variant ?? ''}`;

/**
 * Videos listed on a language's home page, in manifest order: each tutorial (slug + variant) once, in this
 * language when recorded in it, else in its first recorded language — a missing translation never hides a tutorial.
 */
export function videosForLang(lang: string): Video[] {
	const pick = new Map<string, Video>();
	for (const v of allVideos) {
		const k = tutorialKey(v);
		if (!pick.has(k) || ((v.lang ?? siteLang) === lang && (pick.get(k)!.lang ?? siteLang) !== lang)) pick.set(k, v);
	}
	return allVideos.filter((v) => pick.get(tutorialKey(v)) === v);
}

/** Whole minutes of a list of videos, at least 1 */
export const minutesOf = (videos: Video[]) =>
	Math.max(1, Math.ceil(videos.reduce((sum, v) => sum + (v.durationSeconds || 0), 0) / 60));

/** "3 videos · ~4 min" for a section */
export const sectionStats = (lang: string, videos: Video[]) => t(lang, 'sectionStats', { n: videos.length, m: minutesOf(videos) });

/** The app link for a page: the video's deep link, else the site's appUrl with {lang} resolved */
export const appHref = (lang: string, video?: Video): string | undefined =>
	video?.links?.app ?? (config.appUrl ? String(config.appUrl).replaceAll('{lang}', lang) : undefined);

/** Sequential display numbers for numbered steps (contexts don't count) */
export function numberSteps(video: Video): NumberedStep[] {
	let counter = 0;
	return (video.stepsDetail ?? []).map((s) => ({ ...s, num: s.context ? undefined : ++counter }));
}

/** Poster: the recorded one, else the first step screenshot */
export const posterOf = (video: Video) => video.poster ?? numberSteps(video).find((s) => s.image)?.image;

/** Same tutorial (slug + variant) in every recorded language, sorted by language */
export const translationsOf = (video: Video) =>
	allVideos
		.filter((v) => tutorialKey(v) === tutorialKey(video))
		.sort((a, b) => byLang(String(a.lang), String(b.lang)));

/** Previous / next video in a list (null at the ends) */
export function neighbours(list: Video[], video: Video): { prev: Video | null; next: Video | null } {
	const at = list.findIndex((v) => v.id === video.id);
	return { prev: at > 0 ? list[at - 1] : null, next: at >= 0 && at < list.length - 1 ? list[at + 1] : null };
}

/** Videos of the same language as `video`, in manifest order */
export const sameLang = (video: Video) => allVideos.filter((v) => (v.lang ?? '') === (video.lang ?? ''));

/** Category sections in manifest order, each with its videos (empty ones dropped) */
export function sections(videos: Video[]): (Category & { videos: Video[] })[] {
	return Object.entries(manifest.categories as Record<string, Omit<Category, 'id'>>)
		.map(([id, cat]) => ({ id, ...cat, videos: videos.filter((v) => v.category === id) }))
		.filter((s) => s.videos.length > 0);
}

/** <head> SEO data of a video page (JSON-LD is precomputed by scaffold when baseUrl is a full URL) */
export function videoSeo(video: Video) {
	const poster = posterOf(video);
	return {
		type: 'video.other' as const,
		image: poster ? media(poster) : undefined,
		video: media(video.file),
		alternates: translationsOf(video).filter((v) => v.lang).map((v) => ({ lang: v.lang!, href: videoHref(v) })),
		jsonLd: video.jsonLd
	};
}

/** <head> SEO data of a home page */
export const homeSeo = () => ({ alternates: pageLangs().map((lang) => ({ lang, href: homeOf(lang) })) });

export const steps = { layout: (config.stepsLayout || 'text') as 'text' | 'cards' | 'full' | 'none', strip: config.showStrip !== false };
