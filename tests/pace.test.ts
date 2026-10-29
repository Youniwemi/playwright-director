import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildStepsDetail, generateManifest, pickPaces } from '../src/site/generate-manifest.js';
import { resolvePace, paceSuffix, PACE_PROFILES } from '../src/pace.js';
import { renderContextOverlay } from '../src/overlay-html.js';
import type { ScannedTutorial } from '../src/site/scan-tutorials.js';
import type { TimelineData } from '../src/timeline.js';
import type { SiteConfig } from '../src/site/types.js';

const createMockPage = () => ({
	evaluate: vi.fn().mockResolvedValue(undefined),
	addStyleTag: vi.fn().mockResolvedValue(undefined),
	waitForTimeout: vi.fn().mockResolvedValue(undefined),
	viewportSize: vi.fn().mockReturnValue({ width: 1280, height: 720 }),
	locator: vi.fn().mockReturnValue({
		boundingBox: vi.fn().mockResolvedValue({ x: 100, y: 100, width: 50, height: 30 }),
		evaluate: vi.fn().mockResolvedValue(undefined),
		click: vi.fn().mockResolvedValue(undefined),
		fill: vi.fn().mockResolvedValue(undefined),
		pressSequentially: vi.fn().mockResolvedValue(undefined),
		scrollIntoViewIfNeeded: vi.fn().mockResolvedValue(undefined)
	}),
	mouse: { move: vi.fn().mockResolvedValue(undefined) },
	video: vi.fn().mockReturnValue({ path: vi.fn().mockResolvedValue('/mock/video/path.webm') })
});

describe('resolvePace', () => {
	it('defaults to walkthrough, reads the env, lets the option win', () => {
		expect(resolvePace(undefined, undefined)).toBe('walkthrough');
		expect(resolvePace(undefined, 'demo')).toBe('demo');
		expect(resolvePace('snippet', 'demo')).toBe('snippet');
	});

	it('rejects an unknown pace with the valid list', () => {
		expect(() => resolvePace('fast', undefined)).toThrow(/walkthrough, snippet, demo/);
	});

	it('suffixes only non-walkthrough paces', () => {
		expect(paceSuffix('walkthrough')).toBe('');
		expect(paceSuffix(undefined)).toBe('');
		expect(paceSuffix('demo')).toBe('-demo');
	});
});

describe('renderContextOverlay compact', () => {
	it('renders a corner banner at the overlay position instead of the centered card', () => {
		const html = renderContextOverlay({ tutorialTitle: 'T', contextTitle: 'Goal', style: 'goal', compact: true, position: 'BR' });
		expect(html).toContain('tutorial-context-compact');
		expect(html).toContain('tutorial-overlay-br');
		expect(html).not.toContain('tutorial-overlay-context');
	});
});

describe('Tutorial pace', () => {
	let page: ReturnType<typeof createMockPage>;

	beforeEach(() => {
		page = createMockPage();
		vi.resetModules();
		process.env.TUTORIAL_MODE = 'true';
		delete process.env.TUTORIAL_PACE;
	});

	afterEach(() => {
		delete process.env.TUTORIAL_MODE;
		delete process.env.TUTORIAL_PACE;
	});

	const record = async (pace?: 'walkthrough' | 'snippet' | 'demo') => {
		const { Tutorial } = await import('../src/Tutorial');
		const tutorial = new Tutorial(page as any, { title: 'T', testName: 'pace-test', enableVoice: false, pace });
		tutorial.context('Send your first invoice', { text: 'It takes a minute.', style: 'goal' });
		tutorial.step('Open invoices', async () => {}, { do: 'Open invoices', explain: 'They are all listed here.' });
		tutorial.context('Numbering', { text: 'Numbers follow the law.', style: 'clarification' });
		tutorial.step('Save', async () => {}, { do: 'Save it', explain: 'It gets its number now.' });
		await tutorial.complete('Done!');
		return tutorial;
	};

	const overlayHtml = () =>
		page.evaluate.mock.calls.map((c: any[]) => c[1]).filter((a: unknown): a is string => typeof a === 'string' && a.includes('tutorial-overlay'));

	it('walkthrough narrates everything, as before', async () => {
		const tutorial = await record();
		expect(tutorial.pace).toBe('walkthrough');
		const [goal, s1, clarif, s2] = tutorial.getTimeline().steps;
		expect(goal.text).toBe('Send your first invoice. It takes a minute.');
		expect(goal.fullText).toBeUndefined();
		expect(s1.text).toBe('Open invoices. They are all listed here.');
		expect(clarif.text).toBe('Numbering. Numbers follow the law.');
		expect(s2.fullText).toBeUndefined();
		expect(tutorial.getTimeline().pace).toBeUndefined();
		expect((tutorial as any).testName).toBe('pace-test');
		expect(page.waitForTimeout).toHaveBeenCalledWith(2000);
	});

	it('snippet narrates the "do" halves and context titles, keeps the full text, drops clarifications', async () => {
		const tutorial = await record('snippet');
		const timeline = tutorial.getTimeline();
		const [goal, s1, clarif, s2] = timeline.steps;
		expect(goal).toMatchObject({ text: 'Send your first invoice', fullText: 'Send your first invoice. It takes a minute.' });
		expect(s1).toMatchObject({ text: 'Open invoices', fullText: 'Open invoices. They are all listed here.' });
		// Dropped clarification: recorded unvoiced with its whole text (gallery + SEO), never shown.
		expect(clarif).toMatchObject({ step: 0, title: 'Context', audioFile: '', text: 'Numbering. Numbers follow the law.' });
		expect(s2).toMatchObject({ text: 'Save it', fullText: 'Save it. It gets its number now.' });
		expect(timeline.pace).toBe('snippet');
		expect(timeline.testName).toBe('pace-test-snippet');

		const html = overlayHtml();
		expect(html.some((h) => h.includes('tutorial-context-compact') && h.includes('Send your first invoice'))).toBe(true);
		expect(html.some((h) => h.includes('Numbering'))).toBe(false);
		expect(html.some((h) => h.includes('They are all listed here.'))).toBe(true);
		expect(page.waitForTimeout).toHaveBeenCalledWith(PACE_PROFILES.snippet.endHold);
		expect(page.waitForTimeout).not.toHaveBeenCalledWith(2000);
	});

	it('demo hides overlay descriptions and reads TUTORIAL_PACE', async () => {
		process.env.TUTORIAL_PACE = 'demo';
		const tutorial = await record();
		expect(tutorial.pace).toBe('demo');
		expect((tutorial as any).testName).toBe('pace-test-demo');
		expect(overlayHtml().some((h) => h.includes('They are all listed here.'))).toBe(false);
	});

	it('explicit timing options win over the pace defaults', async () => {
		const { Tutorial } = await import('../src/Tutorial');
		const tutorial = new Tutorial(page as any, { title: 'T', pace: 'demo', stepDelay: 900, mouseSteps: 40 });
		expect((tutorial as any).options.stepDelay).toBe(900);
		expect((tutorial as any).options.mouseSteps).toBe(40);
		expect((tutorial as any).options.pauseBeforeClick).toBe(PACE_PROFILES.demo.pauseBeforeClick);
	});

	it('scales typing delays with the pace', async () => {
		const { Tutorial } = await import('../src/Tutorial');
		const tutorial = new Tutorial(page as any, { title: 'T', pace: 'demo', enableVoice: false });
		const locator = page.locator();
		await tutorial.typeSlowly(locator as any, 'abc', 50);
		expect(locator.pressSequentially).toHaveBeenCalledWith('abc', { delay: 20 });
	});
});

const recording = (testName: string, pace: TimelineData['pace'], lang = 'fr', fullText?: string): ScannedTutorial => ({
	timeline: {
		testName,
		testTitle: 'invoice',
		testFile: 'invoice.spec.ts',
		projectName: 'chromium',
		lang,
		...(pace ? { pace } : {}),
		totalDurationMs: 30000,
		videoTrimMs: 0,
		steps: [{ step: 1, title: 'Save', text: 'Save it', ...(fullText ? { fullText } : {}), audioFile: 'a.mp3', startMs: 0, durationMs: 1000 }],
		videoPath: '',
		mergeCommand: ''
	} as TimelineData,
	videoFile: `${testName}.webm`,
	stepScreenshots: [],
	recordedAt: '2026-10-01T00:00:00Z'
} as ScannedTutorial);

describe('gallery and paces', () => {
	it('the step guide shows the full text of a short cut', () => {
		const { stepsDetail } = buildStepsDetail(recording('invoice-snippet', 'snippet', 'fr', 'Save it. It gets its number now.'));
		expect(stepsDetail[0].text).toBe('Save it. It gets its number now.');
	});

	it('keeps one cut per recording, by preference', () => {
		const all = [recording('invoice', undefined), recording('invoice-snippet', 'snippet'), recording('invoice-demo', 'demo')];
		expect(pickPaces(all).map((t) => t.timeline.testName)).toEqual(['invoice']);
		expect(pickPaces(all, 'snippet').map((t) => t.timeline.testName)).toEqual(['invoice-snippet']);
		// Not recorded at the preferred pace: fall back to what exists.
		expect(pickPaces([recording('invoice-demo', 'demo')], 'snippet').map((t) => t.timeline.testName)).toEqual(['invoice-demo']);
	});

	it('the pace suffix is not part of the slug', () => {
		const config = { input: '', output: '', baseUrl: '/', lang: 'fr', tutorials: { pace: 'snippet' } } as SiteConfig;
		const manifest = generateManifest([recording('invoice', undefined), recording('invoice-snippet', 'snippet')], config);
		expect(manifest.videos).toHaveLength(1);
		expect(manifest.videos[0]).toMatchObject({ id: 'invoice-snippet', slug: 'invoice', pace: 'snippet' });
	});
});
