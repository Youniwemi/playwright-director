import { test, expect, type Page } from '@playwright/test';
import { Tutorial, type Pace } from '../src/index.js';

/**
 * Showcase for paces: ONE tutorial script recorded in its three cuts.
 * Each cut is its own test (own title + testName) so the demo gallery shows
 * the three side by side; in a real project you'd keep one test and switch
 * with TUTORIAL_PACE=snippet|demo instead.
 * Run with: TUTORIAL_MODE=true npx playwright test e2e/95-paces.spec.ts
 */
const ORIGIN = 'http://invoices.test';

const HTML = `<!doctype html>
<html><head><meta charset="utf-8"><title>Acme — Invoices</title>
<style>
	* { box-sizing: border-box; }
	body { font: 15px/1.5 system-ui, -apple-system, sans-serif; margin: 0; color: #0f172a; background: #f1f5f9; display: flex; min-height: 100vh; }
	aside { width: 200px; background: #0f172a; color: #cbd5e1; padding: 20px 14px; flex-shrink: 0; }
	aside .logo { color: #fff; font-weight: 800; font-size: 18px; margin: 0 8px 24px; }
	aside a { display: block; padding: 9px 10px; border-radius: 8px; color: inherit; text-decoration: none; margin-bottom: 2px; }
	aside a.active { background: #1e293b; color: #fff; }
	main { flex: 1; padding: 26px 32px; min-width: 0; max-width: 860px; }
	header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; }
	h1 { font-size: 24px; margin: 0; }
	.btn { font: inherit; font-weight: 600; background: #6366f1; color: #fff; border: 0; border-radius: 8px; padding: 9px 16px; cursor: pointer; }
	.panel { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px 20px; margin-bottom: 14px; }
	table { width: 100%; border-collapse: collapse; }
	td, th { text-align: left; padding: 8px 6px; border-bottom: 1px solid #f1f5f9; }
	th { color: #64748b; font-weight: 600; font-size: 13px; }
	.pill { border-radius: 999px; padding: 2px 10px; font-size: 12px; font-weight: 700; }
	.paid { background: #d1fae5; color: #065f46; } .sent { background: #dbeafe; color: #1e40af; } .draft { background: #e2e8f0; color: #334155; }
	#form { display: none; }
	label { display: block; color: #64748b; font-size: 13px; margin: 10px 0 4px; }
	input, select { font: inherit; border: 1px solid #cbd5e1; border-radius: 6px; padding: 7px 10px; width: 100%; }
	.line { display: grid; grid-template-columns: 1fr 140px; gap: 12px; }
	.client-card { color: #475569; font-size: 13px; margin-top: 6px; min-height: 20px; }
	#total { display: inline-block; text-align: right; padding: 10px 14px; border-radius: 10px; background: #eef2ff; }
	#total .amount { font-size: 26px; font-weight: 800; color: #3730a3; }
	.foot { display: flex; justify-content: space-between; align-items: center; margin-top: 14px; }
	.toast { position: fixed; bottom: 20px; right: 20px; background: #0f172a; color: #fff; padding: 12px 18px; border-radius: 10px; display: none; }
</style></head>
<body>
	<aside>
		<div class="logo">◆ Acme</div>
		<a href="#">📊 Dashboard</a>
		<a class="active" href="#">🧾 Invoices</a>
		<a href="#">👥 Clients</a>
	</aside>
	<main>
		<header><h1 id="heading">Invoices</h1><button class="btn" id="new">+ New invoice</button></header>
		<div class="panel" id="list">
			<table id="rows">
				<tr><th>Number</th><th>Client</th><th>Amount</th><th>Status</th></tr>
				<tr><td>INV-0041</td><td>Globex</td><td>$1,440.00</td><td><span class="pill paid">Paid</span></td></tr>
				<tr><td>INV-0040</td><td>Umbrella</td><td>$780.00</td><td><span class="pill paid">Paid</span></td></tr>
			</table>
		</div>
		<div id="form">
			<div class="panel">
				<label for="client">Client</label>
				<select id="client"><option value="">Choose a client…</option><option>Initech</option><option>Globex</option></select>
				<div class="client-card" id="client-card"></div>
			</div>
			<div class="panel">
				<div class="line">
					<div><label for="desc">Description</label><input id="desc" placeholder="What did you sell?"></div>
					<div><label for="price">Price (excl. VAT)</label><input id="price" placeholder="0.00"></div>
				</div>
				<div class="foot">
					<span class="pill draft" id="status">Draft</span>
					<div id="total"><div style="font-size:12px;color:#64748b">Total incl. 20% VAT</div><div class="amount" id="amount">$0.00</div></div>
				</div>
			</div>
			<button class="btn" id="send">Send invoice</button>
		</div>
	</main>
	<div class="toast" id="toast">✉ INV-0042 sent to billing@initech.com</div>
	<script>
		const $ = (s) => document.querySelector(s);
		$('#new').addEventListener('click', () => {
			$('#list').style.display = 'none'; $('#new').style.display = 'none';
			$('#form').style.display = 'block'; $('#heading').textContent = 'New invoice';
		});
		$('#client').addEventListener('change', (e) => {
			$('#client-card').textContent = e.target.value === 'Initech' ? '1 Initech Way, Austin TX · Tax ID US-4471-0093' : e.target.value ? 'Globex Corp · Tax ID US-1120-5521' : '';
		});
		$('#price').addEventListener('input', (e) => {
			const ht = parseFloat(e.target.value.replace(',', '.')) || 0;
			$('#amount').textContent = '$' + (ht * 1.2).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
		});
		$('#send').addEventListener('click', () => {
			$('#status').textContent = 'Sent · INV-0042'; $('#status').className = 'pill sent';
			$('#toast').style.display = 'block';
		});
	</script>
</body></html>`;

/** The tutorial, written once and in full — the pace decides how much is said. */
async function recordInvoice(page: Page, pace: Pace, testName: string, testTitle: string): Promise<void> {
	await page.route(`${ORIGIN}/**`, (route) => route.fulfill({ contentType: 'text/html', body: HTML }));

	const tutorial = new Tutorial(page, {
		title: 'Your first invoice',
		testName,
		testTitle,
		testFile: '95-paces.spec.ts',
		projectName: 'chromium',
		lang: 'en',
		audioBaseUrl: ORIGIN,
		backgroundMusic: '',
		pace,
		// Top-right would sit on the "+ New invoice" button, the first click.
		overlayPosition: 'BL',
		scenes: { app: { label: 'Acme — Invoices', baseUrl: ORIGIN } },
		focus: 'app',
		links: { docs: '#paces--one-script-three-cuts' }
	});
	const app = tutorial.scene('app');

	await tutorial.stage();
	await tutorial.goto('app', '/');

	tutorial.context('Send your first invoice in a minute', {
		style: 'goal',
		text: 'By the end, your client receives a numbered invoice by email, and you can follow its payment from this list.'
	});

	tutorial.step('Start a new invoice', async () => {
		await tutorial.click(app.locator('#new'));
	}, { do: 'Start a new invoice', explain: 'It begins as a draft, so nothing leaves until you decide.' });

	tutorial.step('Pick your client', async () => {
		await tutorial.selectOption(app.locator('#client'), 'Initech');
	}, { do: 'Pick your client', explain: 'Their address and tax ID fill in by themselves.' });

	tutorial.step('Add what you sold', async () => {
		await tutorial.typeSlowly(app.locator('#desc'), 'Website redesign');
		await tutorial.typeSlowly(app.locator('#price'), '1200');
	}, { do: 'Add what you sold', explain: 'Type a description and a price; the VAT is computed for you.' });

	tutorial.context('Why drafts have no number', {
		style: 'clarification',
		text: 'Invoice numbers must follow each other with no gap, so a number is only given when the invoice is sent.'
	});

	tutorial.step('Check the total', async () => {
		await tutorial.zoom(app.locator('#total'), { duration: 1500 });
	}, { do: 'Check the total', explain: 'VAT included, it is exactly what your client will pay.' });

	tutorial.context('Sending is final', {
		style: 'attention',
		text: 'Once sent, an invoice can no longer be edited, only cancelled with a credit note.'
	});

	tutorial.step('Send it', async () => {
		await tutorial.click(app.locator('#send'));
	}, { do: 'Send it', explain: 'It gets its number now, and your client receives it by email.' });

	await tutorial.complete('Your invoice is on its way. You will see here the moment it gets paid.');

	await expect(app.locator('#status')).toHaveText('Sent · INV-0042');
	await expect(app.locator('#amount')).toHaveText('$1,440.00');
}

test.describe('paces', () => {
	test.slow();

	const CUTS: { pace: Pace; testName: string; label: string }[] = [
		// Outputs: first-invoice-walkthrough, first-invoice-docs-snippet, first-invoice-social-demo
		{ pace: 'walkthrough', testName: 'first-invoice-walkthrough', label: 'walkthrough' },
		{ pace: 'snippet', testName: 'first-invoice-docs', label: 'snippet' },
		{ pace: 'demo', testName: 'first-invoice-social', label: 'demo' }
	];

	for (const cut of CUTS) {
		const testTitle = `first invoice, ${cut.label} cut`;
		test(testTitle, { tag: '@tutorial' }, async ({ page }) => {
			await recordInvoice(page, cut.pace, cut.testName, testTitle);
		});
	}
});
