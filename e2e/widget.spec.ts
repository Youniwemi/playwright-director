import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

/**
 * The in-app widget, served from a fake gallery origin to a fake app origin
 * (page.route only). Needs `npm run build` (dist/client.js).
 */
const SITE = 'http://docs.test/';
const APP = 'http://app.test/';
const root = fileURLToPath(new URL('..', import.meta.url));
const widget = readFileSync(join(root, 'templates', 'site', 'public', 'widget.js'), 'utf-8');
const client = readFileSync(join(root, 'dist', 'client.js'), 'utf-8');

const payload = (lang: string) => ({
	schemaVersion: 1,
	id: lang === 'fr' ? 'look' : `look.${lang}`,
	slug: 'look',
	title: lang === 'ar' ? 'تخصيص المظهر' : 'Personnaliser l’apparence',
	duration: '0:46',
	durationSeconds: 46,
	lang,
	langs: ['ar', 'fr'],
	accent: '#16a34a',
	video: 'videos/look.webm',
	page: 'look/',
	steps: [
		{ num: 1, at: 7.3, title: 'Ouvrez l’onglet', text: 'Ouvrez l’onglet Apparence.', image: 'videos/look-step-1.webp' },
		{ at: 12, text: 'Un mot de contexte.', context: true },
		{ num: 2, at: 15.1, title: 'Choisissez le fond', text: 'Ajoutez le fond d’écran.' }
	]
});

const cors = { 'access-control-allow-origin': '*' };

async function setup(page: Page, htmlLang = 'fr') {
	await page.route(`${SITE}**`, (route) => {
		const path = new URL(route.request().url()).pathname;
		if (path === '/widget.js') return route.fulfill({ contentType: 'text/javascript', body: widget, headers: cors });
		if (path === '/client.js') return route.fulfill({ contentType: 'text/javascript', body: client, headers: cors });
		if (path === '/embed/look.json' || path === '/embed/look.fr.json') return route.fulfill({ json: payload('fr'), headers: cors });
		if (path === '/embed/look.ar.json') return route.fulfill({ json: payload('ar'), headers: cors });
		return route.fulfill({ status: 404, body: 'not found', headers: cors });
	});
	await page.route(`${APP}**`, (route) =>
		route.fulfill({
			contentType: 'text/html',
			body: `<!doctype html><html lang="${htmlLang}"><head><meta charset="utf-8"><title>App</title>
				<style>.playwright-director-widget { --pd-radius: 4px; }</style></head><body><main><h1>App</h1>
				<button data-tutorial="look">Aide</button> <button data-tutorial="nope">Inconnu</button>
				<script src="${SITE}widget.js" defer></script></main></body></html>`
		})
	);
	await page.goto(APP);
	await page.waitForFunction(() => 'PlaywrightDirector' in window);
}

test.describe('widget', () => {
	test('opens a native modal dialog, chapters seek, Esc closes and focus returns', async ({ page }) => {
		await setup(page);
		const trigger = page.getByRole('button', { name: 'Aide' });
		await trigger.click();

		const dialog = page.getByRole('dialog', { name: 'Personnaliser l’apparence' });
		await expect(dialog).toBeVisible();
		await expect(dialog.getByRole('button', { name: 'Fermer' })).toBeFocused();

		const chapters = dialog.getByRole('list', { name: 'Étapes' });
		const first = chapters.getByRole('button', { name: /^Étape 1:/ });
		await expect(first).toContainText('0:07');
		await first.click();
		await expect.poll(() => dialog.locator('video').evaluate((v: HTMLVideoElement) => v.currentTime)).toBeCloseTo(7.3, 1);

		// keyboard: ArrowDown moves to the next chapter
		await first.focus();
		await page.keyboard.press('ArrowDown');
		await expect(chapters.getByRole('button', { name: /^Étape 2:/ })).toBeFocused();

		// screenshot toggle
		const toggle = dialog.getByRole('button', { name: /Capture d’écran/ });
		await toggle.click();
		await expect(toggle).toHaveAttribute('aria-expanded', 'true');
		await expect(dialog.getByRole('img', { name: 'Ouvrez l’onglet' })).toBeVisible();

		// theming: the app's --pd-* rule wins inside the shadow root; the payload accent is the default
		const dialogStyle = await dialog.evaluate((d) => {
			const s = getComputedStyle(d);
			return { radius: s.borderTopLeftRadius, accent: s.getPropertyValue('--pd-accent').trim() };
		});
		expect(dialogStyle).toEqual({ radius: '4px', accent: '#16a34a' });

		await page.keyboard.press('Escape');
		await expect(dialog).toBeHidden();
		await expect(trigger).toBeFocused();
	});

	test('picks the tutorial and UI language from <html lang>, right-to-left for Arabic', async ({ page }) => {
		await setup(page, 'ar');
		await page.getByRole('button', { name: 'Aide' }).click();
		const dialog = page.getByRole('dialog', { name: 'تخصيص المظهر' });
		await expect(dialog).toHaveAttribute('dir', 'rtl');
		await expect(dialog.getByRole('button', { name: 'إغلاق' })).toBeVisible();
	});

	test('explains an unknown slug with the URL', async ({ page }) => {
		await setup(page);
		await page.getByRole('button', { name: 'Inconnu' }).click();
		const dialog = page.getByRole('dialog', { name: 'Tutoriel indisponible' });
		await expect(dialog.getByRole('alert')).toContainText(`${SITE}embed/nope.json answered HTTP 404`);
	});

	test('load() returns the data with no UI', async ({ page }) => {
		await setup(page);
		const data = await page.evaluate(() => (window as any).PlaywrightDirector.load('look', { lang: 'fr' }));
		expect(data.video).toBe(`${SITE}videos/look.webm`);
		expect(data.steps[0].at).toBe(7.3);
		await expect(page.getByRole('dialog')).toHaveCount(0);
	});

	test('has no axe violations (open dialog, fr and ar)', async ({ page }) => {
		for (const lang of ['fr', 'ar']) {
			await setup(page, lang);
			await page.getByRole('button', { name: 'Aide' }).click();
			await expect(page.getByRole('dialog').locator('video')).toBeVisible();
			const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
			expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
		}
	});
});
