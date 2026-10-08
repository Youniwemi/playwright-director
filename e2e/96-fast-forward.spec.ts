import { test, expect } from '@playwright/test';
import { Tutorial } from '../src/index.js';

/**
 * fastForward(): a report generation nobody wants to watch in real time is
 * played sped up in the final video, VHS-style. Recorded at two speeds so the
 * final length can be checked against the timeline's prediction —
 * global-teardown.ts compares each merged file's duration with it.
 * Run with: TUTORIAL_MODE=true npx playwright test e2e/96-fast-forward.spec.ts
 */
const ORIGIN = 'http://reports.test';
const GENERATION_MS = 6000;

const HTML = `<!doctype html>
<html><head><meta charset="utf-8"><title>Acme — Reports</title>
<style>
	* { box-sizing: border-box; }
	body { font: 15px/1.5 system-ui, -apple-system, sans-serif; margin: 0; padding: 40px 56px; color: #0f172a; background: #f8fafc; }
	h1 { font-size: 24px; margin: 0 0 6px; }
	p.lead { color: #64748b; margin: 0 0 24px; }
	.card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px 24px; max-width: 640px; }
	button { font: inherit; font-weight: 600; background: #6366f1; color: #fff; border: 0; border-radius: 8px; padding: 10px 18px; cursor: pointer; }
	button:disabled { background: #a5b4fc; cursor: progress; }
	.progress { height: 10px; background: #e2e8f0; border-radius: 999px; overflow: hidden; margin: 18px 0 8px; }
	.bar { height: 100%; width: 0; background: linear-gradient(90deg, #6366f1, #22d3ee); }
	#status { color: #64748b; font-variant-numeric: tabular-nums; }
	#log { font: 12px/1.6 ui-monospace, monospace; color: #475569; background: #f1f5f9; border-radius: 8px; padding: 10px 12px; height: 132px; overflow: hidden; margin-top: 10px; }
	#report { display: none; margin-top: 18px; }
	#report table { width: 100%; border-collapse: collapse; }
	#report td, #report th { text-align: left; padding: 6px 4px; border-bottom: 1px solid #f1f5f9; }
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
	</script>
</body></html>`;

test.describe('fast-forward', () => {
	test.slow();

	for (const speed of [4, 8]) {
		test(`fast-forward a slow report generation at ${speed}x`, { tag: '@tutorial' }, async ({ page }) => {
			const testTitle = `fast-forward a slow report generation at ${speed}x`;

			await page.route(`${ORIGIN}/**`, (route) => route.fulfill({ contentType: 'text/html', body: HTML }));

			const tutorial = new Tutorial(page, {
				title: `Fast-forward ×${speed}`,
				testName: `fast-forward-x${speed}`,
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
				await tutorial.fastForward(speed, async () => {
					await expect(app.locator('#report')).toBeVisible({ timeout: GENERATION_MS * 3 });
				});
			}, { explain: `The generation takes a while, so the video plays it ${speed} times faster.` });

			tutorial.step('The report is ready', async () => {
				await tutorial.highlight(app.locator('#report table'), 1200);
				await tutorial.unhighlight(app.locator('#report table'));
			});

			await tutorial.complete('Only the wait was sped up.');

			await expect(app.locator('#status')).toHaveText('Done — 126 invoices');
			expect(await page.locator('#tutorial-fast-forward').count()).toBe(0);

			if (!Tutorial.isEnabled) return;

			// --- the final length is predictable from the timeline ---
			const timeline = tutorial.getTimeline();
			expect(timeline.fastForward).toHaveLength(1);
			const [ff] = timeline.fastForward!;
			expect(ff.speed).toBe(speed);
			const tapeSpan = ff.endMs - ff.startMs;
			// Narration is waited for before the tape speeds up, so part of the
			// generation plays at 1×; the rest is fast-forwarded.
			expect(tapeSpan).toBeGreaterThan(GENERATION_MS / 3);
			expect(Math.abs(ff.outputEndMs - ff.outputStartMs - tapeSpan / speed)).toBeLessThanOrEqual(2);
			expect(Math.abs(timeline.totalDurationMs - (timeline.tapeDurationMs! - tapeSpan * (1 - 1 / speed)))).toBeLessThanOrEqual(2);

			// The step after the span starts where the sped-up span ends in the video.
			const ready = timeline.steps.find((s) => s.title === 'The report is ready')!;
			expect(ready.startMs).toBeGreaterThanOrEqual(ff.outputEndMs);
			expect(ready.startMs - ff.outputEndMs).toBeLessThan(2000);
		});
	}
});
