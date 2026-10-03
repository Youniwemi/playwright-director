import { test, expect } from '@playwright/test';
import { Tutorial } from '../src/index.js';

/**
 * Showcase for zoom(): a rich dashboard with several zooms — small and large
 * targets, with and without blur, combined with highlight and with actions
 * performed while zoomed.
 * Run with: TUTORIAL_MODE=true TUTORIAL_VOICE=false npx playwright test e2e/97-zoom.spec.ts
 */
const ORIGIN = 'http://demo.test';

const HTML = `<!doctype html>
<html><head><meta charset="utf-8"><title>Acme — Dashboard</title>
<style>
	* { box-sizing: border-box; }
	body { font: 14px/1.5 system-ui, -apple-system, sans-serif; margin: 0; color: #0f172a; background: #f1f5f9; display: flex; min-height: 100vh; }
	aside { width: 210px; background: #0f172a; color: #cbd5e1; padding: 20px 14px; flex-shrink: 0; }
	aside .logo { color: #fff; font-weight: 800; font-size: 18px; margin: 0 8px 24px; }
	aside a { display: flex; gap: 10px; align-items: center; padding: 9px 10px; border-radius: 8px; color: inherit; text-decoration: none; margin-bottom: 2px; }
	aside a.active { background: #1e293b; color: #fff; }
	aside .badge { margin-left: auto; background: #f43f5e; color: #fff; border-radius: 999px; font-size: 11px; padding: 0 7px; font-weight: 700; }
	main { flex: 1; padding: 22px 28px; min-width: 0; }
	header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; }
	header h1 { font-size: 22px; margin: 0; }
	.search { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 7px 12px; width: 240px; color: #94a3b8; }
	.kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 16px; }
	.kpi { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 16px; }
	.kpi .label { color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: .04em; }
	.kpi .value { font-size: 24px; font-weight: 800; margin: 2px 0; }
	.up { color: #059669; font-weight: 600; font-size: 12px; } .down { color: #e11d48; font-weight: 600; font-size: 12px; }
	.row { display: grid; grid-template-columns: 1.6fr 1fr; gap: 14px; }
	.panel { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 16px; }
	.panel h2 { font-size: 14px; margin: 0 0 10px; }
	.bars { display: flex; align-items: flex-end; gap: 10px; height: 120px; padding-top: 6px; }
	.bars div { flex: 1; background: #c7d2fe; border-radius: 6px 6px 0 0; position: relative; }
	.bars div.peak { background: #6366f1; }
	.bars span { position: absolute; bottom: -18px; left: 0; right: 0; text-align: center; font-size: 11px; color: #64748b; }
	table { width: 100%; border-collapse: collapse; margin-top: 4px; }
	td, th { text-align: left; padding: 6px 4px; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
	th { color: #64748b; font-weight: 600; font-size: 12px; }
	.pill { border-radius: 999px; padding: 1px 8px; font-size: 11px; font-weight: 700; }
	.paid { background: #d1fae5; color: #065f46; } .late { background: #ffe4e6; color: #9f1239; } .draft { background: #e2e8f0; color: #334155; }
	.settings label { display: flex; justify-content: space-between; align-items: center; padding: 7px 0; border-bottom: 1px solid #f1f5f9; }
	.switch { width: 38px; height: 22px; border-radius: 999px; background: #cbd5e1; position: relative; border: 0; cursor: pointer; transition: background .2s; }
	.switch::after { content: ''; position: absolute; top: 3px; left: 3px; width: 16px; height: 16px; border-radius: 50%; background: #fff; transition: left .2s; }
	.switch[aria-checked=true] { background: #6366f1; } .switch[aria-checked=true]::after { left: 19px; }
	input { font: inherit; border: 1px solid #cbd5e1; border-radius: 6px; padding: 5px 8px; width: 150px; }
	.btn { font: inherit; font-weight: 600; background: #6366f1; color: #fff; border: 0; border-radius: 8px; padding: 8px 14px; cursor: pointer; margin-top: 10px; }
	.toast { position: fixed; bottom: 18px; right: 18px; background: #0f172a; color: #fff; padding: 10px 16px; border-radius: 10px; display: none; }
</style></head>
<body>
	<aside>
		<div class="logo">◆ Acme</div>
		<a class="active" href="#">📊 Dashboard</a>
		<a href="#">🧾 Invoices <span class="badge" id="late-badge">3</span></a>
		<a href="#">👥 Customers</a>
		<a href="#">📦 Products</a>
		<a href="#" id="nav-settings">⚙️ Settings</a>
	</aside>
	<main>
		<header><h1>Good morning, Sara</h1><div class="search">🔍 Search…</div></header>
		<section class="kpis">
			<div class="kpi" id="kpi-revenue"><div class="label">Revenue</div><div class="value">$48,250</div><span class="up">▲ 12.4% vs last month</span></div>
			<div class="kpi"><div class="label">Invoices sent</div><div class="value">126</div><span class="up">▲ 8</span></div>
			<div class="kpi" id="kpi-overdue"><div class="label">Overdue</div><div class="value">$3,120</div><span class="down">▼ 3 invoices late</span></div>
			<div class="kpi"><div class="label">Customers</div><div class="value">58</div><span class="up">▲ 4 new</span></div>
		</section>
		<div class="row">
			<div class="panel" id="chart">
				<h2>Monthly revenue</h2>
				<div class="bars">
					<div style="height:45%"><span>May</span></div><div style="height:55%"><span>Jun</span></div>
					<div style="height:50%"><span>Jul</span></div><div style="height:68%"><span>Aug</span></div>
					<div style="height:74%"><span>Sep</span></div><div class="peak" style="height:95%"><span>Oct</span></div>
				</div>
				<div style="height:18px"></div>
				<table id="invoices">
					<tr><th>Invoice</th><th>Customer</th><th>Amount</th><th>Status</th></tr>
					<tr><td>#1042</td><td>Globex</td><td>$1,200</td><td><span class="pill paid">Paid</span></td></tr>
					<tr id="late-row"><td>#1041</td><td>Initech</td><td>$2,340</td><td><span class="pill late">Late</span></td></tr>
					<tr><td>#1040</td><td>Umbrella</td><td>$780</td><td><span class="pill draft">Draft</span></td></tr>
				</table>
			</div>
			<div class="panel settings" id="settings">
				<h2>Reminders</h2>
				<label>Email late customers <button class="switch" id="auto-remind" role="switch" aria-checked="false"></button></label>
				<label>Weekly summary <button class="switch" role="switch" aria-checked="true"></button></label>
				<label>Remind after <input id="days" value="7 days"></label>
				<label>Copy to <input id="cc" placeholder="finance@acme.com"></label>
				<button class="btn" id="save">Save reminders</button>
			</div>
		</div>
	</main>
	<div class="toast" id="toast">✓ Reminders saved</div>
	<script>
		document.querySelectorAll('.switch').forEach((s) => s.addEventListener('click', () => {
			s.setAttribute('aria-checked', String(s.getAttribute('aria-checked') !== 'true'));
		}));
		document.querySelector('#save').addEventListener('click', () => {
			document.querySelector('#toast').style.display = 'block';
		});
	</script>
</body></html>`;

test.describe('zoom', () => {
	test.slow();

	test('zoom showcase on a dashboard', { tag: '@tutorial' }, async ({ page }) => {
		const testTitle = 'zoom showcase on a dashboard';

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
			scenes: { app: { label: 'Acme — Dashboard', baseUrl: ORIGIN } },
			focus: 'app'
		});

		const app = tutorial.scene('app');

		await tutorial.stage();
		await tutorial.goto('app', '/');

		tutorial.context('Point the camera at what matters', {
			style: 'goal',
			text: 'zoom() pushes in on any element — a badge, a card, a whole panel — with or without blurring the rest.'
		});

		tutorial.step('Revenue is up this month', async () => {
			await tutorial.zoom(app.locator('#kpi-revenue'));
		}, { explain: 'A plain zoom on a KPI card: no blur, the scale fits the card automatically.' });

		tutorial.step('October is the best month so far', async () => {
			await tutorial.zoom(app.locator('#chart .bars'), { blur: true, duration: 2000 });
		}, { explain: 'Zoom on the chart with the rest of the page blurred.' });

		tutorial.step('One invoice is late', async () => {
			await tutorial.highlight(app.locator('#late-row'), 1000);
			await tutorial.zoom(app.locator('#late-row'), { blur: 8, duration: 1800 });
			await tutorial.unhighlight(app.locator('#late-row'));
		}, { explain: 'Highlight first, then a strong blur so the row is all you see.' });

		tutorial.step('The sidebar counts late invoices too', async () => {
			await tutorial.zoom(app.locator('#late-badge'), { scale: 2, transition: 450 });
		}, { explain: 'A tiny badge, a fixed 2× zoom and a faster transition.' });

		tutorial.step('Turn on automatic reminders', async () => {
			await tutorial.zoomIn(app.locator('#settings'), { blur: true });
			await tutorial.click(app.locator('#auto-remind'));
			await tutorial.typeSlowly(app.locator('#cc'), 'finance@acme.com');
			await tutorial.zoomOut();
		}, { explain: 'zoomIn keeps the camera on the panel while we click and type, then zoomOut.' });

		tutorial.step('Save', async () => {
			await tutorial.highlight(app.locator('#save'), 600);
			await tutorial.zoomIn(app.locator('#save'), { scale: 2.2, transition: 400 });
			await tutorial.click(app.locator('#save'));
			await tutorial.zoomOut();
		}, { explain: 'Highlight, zoom on the button, click it while zoomed.' });

		await tutorial.complete('The zoom is just another action in your step.');

		await expect(app.locator('#auto-remind')).toHaveAttribute('aria-checked', 'true');
		await expect(app.locator('#cc')).toHaveValue('finance@acme.com');
		await expect(app.locator('#toast')).toBeVisible();
		// The zoom leaves nothing behind.
		expect(await page.evaluate(() => document.documentElement.style.transform)).toBe('');
		expect(await page.locator('#tutorial-zoom-layer').count()).toBe(0);
	});
});
