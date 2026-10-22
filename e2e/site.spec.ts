import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { createServer, type Server } from 'http';
import { execFileSync } from 'child_process';
import { copyFileSync, createReadStream, existsSync, mkdirSync, mkdtempSync, rmSync, statSync, writeFileSync } from 'fs';
import { extname, join } from 'path';
import { tmpdir } from 'os';
import { buildSite } from '../src/site/build-site.js';

/**
 * The built gallery, both themes, fr + ar: layout at phone and desktop width, search,
 * chapter seeking (+ `?t=`), axe. Builds two sites from a generated 12 s video (needs ffmpeg).
 */
const THEMES = ['academy', 'classic'] as const;
let root: string;
const servers: Server[] = [];
const origins: Record<string, string> = {};

const TYPES: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webm': 'video/webm', '.webp': 'image/webp', '.xml': 'application/xml' };

/** Static server with Range support: the video page seeks only on a host that answers Range requests */
function serve(dir: string): Promise<string> {
	const server = createServer((req, res) => {
		let file = join(dir, decodeURIComponent(new URL(req.url!, 'http://x').pathname));
		if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
		if (!existsSync(file)) return res.writeHead(404).end();
		const size = statSync(file).size;
		const headers = { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream', 'accept-ranges': 'bytes' };
		const range = /bytes=(\d*)-(\d*)/.exec(req.headers.range ?? '');
		if (!range) return createReadStream(file).pipe(res.writeHead(200, { ...headers, 'content-length': size }));
		const start = Number(range[1] || 0);
		const end = range[2] ? Number(range[2]) : size - 1;
		createReadStream(file, { start, end }).pipe(
			res.writeHead(206, { ...headers, 'content-range': `bytes ${start}-${end}/${size}`, 'content-length': end - start + 1 })
		);
	});
	servers.push(server);
	return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(`http://127.0.0.1:${(server.address() as { port: number }).port}/`)));
}

test.beforeAll(async () => {
	test.setTimeout(240_000);
	root = mkdtempSync(join(tmpdir(), 'pd-site-e2e-'));
	const videos = join(root, 'videos');
	const timelines = join(root, 'timelines');
	mkdirSync(videos, { recursive: true });
	mkdirSync(timelines, { recursive: true });
	execFileSync('ffmpeg', ['-loglevel', 'error', '-f', 'lavfi', '-i', 'testsrc=size=320x180:rate=10', '-t', '12', '-c:v', 'libvpx', '-b:v', '100k', '-y', join(videos, 'look.fr.webm')]);
	const texts = {
		fr: { title: 'Personnaliser l’apparence', steps: ['Ouvrez l’onglet', 'Choisissez le fond'] },
		ar: { title: 'تخصيص المظهر', steps: ['افتح التبويب', 'اختر الخلفية'] }
	};
	for (const [lang, t] of Object.entries(texts)) {
		if (lang !== 'fr') copyFileSync(join(videos, 'look.fr.webm'), join(videos, `look.${lang}.webm`));
		// A second tutorial in another section, for the role chips
		copyFileSync(join(videos, 'look.fr.webm'), join(videos, `pay.${lang}.webm`));
		writeFileSync(
			join(timelines, `pay.${lang}_timeline.json`),
			JSON.stringify({ testName: `pay.${lang}`, testTitle: 'pay', title: 'Paie', feature: 'payroll', lang, totalDurationMs: 12000, steps: [] })
		);
		writeFileSync(
			join(timelines, `look.${lang}_timeline.json`),
			JSON.stringify({
				testName: `look.${lang}`,
				testTitle: 'look',
				title: t.title,
				feature: 'settings',
				lang,
				totalDurationMs: 12000,
				steps: t.steps.map((title, i) => ({ step: i + 1, title, text: `${title}.`, startMs: i * 6000, durationMs: 0, audioFile: '' }))
			})
		);
	}
	for (const theme of THEMES) {
		const output = join(root, theme);
		// .mjs: Playwright's loader turns a .js config outside a "type": "module" package into CommonJS
		const configPath = join(root, `${theme}.config.mjs`);
		writeFileSync(configPath, `export default ${JSON.stringify({ title: 'Aide', theme, input: root, timelines, videos, output, lang: 'fr,ar,en', baseUrl: '/', tutorials: { paths: { pay: { en: 'payroll' } }, roles: { payroll: { label: { fr: 'Je gère la paie', ar: 'أدير الأجور' }, sections: ['payroll'] } } } })};`);
		await buildSite(configPath);
		origins[theme] = await serve(output);
	}
});

test.afterAll(() => {
	for (const s of servers) s.close();
	rmSync(root, { recursive: true, force: true });
});

for (const theme of THEMES) {
	test.describe(`${theme} site`, () => {
		for (const width of [375, 1280]) {
			test(`no horizontal overflow at ${width}px (fr + ar, home + video page)`, async ({ page }) => {
				await page.setViewportSize({ width, height: 800 });
				for (const path of ['', 'ar/', 'look.fr/', 'look.ar/']) {
					await page.goto(origins[theme] + path);
					expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), path || 'home').toBeLessThanOrEqual(0);
				}
			});
		}

		test('a chapter button seeks the video and marks its step; ?t= starts there', async ({ page }) => {
			await page.goto(origins[theme] + 'look.fr/');
			const video = page.locator('#tutorial-video');
			await video.evaluate((v: HTMLVideoElement) => new Promise((r) => (v.readyState ? r(null) : v.addEventListener('loadedmetadata', r))));
			await page.locator('.step-time').nth(1).click();
			await expect.poll(() => video.evaluate((v: HTMLVideoElement) => Math.floor(v.currentTime))).toBeGreaterThanOrEqual(6);
			await expect(page.locator('[data-at="6"][aria-current="step"]')).toHaveCount(1);

			await page.goto(origins[theme] + 'look.fr/?t=6');
			await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThanOrEqual(6);
		});

		test('a config language without recordings gets its home and fallback pages (UI in that language, fr video)', async ({ page }) => {
			await page.goto(origins[theme] + 'en/');
			await expect(page.locator('html')).toHaveAttribute('lang', 'en');
			await expect(page.locator(`a[hreflang="en"][href="/en/"]`)).toHaveCount(1); // language switcher
			await page.goto(origins[theme] + 'en/payroll/');
			await expect(page.locator('html')).toHaveAttribute('lang', 'en');
			await expect(page.locator('.video-lang-note')).toHaveText('This video is in French.');
			await expect(page.locator('h1[lang="fr"]')).toHaveText('Paie');
			for (const href of ['/pay.fr/', '/pay.ar/', '/en/payroll/']) await expect(page.locator(`nav a[href="${href}"]`).first()).toBeAttached();
		});

		for (const [lang, path, video] of [['fr', '', 'look.fr/'], ['ar', 'ar/', 'look.ar/'], ['en', 'en/', 'en/look/']]) {
			test(`axe: no violations on the ${lang} home and video page`, async ({ page }) => {
				// Off-screen cards sit at 25% opacity until the scroll-linked rise plays; reduced motion turns it off
				await page.emulateMedia({ reducedMotion: 'reduce' });
				for (const p of [path, video]) {
					await page.goto(origins[theme] + p);
					expect(await page.locator('html').getAttribute('dir')).toBe(lang === 'ar' ? 'rtl' : 'ltr');
					const { violations } = await new AxeBuilder({ page }).analyze();
					expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(' | ')}`), p || 'home').toEqual([]);
				}
			});
		}
	});
}

test('academy search filters the cards and shows the empty state', async ({ page }) => {
	await page.goto(origins.academy);
	const search = page.locator('#ac-search-input');
	await search.fill('apparence');
	await expect(page.locator('.ac-card:visible')).toHaveCount(1);
	await search.fill('zzz');
	await expect(page.locator('.ac-card:visible')).toHaveCount(0);
	await expect(page.locator('.ac-empty')).toBeVisible();
	await expect(page.locator('.ac-empty')).toContainText('zzz');
});

test('academy role chips show only their sections, "All" resets', async ({ page }) => {
	await page.goto(origins.academy);
	const chip = page.getByRole('button', { name: 'Je gère la paie' });
	await chip.click();
	await expect(chip).toHaveAttribute('aria-pressed', 'true');
	await expect(page.locator('.ac-card:visible')).toHaveCount(1);
	await expect(page.locator('#settings')).toBeHidden();
	await expect(page.locator('.ac-toc li:visible')).toHaveCount(1);
	await page.getByRole('button', { name: 'Tous' }).click();
	await expect(page.locator('.ac-card:visible')).toHaveCount(2);
});
