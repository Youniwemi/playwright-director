import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { generateManifest } from '../src/site/generate-manifest.js';
import { buildEmbedFiles } from '../src/site/embed.js';
import { scanTutorials } from '../src/site/scan-tutorials.js';
import type { SiteConfig } from '../src/site/types.js';

const mockPage = () => ({ evaluate: vi.fn(), goto: vi.fn(), mouse: { move: vi.fn() } });

describe('TUTORIAL_LANG', () => {
	beforeEach(() => {
		vi.resetModules();
		delete process.env.TUTORIAL_LANG;
		delete process.env.TUTORIAL_VARIANT;
	});
	afterEach(() => {
		delete process.env.TUTORIAL_LANG;
		delete process.env.TUTORIAL_VARIANT;
	});

	it('overrides the lang option and suffixes testName with .<lang>, after the variant', async () => {
		process.env.TUTORIAL_LANG = 'ar';
		process.env.TUTORIAL_VARIANT = 'mobile';
		const { Tutorial } = await import('../src/Tutorial');
		const t = new Tutorial(mockPage() as any, { title: 'T', testName: 'look', lang: 'fr' });
		expect(t.lang).toBe('ar');
		expect((t as any).testName).toBe('look-mobile.ar');
	});

	it('keeps the lang option and the plain name without the env', async () => {
		const { Tutorial } = await import('../src/Tutorial');
		const t = new Tutorial(mockPage() as any, { title: 'T', testName: 'look', lang: 'fr' });
		expect(t.lang).toBe('fr');
		expect((t as any).testName).toBe('look');
	});
});

describe('site: one tutorial in several languages', () => {
	const dir = mkdtempSync(join(tmpdir(), 'pd-lang-'));
	const config: SiteConfig = { title: 'T', primaryColor: '#000', font: 'x', input: dir, output: 'dist', baseUrl: '/', lang: 'fr' };

	const write = (name: string, lang: string) => {
		writeFileSync(join(dir, 'videos', `${name}.webm`), '');
		writeFileSync(
			join(dir, 'output', `${name}_timeline.json`),
			JSON.stringify({ testName: name, testTitle: 'look', title: `Look ${lang}`, lang, totalDurationMs: 1000, steps: [] })
		);
	};

	it('groups languages by slug, writes embed/<slug>.<lang>.json and the default under embed/<slug>.json', () => {
		rmSync(dir, { recursive: true, force: true });
		for (const sub of ['videos', 'output']) mkdirSync(join(dir, sub), { recursive: true });
		write('look', 'fr');
		write('look.en', 'en');
		write('look.ar', 'ar');
		write('pair.en', 'en'); // no default-language recording

		const manifest = generateManifest(scanTutorials(dir), config);
		const look = manifest.videos.find((v) => v.id === 'look.ar')!;
		expect(look.slug).toBe('look');
		expect(look.lang).toBe('ar');
		expect(look.langs).toEqual(['ar', 'en', 'fr']);

		const files = buildEmbedFiles(manifest, config);
		const paths = files.map((f) => f.path).sort();
		expect(paths).toEqual([
			'embed/index.json',
			'embed/look.ar.json',
			'embed/look.en.json',
			'embed/look.fr.json',
			'embed/look.json',
			'embed/pair.en.json',
			'embed/pair.json'
		]);
		const byPath = Object.fromEntries(files.map((f) => [f.path, f.data as any]));
		expect(byPath['embed/look.json'].lang).toBe('fr');
		expect(byPath['embed/look.json'].slug).toBe('look');
		expect(byPath['embed/pair.json'].lang).toBe('en'); // falls back to the only language
		expect(byPath['embed/index.json'].defaultLang).toBe('fr');
		// the index lists each slug once, in the default language when it exists
		expect(byPath['embed/index.json'].tutorials.map((t: any) => [t.id, t.slug, t.lang, t.langs])).toEqual([
			['look', 'look', 'fr', ['ar', 'en', 'fr']],
			['pair.en', 'pair', 'en', ['en']]
		]);
		rmSync(dir, { recursive: true, force: true });
	});
});

describe('Arabic voice', () => {
	it('uses the macOS voice that exists today (Majed)', () => {
		expect(readFileSync(join(__dirname, '..', 'src', 'tts-provider.ts'), 'utf-8')).toContain("ar: 'Majed'");
	});
});
