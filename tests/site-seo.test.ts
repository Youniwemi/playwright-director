import { describe, it, expect, afterEach } from 'vitest';
import { existsSync, readFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { siteUrlOf, isoDuration, videoJsonLd, buildSitemap, buildRobots, buildLinksFile } from '../src/site/seo.js';
import { scaffold } from '../src/site/scaffold.js';
import type { SiteConfig, VideoManifest, VideoManifestEntry } from '../src/site/types.js';

const SITE = 'https://help.example.com/gallery/';
const video = (id: string, lang: string, extra: Partial<VideoManifestEntry> = {}): VideoManifestEntry => ({
	id,
	slug: id.replace(/\.[a-z]{2}$/, ''),
	category: 'start',
	title: `Title ${id}`,
	duration: '1:30',
	durationSeconds: 90,
	lang,
	premium: false,
	file: `${id}.webm`,
	uploadDate: '2026-08-01',
	dateModified: '2026-09-01',
	steps: 2,
	description: 'Intro.',
	stepsDetail: [
		{ n: 1, at: 2.4, title: 'Open', text: 'Open the page.', image: `${id}-step-1.webp` },
		{ at: 10, text: 'A context.', context: true },
		{ n: 2, at: 30.8, title: 'Save', text: 'Save it.' }
	],
	...extra
});

describe('seo helpers', () => {
	it('needs a full baseUrl for absolute URLs', () => {
		expect(siteUrlOf({ baseUrl: '/help/' })).toBeUndefined();
		expect(siteUrlOf({ baseUrl: 'https://x.dev/help' })).toBe('https://x.dev/help/');
	});

	it('formats ISO 8601 durations', () => {
		expect(isoDuration(206)).toBe('PT3M26S');
		expect(isoDuration(60)).toBe('PT1M');
		expect(isoDuration(3725)).toBe('PT1H2M5S');
		expect(isoDuration(0)).toBe('PT0S');
	});

	it('builds a VideoObject with chapters as Clips', () => {
		const ld = videoJsonLd(video('demo', 'en'), SITE) as any;
		expect(ld).toMatchObject({
			'@type': 'VideoObject',
			name: 'Title demo',
			description: 'Intro.',
			thumbnailUrl: [`${SITE}videos/demo-step-1.webp`],
			contentUrl: `${SITE}videos/demo.webm`,
			url: `${SITE}demo/`,
			duration: 'PT1M30S',
			inLanguage: 'en',
			uploadDate: '2026-08-01T00:00:00+00:00',
			dateModified: '2026-09-01T00:00:00+00:00'
		});
		// "Open" / "Save" are the narrations' first words: not repeated
		expect(ld.transcript).toBe('Open the page. A context. Save it.');
		expect((videoJsonLd(video('x', 'en', { stepsDetail: [{ n: 1, at: 1, title: 'Billing', text: 'Open the page.' }] }), SITE) as any).transcript).toBe('Billing. Open the page.');
		expect(ld.hasPart).toEqual([
			{ '@type': 'Clip', name: 'Open', startOffset: 2, endOffset: 30, url: `${SITE}demo/?t=2` },
			{ '@type': 'Clip', name: 'Save', startOffset: 30, endOffset: 90, url: `${SITE}demo/?t=30` }
		]);
	});

	it('lists home pages and video pages with their language alternates in the sitemap', () => {
		const manifest: VideoManifest = { categories: {}, videos: [video('demo', 'fr'), video('demo.en', 'en')], ui: { heroTitle: '', heroSubtitle: '' } };
		const xml = buildSitemap(manifest, SITE, 'fr');
		expect(xml).toContain(`<loc>${SITE}</loc>`);
		expect(xml).toContain(`<loc>${SITE}en/</loc>`);
		expect(xml).toContain(`<loc>${SITE}demo.en/</loc>\n    <lastmod>2026-09-01</lastmod>`);
		expect(xml).toContain(`<xhtml:link rel="alternate" hreflang="en" href="${SITE}demo.en/"/>`);
		expect(buildRobots('https://x.dev/')).toBe('User-agent: *\nAllow: /\nSitemap: https://x.dev/sitemap.xml\n');
	});

	it('maps docs URLs to the tutorials linking to them', () => {
		const docs = 'https://docs.example.com/invoices/';
		const manifest: VideoManifest = { categories: {}, videos: [video('demo', 'fr', { links: { docs } }), video('other', 'fr')], ui: { heroTitle: '', heroSubtitle: '' } };
		expect(buildLinksFile(manifest, SITE)).toEqual({
			[docs]: [{ slug: 'demo', lang: 'fr', title: 'Title demo', url: `${SITE}demo/`, poster: `${SITE}videos/demo-step-1.webp`, duration: '1:30', durationSeconds: 90 }]
		});
	});
});

describe('scaffold SEO files', () => {
	const tempDir = join(tmpdir(), `playwright-director-seo-test-${process.pid}`);
	const config: SiteConfig = { title: 'Help', input: 't', output: 'd', baseUrl: 'https://help.example.com/', lang: 'fr', theme: 'classic' };
	const manifest: VideoManifest = { categories: {}, videos: [video('demo', 'fr')], ui: { heroTitle: '', heroSubtitle: '' } };

	afterEach(() => rmSync(tempDir, { recursive: true, force: true }));

	it('writes sitemap, robots, links.json and the JSON-LD with a full baseUrl', () => {
		scaffold(config, manifest, tempDir);
		expect(readFileSync(join(tempDir, 'public', 'sitemap.xml'), 'utf-8')).toContain('<loc>https://help.example.com/demo/</loc>');
		expect(existsSync(join(tempDir, 'public', 'robots.txt'))).toBe(true);
		expect(existsSync(join(tempDir, 'public', 'links.json'))).toBe(true);
		const data = JSON.parse(readFileSync(join(tempDir, 'src', 'data', 'tutorials.json'), 'utf-8'));
		expect(data.videos[0].jsonLd['@type']).toBe('VideoObject');
	});

	it('skips robots.txt under a sub-path and everything without a host', () => {
		scaffold({ ...config, baseUrl: 'https://x.dev/help/' }, manifest, tempDir);
		expect(existsSync(join(tempDir, 'public', 'robots.txt'))).toBe(false);
		rmSync(tempDir, { recursive: true, force: true });
		scaffold({ ...config, baseUrl: '/help/' }, manifest, tempDir);
		expect(existsSync(join(tempDir, 'public', 'sitemap.xml'))).toBe(false);
	});
});
