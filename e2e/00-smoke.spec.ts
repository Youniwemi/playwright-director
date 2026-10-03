import { test, expect } from '@playwright/test';

/**
 * Infrastructure smoke test — no tutorial API involved.
 *
 * If this fails, the problem is the harness (browser, routing, config),
 * not the multi-scene API under development. Pages are served with
 * page.route so the suite never depends on a third-party site's markup
 * (example.com dropped its "Example Domain" heading in 2026).
 */
const probe = (name: string) =>
	`<!doctype html><html><head><title>${name}</title></head><body><h1>${name}</h1></body></html>`;

test.describe('e2e infrastructure', () => {
	test.beforeEach(async ({ page }) => {
		await page.route('http://left.test/**', (route) =>
			route.fulfill({ contentType: 'text/html', body: probe('Left origin') })
		);
		await page.route('http://right.test/**', (route) =>
			route.fulfill({ contentType: 'text/html', body: probe('Right origin') })
		);
	});

	test('the browser loads a page', async ({ page }) => {
		await page.goto('http://left.test/');
		await expect(page.getByRole('heading', { name: 'Left origin' })).toBeVisible();
	});

	test('two distinct origins can be framed side by side', async ({ page }) => {
		await page.goto('http://left.test/');
		await page.setContent(`
			<div style="display:flex;height:100vh;margin:0">
				<iframe data-probe="left"  src="http://left.test/" style="flex:1;border:0"></iframe>
				<iframe data-probe="right" src="http://right.test/" style="flex:1;border:0"></iframe>
			</div>
		`);

		// Both frames must actually render, each from its own origin.
		await expect(
			page.frameLocator('[data-probe="left"]').getByRole('heading', { name: 'Left origin' })
		).toBeVisible();
		await expect(
			page.frameLocator('[data-probe="right"]').getByRole('heading', { name: 'Right origin' })
		).toBeVisible();
	});
});
