import { test, expect } from '@playwright/test';
import { Tutorial } from '../src/index.js';

/**
 * fastForward(): two waits nobody wants to watch in real time — a report
 * generation and a PDF export — are played sped up in ONE final video, at two
 * different speeds (×4 then ×8), VHS-style. The final length is checked
 * against the timeline's prediction: global-teardown.ts compares the merged
 * file's duration with it.
 * Run with: TUTORIAL_MODE=true npx playwright test e2e/96-fast-forward.spec.ts
 */
const ORIGIN = 'http://reports.test';
const GENERATION_MS = 6000;
const EXPORT_MS = 8000;
const SPEEDS = [4, 8];

const HTML = `<!doctype html>
<html><head><meta charset="utf-8"><title>Acme — Reports</title>
<style>
	* { box-sizing: border-box; }
	body { font: 15px/1.5 system-ui, -apple-system, sans-serif; margin: 0; padding: 24px 56px; color: #0f172a; background: #f8fafc; }
	h1 { font-size: 24px; margin: 0 0 6px; }
	p.lead { color: #64748b; margin: 0 0 24px; }
	.card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px 24px; max-width: 640px; }
	button { font: inherit; font-weight: 600; background: #6366f1; color: #fff; border: 0; border-radius: 8px; padding: 10px 18px; cursor: pointer; }
	button:disabled { background: #a5b4fc; cursor: progress; }
	.progress { height: 10px; background: #e2e8f0; border-radius: 999px; overflow: hidden; margin: 18px 0 8px; }
	.bar { height: 100%; width: 0; background: linear-gradient(90deg, #6366f1, #22d3ee); }
	#status { color: #64748b; font-variant-numeric: tabular-nums; }
	#log { font: 12px/1.6 ui-monospace, monospace; color: #475569; background: #f1f5f9; border-radius: 8px; padding: 10px 12px; height: 64px; overflow: hidden; margin-top: 8px; }
	#report { display: none; margin-top: 10px; }
	#report p.ok { margin: 0 0 4px; }
	#report table { width: 100%; border-collapse: collapse; }
	#report td, #report th { text-align: left; padding: 3px 4px; border-bottom: 1px solid #f1f5f9; }
	.ok { color: #059669; font-weight: 700; }
</style></head>
<body>
	<h1>Quarterly report</h1>
	<p class="lead">Crunches every invoice of the quarter — it takes a while.</p>
	<div class="card">
		<button id="generate">Generate report</button>
		<div class="progress"><div class="bar" id="bar"></div></div>
		<div id="status">Idle</div>
		<div id="log"></div>
		<div id="report">
			<p class="ok">✓ Report ready</p>
			<table>
				<tr><th>Month</th><th>Invoices</th><th>Revenue</th></tr>
				<tr><td>July</td><td>41</td><td>$14,210</td></tr>
				<tr><td>August</td><td>39</td><td>$15,780</td></tr>
				<tr><td>September</td><td>46</td><td>$18,260</td></tr>
			</table>
			<button id="export" style="margin-top:10px">Export as PDF</button>
			<div class="progress"><div class="bar" id="export-bar"></div></div>
			<div id="export-status">Not exported</div>
		</div>
	</div>
	<script>
		const GENERATION_MS = ${GENERATION_MS};
		document.querySelector('#generate').addEventListener('click', (e) => {
			e.target.disabled = true;
			const bar = document.querySelector('#bar'), status = document.querySelector('#status'), log = document.querySelector('#log');
			const start = performance.now();
			let n = 0;
			const tick = () => {
				const p = Math.min(1, (performance.now() - start) / GENERATION_MS);
				bar.style.width = (p * 100).toFixed(1) + '%';
				status.textContent = 'Processing invoices… ' + Math.round(p * 126) + ' / 126';
				while (n < Math.round(p * 126)) {
					n++;
					log.insertAdjacentHTML('afterbegin', '<div>✓ invoice #' + (1000 + n) + ' reconciled</div>');
				}
				if (p < 1) return requestAnimationFrame(tick);
				status.textContent = 'Done — 126 invoices';
				document.querySelector('#report').style.display = 'block';
			};
			requestAnimationFrame(tick);
		});
		document.querySelector('#export').addEventListener('click', (e) => {
			e.target.disabled = true;
			const bar = document.querySelector('#export-bar'), status = document.querySelector('#export-status');
			const start = performance.now();
			const tick = () => {
				const p = Math.min(1, (performance.now() - start) / ${EXPORT_MS});
				bar.style.width = (p * 100).toFixed(1) + '%';
				status.textContent = 'Rendering page ' + Math.max(1, Math.round(p * 48)) + ' / 48…';
				if (p < 1) return requestAnimationFrame(tick);
				status.textContent = '✓ report-q3.pdf ready (48 pages)';
			};
			requestAnimationFrame(tick);
		});
	</script>
</body></html>`;

test.describe('fast-forward', () => {
	test.slow();

	test('fast-forward two slow waits at two speeds', { tag: '@tutorial' }, async ({ page }) => {
		const testTitle = 'fast-forward two slow waits at two speeds';
		const [generateSpeed, exportSpeed] = SPEEDS;

		await page.route(`${ORIGIN}/**`, (route) => route.fulfill({ contentType: 'text/html', body: HTML }));

		const tutorial = new Tutorial(page, {
			title: 'Skipping the waits',
			testName: 'fast-forward-demo',
			testTitle,
			testFile: '96-fast-forward.spec.ts',
			projectName: 'chromium',
			lang: 'en',
			audioBaseUrl: ORIGIN,
			backgroundMusic: '',
			scenes: { app: { label: 'Acme — Reports', baseUrl: ORIGIN } },
			focus: 'app'
		});
		const app = tutorial.scene('app');

		await tutorial.stage();
		await tutorial.goto('app', '/');

		tutorial.context('Skip the boring part', {
			style: 'goal',
			text: 'Long waits are fast-forwarded in the final video, like an old VHS tape.'
		});

		tutorial.step('Generate the quarterly report', async () => {
			await tutorial.click(app.locator('#generate'));
			await tutorial.fastForward(generateSpeed, async () => {
				await expect(app.locator('#report')).toBeVisible({ timeout: GENERATION_MS * 3 });
			});
		}, { explain: `The generation takes a while, so the video plays it ${generateSpeed} times faster.` });

		tutorial.step('Export it as a PDF', async () => {
			await tutorial.click(app.locator('#export'));
			// Explicit markers this time, at a different speed.
			await tutorial.startFastForward(exportSpeed);
			await expect(app.locator('#export-status')).toContainText('ready', { timeout: EXPORT_MS * 3 });
			await tutorial.endFastForward();
		}, { explain: `Rendering 48 pages is even slower: ${exportSpeed} times faster.` });

		tutorial.step('The PDF is ready', async () => {
			await tutorial.highlight(app.locator('#export-status'), 1200);
			await tutorial.unhighlight(app.locator('#export-status'));
		});

		await tutorial.complete('Only the waits were sped up.');

		await expect(app.locator('#status')).toHaveText('Done — 126 invoices');
		await expect(app.locator('#export-status')).toContainText('report-q3.pdf ready');
		expect(await page.locator('#tutorial-fast-forward').count()).toBe(0);

		if (!Tutorial.isEnabled) return;

		// --- one video, two spans, a predictable final length ---
		const timeline = tutorial.getTimeline();
		const spans = timeline.fastForward!;
		expect(spans.map((s) => s.speed)).toEqual(SPEEDS);
		expect(spans[1].startMs).toBeGreaterThanOrEqual(spans[0].endMs);

		let saved = 0;
		for (const span of spans) {
			const tape = span.endMs - span.startMs;
			// Narration is waited for before the tape speeds up, so part of each
			// wait plays at 1×; the rest is fast-forwarded.
			expect(tape).toBeGreaterThan(GENERATION_MS / 3);
			expect(Math.abs(span.outputEndMs - span.outputStartMs - tape / span.speed)).toBeLessThanOrEqual(2);
			saved += tape * (1 - 1 / span.speed);
		}
		expect(Math.abs(timeline.totalDurationMs - (timeline.tapeDurationMs! - saved))).toBeLessThanOrEqual(3);

		// Each step after a span starts where that span ends in the video.
		const exportStep = timeline.steps.find((s) => s.title === 'Export it as a PDF')!;
		const ready = timeline.steps.find((s) => s.title === 'The PDF is ready')!;
		expect(exportStep.startMs).toBeGreaterThanOrEqual(spans[0].outputEndMs);
		expect(ready.startMs).toBeGreaterThanOrEqual(spans[1].outputEndMs);
		expect(ready.startMs - spans[1].outputEndMs).toBeLessThan(2000);
	});
});
