import { describe, it, expect, afterAll } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, lstatSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { buildSite, linkAstro, matchesOnly } from '../src/site/build-site.js';

describe('matchesOnly (--only)', () => {
	it('keeps every language and variant of a slug, nothing else', () => {
		for (const id of ['look', 'look.en', 'look-mobile.ar']) expect(matchesOnly(id, ['look'])).toBe(true);
		expect(matchesOnly('lookup', ['look'])).toBe(false);
		expect(matchesOnly('other', ['look', 'x'])).toBe(false);
		expect(matchesOnly('x.fr', ['look', 'x'])).toBe(true);
	});
});

// The project lives in the OS temp dir: no node_modules on the way up, so the
// build only works if astro comes from playwright-director itself (item: monorepo / bun isolated linker).
const project = mkdtempSync(join(tmpdir(), 'pd-build-site-'));
afterAll(() => rmSync(project, { recursive: true, force: true }));

describe('linkAstro', () => {
	it('links the package astro into the build dir and returns its CLI', () => {
		const dir = join(project, 'link');
		const bin = linkAstro(dir);
		expect(lstatSync(join(dir, 'node_modules', 'astro')).isSymbolicLink()).toBe(true);
		expect(existsSync(bin)).toBe(true);
	});
});

describe('buildSite', () => {
	it('builds with no astro in the consuming project, from custom timelines/videos dirs', async () => {
		const videos = join(project, 'e2e', 'videos');
		const timelines = join(project, 'e2e', 'timelines');
		mkdirSync(videos, { recursive: true });
		mkdirSync(timelines, { recursive: true });
		writeFileSync(join(videos, 'demo.webm'), Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
		writeFileSync(
			join(timelines, 'demo_timeline.json'),
			JSON.stringify({ testName: 'demo', testTitle: 'Demo', title: 'Demo', lang: 'en', totalDurationMs: 5000, steps: [] })
		);
		const configPath = join(project, 'tutorial-site.config.js');
		writeFileSync(
			configPath,
			`export default ${JSON.stringify({ title: 'T', input: join(project, 'nowhere'), timelines, videos, output: join(project, 'dist'), lang: 'en' })};`
		);

		await buildSite(configPath);

		expect(existsSync(join(project, 'dist', 'index.html'))).toBe(true);
		expect(existsSync(join(project, 'dist', '.astro-build'))).toBe(false);
		expect(JSON.parse(readFileSync(join(project, 'dist', 'embed', 'demo.json'), 'utf-8')).title).toBe('Demo');
	}, 180_000);

	// Both themes, a full baseUrl, two languages and a docs link: the built HTML carries the SEO tags
	describe.each(['academy', 'classic'])('%s theme with a full baseUrl', (theme) => {
		const root = join(project, theme);
		const dist = join(root, 'dist');
		const page = (path: string) => readFileSync(join(dist, path, 'index.html'), 'utf-8');

		it('builds home + video pages with canonical, hreflang, JSON-LD, sitemap, links.json and the theme switcher', async () => {
			const videos = join(root, 'videos');
			const timelines = join(root, 'timelines');
			mkdirSync(videos, { recursive: true });
			mkdirSync(timelines, { recursive: true });
			for (const lang of ['en', 'fr']) {
				writeFileSync(join(videos, `demo.${lang}.webm`), Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
				writeFileSync(
					join(timelines, `demo.${lang}_timeline.json`),
					JSON.stringify({
						testName: `demo.${lang}`,
						testTitle: 'Demo',
						title: `Demo ${lang}`,
						lang,
						totalDurationMs: 9000,
						links: { docs: '/guide/' },
						steps: [
							{ step: 1, title: 'Open', text: 'Open. The list', startMs: 0, durationMs: 0, audioFile: '' },
							{ step: 2, title: 'Save', text: 'Save. Done', startMs: 4000, durationMs: 0, audioFile: '' }
						]
					})
				);
			}
			const configPath = join(root, 'tutorial-site.config.js');
			writeFileSync(
				configPath,
				`export default ${JSON.stringify({
					title: 'T',
					theme,
					input: join(root, 'nowhere'),
					timelines,
					videos,
					output: dist,
					lang: 'en,fr',
					baseUrl: 'https://help.example.com/',
					docsUrl: 'https://docs.example.com/{lang}',
					themeSwitcher: { A: '/', B: '/classic/' }
				})};`
			);

			await buildSite(configPath);

			const video = page('demo.en');
			expect(video).toContain('<link rel="canonical" href="https://help.example.com/demo.en/">');
			expect(video).toContain('hreflang="fr" href="https://help.example.com/demo.fr/"');
			expect(video).toContain('hreflang="x-default"');
			const ld = JSON.parse(video.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)![1]);
			expect(ld['@type']).toBe('VideoObject');
			expect(ld.hasPart.map((c: { name: string }) => c.name)).toEqual(['Open', 'Save']);
			expect(video).toContain('https://docs.example.com/en/guide/');
			expect(video).toMatch(/class="theme-switcher"/);
			expect(page('fr')).toContain('<html lang="fr"');

			const sitemap = readFileSync(join(dist, 'sitemap.xml'), 'utf-8');
			expect(sitemap).toContain('<loc>https://help.example.com/demo.fr/</loc>');
			expect(sitemap).toContain('hreflang="en"');
			expect(existsSync(join(dist, 'robots.txt'))).toBe(true);
			expect(JSON.parse(readFileSync(join(dist, 'links.json'), 'utf-8'))).toHaveProperty(['https://docs.example.com/en/guide/']);
		}, 180_000);
	});
});
