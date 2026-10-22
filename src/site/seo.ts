// Search-engine output of the gallery: VideoObject JSON-LD, sitemap.xml, robots.txt, and links.json
// (docs page → tutorials, for a documentation site to link back). All need absolute URLs, so they are
// only produced when `baseUrl` is a full URL.
import type { SiteConfig, VideoManifest, VideoManifestEntry } from './types.js';
import { posterOf } from './embed.js';

/** Absolute site URL with a trailing slash, or undefined when baseUrl is only a path */
export function siteUrlOf(config: Pick<SiteConfig, 'baseUrl'>): string | undefined {
	if (!/^https?:\/\//.test(config.baseUrl ?? '')) return undefined;
	return config.baseUrl.endsWith('/') ? config.baseUrl : `${config.baseUrl}/`;
}

/** 206 → "PT3M26S" */
export function isoDuration(seconds: number): string {
	const s = Math.round(seconds);
	const h = Math.floor(s / 3600);
	const m = Math.floor((s % 3600) / 60);
	return `PT${h ? `${h}H` : ''}${m ? `${m}M` : ''}${s % 60 || (!h && !m) ? `${s % 60}S` : ''}`;
}

const pageUrl = (site: string, v: VideoManifestEntry) => `${site}${v.id}/`;
const homeUrl = (site: string, lang: string, defaultLang: string) => (lang === defaultLang ? site : `${site}${lang}/`);
const xml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** schema.org VideoObject for one video page, chapters as `hasPart` Clips (Google "key moments") */
export function videoJsonLd(v: VideoManifestEntry, site: string): Record<string, unknown> {
	const url = pageUrl(site, v);
	const poster = posterOf(v);
	const chapters = (v.stepsDetail ?? []).filter((s) => !s.context && s.at !== undefined && (s.title || s.text));
	// A title derived from the narration's first sentence is already in the text.
	const transcript = (v.stepsDetail ?? [])
		.map((s) => (s.title && s.text?.startsWith(s.title) ? s.text : [s.title, s.text].filter(Boolean).join('. ')))
		.filter(Boolean)
		.join(' ');
	return {
		'@context': 'https://schema.org',
		'@type': 'VideoObject',
		name: v.title,
		description: v.description || v.title,
		...(poster ? { thumbnailUrl: [`${site}videos/${poster}`] } : {}),
		contentUrl: `${site}videos/${v.file}`,
		url,
		...(v.durationSeconds ? { duration: isoDuration(v.durationSeconds) } : {}),
		...(v.videoLang || v.lang ? { inLanguage: v.videoLang || v.lang } : {}),
		uploadDate: `${v.uploadDate}T00:00:00+00:00`,
		...(v.dateModified ? { dateModified: `${v.dateModified}T00:00:00+00:00` } : {}),
		...(transcript ? { transcript } : {}),
		...(chapters.length > 1
			? {
					hasPart: chapters.map((s, i) => {
						const start = Math.floor(s.at!);
						const end = Math.floor(chapters[i + 1]?.at ?? v.durationSeconds) || start + 1;
						return { '@type': 'Clip', name: s.title || s.text, startOffset: start, endOffset: Math.max(end, start + 1), url: `${url}?t=${start}` };
					})
				}
			: {})
	};
}

/** Home pages (one per language) + every video page, each with its language alternates */
export function buildSitemap(manifest: VideoManifest, site: string, defaultLang: string): string {
	const langs = [...new Set(manifest.videos.map((v) => v.lang).filter(Boolean))] as string[];
	const homeLangs = langs.length > 1 ? langs : [];
	const alt = (lang: string, href: string) => `\n    <xhtml:link rel="alternate" hreflang="${xml(lang)}" href="${xml(href)}"/>`;
	const entry = (loc: string, alternates: string, lastmod?: string) =>
		`  <url>\n    <loc>${xml(loc)}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''}${alternates}\n  </url>`;

	const urls: string[] = [];
	const homeAlternates = homeLangs.map((l) => alt(l, homeUrl(site, l, defaultLang))).join('');
	for (const lang of homeLangs.length ? homeLangs : [defaultLang]) urls.push(entry(homeUrl(site, lang, defaultLang), homeAlternates));
	for (const v of manifest.videos) {
		const translations = manifest.videos.filter((o) => (o.slug ?? o.id) === (v.slug ?? v.id) && (o.variant ?? '') === (v.variant ?? '') && o.lang);
		const alternates = translations.length > 1 ? translations.map((o) => alt(o.lang!, pageUrl(site, o))).join('') : '';
		urls.push(entry(pageUrl(site, v), alternates, v.dateModified ?? v.uploadDate));
	}
	return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>\n`;
}

export function buildRobots(site: string): string {
	return `User-agent: *\nAllow: /\nSitemap: ${site}sitemap.xml\n`;
}

export interface DocsLink {
	slug: string;
	lang?: string;
	title: string;
	url: string;
	poster?: string;
	duration: string;
	durationSeconds: number;
}

/** links.json: docs URL → the tutorials that link to it, so a docs site can render "watch the video" cards */
export function buildLinksFile(manifest: VideoManifest, site: string): Record<string, DocsLink[]> {
	const out: Record<string, DocsLink[]> = {};
	for (const v of manifest.videos) {
		if (!v.links?.docs) continue;
		const poster = posterOf(v);
		(out[v.links.docs] ??= []).push({
			slug: v.slug ?? v.id,
			...(v.lang ? { lang: v.lang } : {}),
			title: v.title,
			url: pageUrl(site, v),
			...(poster ? { poster: `${site}videos/${poster}` } : {}),
			duration: v.duration,
			durationSeconds: v.durationSeconds
		});
	}
	return out;
}
