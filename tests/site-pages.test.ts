import { describe, it, expect } from 'vitest';
import { buildPages } from '../src/site/generate-manifest.js';
import { videoJsonLd, buildSitemap } from '../src/site/seo.js';
import type { SiteConfig, VideoManifest, VideoManifestEntry } from '../src/site/types.js';

const video = (id: string, lang: string, extra: Partial<VideoManifestEntry> = {}): VideoManifestEntry => ({
	id,
	slug: id.replace(/\.[a-z]{2}$/, ''),
	category: 'start',
	title: `Title ${id}`,
	duration: '0:12',
	durationSeconds: 12,
	lang,
	premium: false,
	file: `${id}.webm`,
	uploadDate: '2026-08-01',
	steps: 0,
	...extra
});
const manifest = (videos: VideoManifestEntry[]): VideoManifest => ({ categories: {}, videos, ui: { heroTitle: 'T', heroSubtitle: 'S' } });
const config = (lang: string, tutorials: SiteConfig['tutorials'] = {}): SiteConfig => ({ title: 'T', input: '.', output: '.', baseUrl: '/', lang, tutorials });

describe('buildPages', () => {
	it('keeps the recordings as they are with a single language', () => {
		const videos = [video('look', 'en')];
		expect(buildPages(manifest(videos), config('fr'))).toEqual(videos);
	});

	it('adds a page per config language without a recording, playing the default-language video', () => {
		const pages = buildPages(manifest([video('look', 'fr'), video('pay', 'fr'), video('pay.en', 'en')]), config('fr,en,ar'));
		expect(pages.map((p) => [p.id, p.lang, p.videoLang, p.file])).toEqual([
			['look', 'fr', undefined, 'look.webm'],
			['en/look', 'en', 'fr', 'look.webm'],
			['ar/look', 'ar', 'fr', 'look.webm'],
			['pay', 'fr', undefined, 'pay.webm'],
			['pay.en', 'en', undefined, 'pay.en.webm'],
			['ar/pay', 'ar', 'fr', 'pay.webm']
		]);
		expect(pages.every((p) => p.slug === pages.find((o) => o.file === p.file)!.slug)).toBe(true);
	});

	it('falls back to the first recording when the default language is missing, per variant', () => {
		const pages = buildPages(manifest([video('look.en', 'en'), video('look-mobile.en', 'en', { variant: 'mobile' })]), config('fr,en'));
		expect(pages.map((p) => [p.id, p.videoLang])).toEqual([
			['look.en', undefined],
			['fr/look', 'en'],
			['look-mobile.en', undefined],
			['fr/look-mobile', 'en']
		]);
	});

	it('uses tutorials.paths per language, the default language at the root', () => {
		const paths = { look: { fr: 'regarder', en: 'your-look', ar: 'مظهرك' } };
		const pages = buildPages(manifest([video('look', 'fr'), video('look-mobile', 'fr', { variant: 'mobile' })]), config('fr,en,ar', { paths }));
		expect(pages.map((p) => p.id)).toEqual(['regarder', 'en/your-look', 'ar/مظهرك', 'regarder-mobile', 'en/your-look-mobile', 'ar/مظهرك-mobile']);
	});

	it('gives fallback pages the recording language in JSON-LD and hreflang alternates in the sitemap', () => {
		const pages = buildPages(manifest([video('look', 'fr')]), config('fr,ar'));
		expect(videoJsonLd(pages[1], 'https://x.dev/').inLanguage).toBe('fr');
		expect(videoJsonLd(pages[1], 'https://x.dev/').url).toBe('https://x.dev/ar/look/');
		const xml = buildSitemap(manifest(pages), 'https://x.dev/', 'fr');
		expect(xml).toContain('<loc>https://x.dev/ar/look/</loc>');
		expect(xml).toContain('<loc>https://x.dev/ar/</loc>');
		expect(xml).toContain('hreflang="ar" href="https://x.dev/ar/look/"');
	});
});
