import { describe, it, expect, vi, afterEach } from 'vitest';
import { deepMerge, applyTarget, globMatch, isPublished } from '../src/site/targets.js';
import { generateManifest } from '../src/site/generate-manifest.js';
import { buildEmbedFiles } from '../src/site/embed.js';
import { ownedBy } from '../src/site/scaffold.js';
import type { ScannedTutorial } from '../src/site/scan-tutorials.js';
import type { TimelineData } from '../src/timeline.js';
import type { SiteConfig } from '../src/site/types.js';

const tutorial = (testName: string, extra: Partial<TimelineData> = {}): ScannedTutorial => ({
	timeline: {
		testName,
		testTitle: testName.replace(/(-mobile)?(\.[a-z]{2})?$/, ''),
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
	recordedAt: '2026-09-01T10:00:00.000Z',
	stepScreenshots: []
});

/** a, b (general) and admin-x (admin), each in fr + en + mobile */
const fixture = () =>
	['a', 'b', 'admin-x'].flatMap((slug) => {
		const feature = slug === 'admin-x' ? 'admin' : 'general';
		return [
			tutorial(slug, { feature }),
			tutorial(`${slug}.en`, { feature, lang: 'en' }),
			tutorial(`${slug}-mobile`, { feature, variant: 'mobile' })
		];
	});

const config: SiteConfig = {
	title: 'Docs',
	input: 't',
	output: 'd',
	baseUrl: '/',
	lang: 'fr,en',
	tutorials: { categories: { general: { label: 'Général' }, admin: { label: 'Admin' } } }
};
const withTutorials = (tutorials: SiteConfig['tutorials']): SiteConfig => ({ ...config, tutorials: { ...config.tutorials, ...tutorials } });

afterEach(() => vi.restoreAllMocks());

describe('deepMerge', () => {
	it('merges objects, replaces arrays and values, deletes on null', () => {
		const base = { title: 'A', lang: 'fr', tutorials: { premium: ['x', 'y'], categories: { general: { label: 'G' }, admin: { label: 'A' } } } };
		const merged = deepMerge(base, { title: 'B', tutorials: { premium: ['z'], categories: { admin: null, general: { icon: '⭐' } } } });
		expect(merged).toEqual({ title: 'B', lang: 'fr', tutorials: { premium: ['z'], categories: { general: { label: 'G', icon: '⭐' } } } });
		expect(base.tutorials.categories.admin).toEqual({ label: 'A' }); // base untouched
	});
});

describe('applyTarget', () => {
	const withTargets: SiteConfig = { ...config, targets: { public: { output: 'dist-public/', tutorials: { exclude: { categories: ['admin'] } } } } };

	it('merges the named target and drops `targets`', () => {
		const c = applyTarget(withTargets, 'public');
		expect(c.output).toBe('dist-public/');
		expect(c.tutorials?.exclude).toEqual({ categories: ['admin'] });
		expect(c.tutorials?.categories).toEqual(config.tutorials!.categories);
		expect('targets' in c).toBe(false);
	});

	it('leaves the main config unchanged without a target', () => {
		expect(applyTarget(withTargets)).toEqual(config);
	});

	it('fails on an unknown target and lists the known ones', () => {
		expect(() => applyTarget(withTargets, 'nope')).toThrow(/Unknown target "nope". Targets: public/);
		expect(() => applyTarget(config, 'nope')).toThrow(/Unknown target "nope". Targets: none/);
	});
});

describe('slug and category matching', () => {
	it('matches globs on the whole slug', () => {
		expect(globMatch('admin-x', 'admin-*')).toBe(true);
		expect(globMatch('x-admin', 'admin-*')).toBe(false);
		expect(globMatch('a.b', 'a?b')).toBe(true);
		expect(globMatch('axb', 'a.b')).toBe(false);
	});

	it('publishes include matches minus exclude matches', () => {
		expect(isPublished(undefined, 'a', 'general')).toBe(true);
		expect(isPublished({ exclude: { slugs: ['admin-*'] } }, 'admin-x', 'general')).toBe(false);
		expect(isPublished({ exclude: { categories: ['admin'] } }, 'x', 'admin')).toBe(false);
		expect(isPublished({ include: { categories: ['general'] } }, 'x', 'admin')).toBe(false);
		expect(isPublished({ include: { categories: ['general'], slugs: ['x'] } }, 'x', 'admin')).toBe(true);
		expect(isPublished({ include: { slugs: ['*'] }, exclude: { slugs: ['x'] } }, 'x', 'general')).toBe(false);
	});
});

describe('generateManifest include / exclude', () => {
	const published = (c: SiteConfig) => generateManifest(fixture(), c).videos.map((v) => v.id);
	const withoutAdmin = ['a', 'a.en', 'a-mobile', 'b', 'b.en', 'b-mobile'];

	it.each([
		['slug only', { slugs: ['admin-*'] }],
		['category only', { categories: ['admin'] }],
		['both', { categories: ['admin'], slugs: ['b'] }]
	])('drops every language and variant (%s)', (name, exclude) => {
		const ids = published(withTutorials({ exclude }));
		expect(ids).toEqual(name === 'both' ? ['a', 'a.en', 'a-mobile'] : withoutAdmin);
	});

	it('leaves no trace in the embed files and hides the emptied section', () => {
		const c = withTutorials({ exclude: { categories: ['admin'] } });
		const m = generateManifest(fixture(), c);
		expect(Object.keys(m.categories)).toEqual(['general']);
		const files = buildEmbedFiles(m, c);
		expect(JSON.stringify(files)).not.toContain('admin-x');
		const index = files.find((f) => f.path === 'embed/index.json')!.data as { tutorials: { slug: string }[] };
		expect(index.tutorials.map((t) => t.slug)).toEqual(['a', 'a-mobile', 'b', 'b-mobile']);
	});

	it('keeps only the included sections', () => {
		expect(published(withTutorials({ include: { categories: ['admin'] } }))).toEqual(['admin-x', 'admin-x.en', 'admin-x-mobile']);
	});

	it('falls back to the first published tutorial when the featured one is excluded, and warns', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const m = generateManifest(fixture(), withTutorials({ featured: 'admin-x', exclude: { slugs: ['admin-*'] } }));
		expect(m.featured).toBe('a');
		expect(warn).toHaveBeenCalledWith(expect.stringMatching(/Featured tutorial "admin-x" is excluded/));
	});

	it('warns, without failing, on excluded items and premium slugs', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const m = generateManifest(
			fixture(),
			withTutorials({
				premium: ['admin-x'],
				categories: { general: { label: 'G', items: ['admin-x', 'b'] } },
				exclude: { slugs: ['admin-x'] }
			})
		);
		expect(m.videos.map((v) => v.id)).toEqual(['b', 'b.en', 'b-mobile', 'a', 'a.en', 'a-mobile']);
		expect(warn.mock.calls.map((c) => c[0]).join('\n')).toMatch(/items but excluded[\s\S]*premium but excluded/);
	});

	it('warns when a published tutorial has a category the config does not list', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		// Removing the section from the config is not an exclusion: its tutorials still ship.
		const m = generateManifest(fixture(), { ...config, tutorials: { categories: { general: { label: 'G' } } } });
		expect(m.videos.some((v) => v.id === 'admin-x')).toBe(true);
		expect(warn).toHaveBeenCalledWith(expect.stringMatching(/Category "admin" is not in tutorials.categories.*exclude.categories/));
	});

	it('hides a section with no tutorial and a role left with no visible section', () => {
		const roles = { admins: { label: 'Admins', sections: ['admin'] }, all: { label: 'All', sections: ['general', 'admin'] } };
		const m = generateManifest(
			fixture(),
			withTutorials({ roles, categories: { ...config.tutorials!.categories, empty: { label: 'Rien' } }, exclude: { categories: ['admin'] } })
		);
		expect(Object.keys(m.categories)).toEqual(['general']);
		expect(m.roles).toEqual({ all: { label: 'All', sections: ['general'] } });
		const none = generateManifest(fixture(), withTutorials({ roles: { admins: roles.admins }, exclude: { categories: ['admin'] } }));
		expect(none.roles).toBeUndefined();
	});

	it('fails when nothing is left to publish', () => {
		expect(() => generateManifest(fixture(), withTutorials({ exclude: { slugs: ['*'] } }))).toThrow(/Nothing to publish/);
	});
});

describe('ownedBy (videos copied to the site)', () => {
	it('matches the video, poster and step screenshots of the ids only', () => {
		const owned = ownedBy(['a', 'a.en']);
		for (const f of ['a.webm', 'a.en.webm', 'a-poster.webp', 'a.en-step-3.png']) expect(owned(f)).toBe(true);
		for (const f of ['admin-x.webm', 'a-mobile.webm', 'a-mobile-poster.webp', 'ab.webm', 'a.fr.webm']) expect(owned(f)).toBe(false);
	});
});
