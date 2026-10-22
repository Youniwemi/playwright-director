import { describe, it, expect } from 'vitest';
import { generateManifest, resolveLink } from '../src/site/generate-manifest.js';
import { buildEmbedTutorial } from '../src/site/embed.js';
import type { ScannedTutorial } from '../src/site/scan-tutorials.js';
import { TutorialTimeline, type TimelineData } from '../src/timeline.js';
import type { SiteConfig } from '../src/site/types.js';

const tutorial = (testName: string, extra: Partial<TimelineData> = {}, recordedAt = '2026-09-01T10:00:00.000Z'): ScannedTutorial => ({
	timeline: {
		testName,
		testTitle: testName,
		testFile: 'x.spec.ts',
		projectName: 'chromium',
		lang: 'fr',
		totalDurationMs: 30000,
		videoTrimMs: 0,
		steps: [{ step: 1, title: 'Ouvrir', text: 'Ouvrez la page.', audioFile: 'a.mp3', startMs: 1000, durationMs: 1000 }],
		videoPath: '',
		mergeCommand: '',
		...extra
	},
	videoFile: `${testName}.webm`,
	recordedAt,
	stepScreenshots: []
});

const config: SiteConfig = { title: 'Docs', input: 't', output: 'd', baseUrl: '/', lang: 'fr,en' };

describe('generateManifest sections', () => {
	it('puts configured sections first, assigns listed slugs, and orders videos by items', () => {
		const m = generateManifest(
			[tutorial('b', { feature: 'billing' }), tutorial('a', { feature: 'billing' }), tutorial('c.en', { lang: 'en' }), tutorial('z', { feature: 'misc' })],
			{
				...config,
				tutorials: {
					categories: {
						start: { label: { fr: 'Démarrage', en: 'Getting started' }, blurb: 'Les bases', items: ['c', 'a'] },
						billing: { icon: '💶', label: 'Facturation' }
					}
				}
			}
		);
		expect(Object.keys(m.categories)).toEqual(['start', 'billing', 'misc']);
		expect(m.categories.start).toEqual({ icon: '📹', label: { fr: 'Démarrage', en: 'Getting started' }, blurb: 'Les bases' });
		expect(m.videos.map((v) => [v.id, v.category])).toEqual([
			['c.en', 'start'],
			['a', 'start'],
			['b', 'billing'],
			['z', 'misc']
		]);
	});

	it('applies items, premium and dates to variant recordings of a slug', () => {
		const m = generateManifest(
			[tutorial('z', { feature: 'misc' }), tutorial('a-mobile.en', { lang: 'en', variant: 'mobile', feature: 'misc' }), tutorial('a')],
			{ ...config, tutorials: { premium: ['a'], categories: { start: { label: 'Start', items: ['a'] } } } }
		);
		expect(m.videos.map((v) => [v.id, v.category, v.premium])).toEqual([
			['a-mobile.en', 'start', true],
			['a', 'start', true],
			['z', 'misc', false]
		]);
	});

	it('flags premium slugs and carries the featured slug', () => {
		const m = generateManifest([tutorial('a'), tutorial('b')], { ...config, tutorials: { premium: ['b'], featured: 'a' } });
		expect(m.videos.map((v) => v.premium)).toEqual([false, true]);
		expect(m.featured).toBe('a');
	});

	it('carries the roles and rejects an unknown section', () => {
		const roles = { accountant: { label: { fr: 'Je suis comptable' }, sections: ['billing'] } };
		const m = generateManifest([tutorial('a', { feature: 'billing' })], { ...config, tutorials: { roles } });
		expect(m.roles).toEqual(roles);
		expect(generateManifest([tutorial('a')], config).roles).toBeUndefined();
		expect(() =>
			generateManifest([tutorial('a', { feature: 'billing' })], { ...config, tutorials: { roles: { x: { label: 'X', sections: ['nope'] } } } })
		).toThrow(/Unknown section "nope" in role "x".*billing/);
	});

	it('dates a slug from its oldest and newest recordings, across languages', () => {
		const m = generateManifest(
			[tutorial('a', {}, '2026-09-05T08:00:00Z'), tutorial('a.en', { lang: 'en' }, '2026-08-01T08:00:00Z')],
			config
		);
		for (const v of m.videos) {
			expect(v.uploadDate).toBe('2026-08-01');
			expect(v.dateModified).toBe('2026-09-05');
		}
	});

	it('falls back to the first step text for the description', () => {
		expect(generateManifest([tutorial('a')], config).videos[0].description).toBe('Ouvrez la page.');
	});
});

describe('timeline', () => {
	it('stores the links and the recording date', () => {
		const data = new TutorialTimeline('x', '', '', 'fr', '', '', {}, '', '', { app: '/invoices/new' }).getData();
		expect(data.links).toEqual({ app: '/invoices/new' });
		expect(Date.parse(data.recordedAt!)).toBeGreaterThan(0);
		expect(new TutorialTimeline('y').getData().links).toBeUndefined();
	});
});

describe('links', () => {
	it('resolves paths on the origin, with {lang}; keeps full URLs', () => {
		expect(resolveLink('/invoices/new', 'https://app.example.com/', 'fr')).toBe('https://app.example.com/invoices/new');
		expect(resolveLink('invoices/', 'https://docs.example.com/{lang}', 'en')).toBe('https://docs.example.com/en/invoices/');
		expect(resolveLink('/a', 'https://{lang}.example.com/{lang}', 'ar')).toBe('https://ar.example.com/ar/a');
		expect(resolveLink('https://x.dev/a', 'https://app.example.com', 'fr')).toBe('https://x.dev/a');
		expect(resolveLink(undefined, 'https://app.example.com', 'fr')).toBeUndefined();
	});

	it('merges the test links with the config override and puts them in the embed payload', () => {
		const m = generateManifest([tutorial('a', { links: { app: '/invoices/new', docs: '/factures/' } }), tutorial('b')], {
			...config,
			appUrl: 'https://app.example.com',
			docsUrl: 'https://docs.example.com/{lang}',
			tutorials: { links: { a: { docs: '/invoices/create/' } } }
		});
		expect(m.videos[0].links).toEqual({ app: 'https://app.example.com/invoices/new', docs: 'https://docs.example.com/fr/invoices/create/' });
		expect(m.videos[1].links).toBeUndefined();
		expect(buildEmbedTutorial(m.videos[0], config).links).toEqual(m.videos[0].links);
	});

	it('defaults the widget accent to the theme primary, a config primary wins', () => {
		const v = generateManifest([tutorial('a')], config).videos[0];
		expect(buildEmbedTutorial(v, config).accent).toBe('oklch(42% 0.09 165)');
		expect(buildEmbedTutorial(v, { ...config, theme: 'classic' }).accent).toBe('#4f46e5');
		expect(buildEmbedTutorial(v, { ...config, tokens: { primary: '#0b5d47' } }).accent).toBe('#0b5d47');
	});
});
