import { test, expect } from '@playwright/test';
import { Tutorial } from '../src/index.js';

test.describe('overlay position', () => {
	test.skip(process.env.TUTORIAL_MODE !== 'true', 'run with TUTORIAL_MODE=true');
	test.slow();

	const positions = ['TL', 'TR', 'BL', 'BR'] as const;

	for (const pos of positions) {
		test(`overlay at ${pos}`, { tag: '@tutorial' }, async ({ page }) => {
			await page.goto('about:blank');
			await page.setContent(`<html><body style="margin:0;padding:48px"><h1>Position ${pos}</h1><p>Testing overlay placement</p></body></html>`);

			const tutorial = new Tutorial(page, {
				title: `Overlay ${pos}`,
				// Stable slug: gallery page + widget embed URLs survive re-recordings
				testName: `overlay-${pos.toLowerCase()}`,
				testTitle: `overlay at ${pos}`,
				testFile: 'overlay-position.spec.ts',
				projectName: 'chromium',
				lang: 'en',
				backgroundMusic: '',
				overlayPosition: pos
			});

			tutorial.step('First step', async () => {
				await expect(page.locator('h1')).toBeVisible();
			});

			tutorial.step('Second step', async () => {
				const overlay = page.locator('#tutorial-overlay');
				const box = await overlay.boundingBox();
				expect(box).toBeTruthy();

				const viewport = page.viewportSize()!;
				if (pos.startsWith('T')) {
					expect(box!.y).toBeLessThan(viewport.height / 2);
				} else {
					expect(box!.y + box!.height).toBeGreaterThan(viewport.height / 2);
				}
				if (pos.endsWith('L')) {
					expect(box!.x).toBeLessThan(viewport.width / 2);
				} else {
					expect(box!.x + box!.width).toBeGreaterThan(viewport.width / 2);
				}
			});

			await tutorial.complete();
		});
	}

	test('--tutorial-overlay-bottom raises the bottom card', { tag: '@tutorial' }, async ({ page }) => {
		await page.goto('about:blank');
		await page.setContent('<html><body style="margin:0;padding:48px"><h1>Bottom inset</h1></body></html>');
		// Inline style on <html> beats the stylesheet whenever it is injected
		await page.evaluate(() => document.documentElement.style.setProperty('--tutorial-overlay-bottom', '108px'));

		const tutorial = new Tutorial(page, {
			title: 'Bottom inset',
			testName: 'overlay-bottom-inset',
			testTitle: '--tutorial-overlay-bottom raises the bottom card',
			testFile: 'overlay-position.spec.ts',
			projectName: 'chromium',
			lang: 'en',
			backgroundMusic: '',
			overlayPosition: 'BL'
		});

		tutorial.step('Raised card', async () => {
			const box = await page.locator('#tutorial-overlay').boundingBox();
			expect(page.viewportSize()!.height - (box!.y + box!.height)).toBeCloseTo(108, 0);
		});

		await tutorial.complete();
	});

	test('per-step position override', { tag: '@tutorial' }, async ({ page }) => {
		await page.goto('about:blank');
		await page.setContent('<html><body style="margin:0;padding:48px"><h1>Override test</h1></body></html>');

		const tutorial = new Tutorial(page, {
			title: 'Position override',
			testName: 'overlay-position-override',
			testTitle: 'per-step position override',
			testFile: 'overlay-position.spec.ts',
			projectName: 'chromium',
			lang: 'en',
			backgroundMusic: '',
			overlayPosition: 'TL'
		});

		tutorial.step('Top-left step', async () => {
			const overlay = page.locator('#tutorial-overlay');
			const box = await overlay.boundingBox();
			expect(box!.x).toBeLessThan(page.viewportSize()!.width / 2);
			expect(box!.y).toBeLessThan(page.viewportSize()!.height / 2);
		});

		tutorial.step('Bottom-right step', async () => {
			const overlay = page.locator('#tutorial-overlay');
			const box = await overlay.boundingBox();
			expect(box!.x + box!.width).toBeGreaterThan(page.viewportSize()!.width / 2);
			expect(box!.y + box!.height).toBeGreaterThan(page.viewportSize()!.height / 2);
		}, { overlayPosition: 'BR' });

		await tutorial.complete();
	});
});
