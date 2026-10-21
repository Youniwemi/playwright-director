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
});
