import { test, expect } from '@playwright/test';
import { Tutorial } from '../src/index.js';

/**
 * Visual experiment for zoom(): a camera push-in on a button, then on a whole
 * card with the rest of the page blurred.
 * Run with: TUTORIAL_MODE=true TUTORIAL_VOICE=false npx playwright test e2e/97-zoom.spec.ts
 */
const ORIGIN = 'http://demo.test';

const HTML = `<!doctype html>
<html><head><meta charset="utf-8"><title>Billing</title>
<style>
	body { font: 16px/1.5 system-ui, sans-serif; margin: 0; padding: 48px; background: #f8fafc; }
	h1 { font-size: 28px; margin: 0 0 24px; }
	.grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
	.card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; }
	.card h2 { margin: 0 0 8px; font-size: 18px; }
	.price { font-size: 32px; font-weight: 700; margin: 8px 0 16px; }
	button { font: inherit; padding: 8px 16px; border-radius: 8px; border: 0; background: #0f766e; color: #fff; }
</style></head>
<body>
	<h1>Choose a plan</h1>
	<div class="grid">
		<div class="card" id="starter"><h2>Starter</h2><div class="price">$9</div><p>For solo projects.</p><button>Pick Starter</button></div>
		<div class="card" id="pro"><h2>Pro</h2><div class="price">$29</div><p>For small teams, with priority support.</p><button id="pick-pro">Pick Pro</button></div>
		<div class="card" id="scale"><h2>Scale</h2><div class="price">$99</div><p>For growing companies.</p><button>Pick Scale</button></div>
	</div>
	<p id="chosen" style="margin-top:32px">No plan selected</p>
	<script>
		document.querySelector('#pick-pro').addEventListener('click', () => {
			document.querySelector('#chosen').textContent = 'Pro selected';
		});
	</script>
</body></html>`;

test.describe('zoom', () => {
	test.slow();

	test('zoom on a button and on a card', { tag: '@tutorial' }, async ({ page }) => {
		const testTitle = 'zoom on a button and on a card';

		await page.route(`${ORIGIN}/**`, (route) =>
			route.fulfill({ contentType: 'text/html', body: HTML })
		);

		const tutorial = new Tutorial(page, {
			title: 'Zooming on what matters',
			testName: 'zoom-demo',
			testTitle,
			testFile: '97-zoom.spec.ts',
			projectName: 'chromium',
			lang: 'en',
			audioBaseUrl: ORIGIN,
			backgroundMusic: '',
			scenes: { app: { label: 'Billing', baseUrl: ORIGIN } },
			focus: 'app'
		});

		const app = tutorial.scene('app');

		await tutorial.stage();
		await tutorial.goto('app', '/');

		tutorial.step('Zoom on the Pro plan — the rest of the page is blurred', async () => {
			await tutorial.zoom(app.locator('#pro'), { blur: true });
		});

		tutorial.step('Zoom on its button, then click it while zoomed', async () => {
			await tutorial.zoomIn(app.locator('#pick-pro'));
			await tutorial.click(app.locator('#pick-pro'));
			await tutorial.zoomOut();
		});

		await tutorial.complete();
		await expect(app.locator('#chosen')).toHaveText('Pro selected');
		// The zoom leaves nothing behind.
		expect(await page.evaluate(() => document.documentElement.style.transform)).toBe('');
		expect(await page.locator('#tutorial-zoom-layer').count()).toBe(0);
	});
});
