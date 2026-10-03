import { describe, it, expect, vi, beforeEach } from 'vitest';
import { zoomScale, zoomFrame, zoomFrames, zoomBlurPx, ZOOM_MAX_SCALE, TutorialZoom } from '../src/zoom';

const VP = { width: 1280, height: 720 };

const createMockPage = () => {
	const locator = {
		boundingBox: vi.fn().mockResolvedValue({ x: 600, y: 340, width: 80, height: 40 }),
		scrollIntoViewIfNeeded: vi.fn().mockResolvedValue(undefined),
		evaluate: vi.fn().mockResolvedValue(undefined)
	};
	return {
		locator: vi.fn().mockReturnValue(locator),
		evaluate: vi.fn().mockResolvedValue({ x: 640, y: 360 }),
		waitForTimeout: vi.fn().mockResolvedValue(undefined),
		viewportSize: vi.fn().mockReturnValue(VP),
		_locator: locator
	};
};

describe('zoomScale', () => {
	it('fits a small target to the cap', () => {
		expect(zoomScale({ x: 0, y: 0, width: 80, height: 30 }, VP)).toBe(ZOOM_MAX_SCALE);
	});

	it('fits a large target to ~70% of the viewport', () => {
		// 0.7 * 720 / 400 = 1.26 (height-bound)
		expect(zoomScale({ x: 0, y: 0, width: 600, height: 400 }, VP)).toBeCloseTo(1.26);
	});

	it('never zooms out, and honors an explicit scale', () => {
		expect(zoomScale({ x: 0, y: 0, width: 2000, height: 1000 }, VP)).toBe(1);
		expect(zoomScale({ x: 0, y: 0, width: 80, height: 30 }, VP, 4)).toBe(4);
		expect(zoomScale({ x: 0, y: 0, width: 80, height: 30 }, VP, 0.5)).toBe(1);
		expect(zoomScale({ x: 0, y: 0, width: 0, height: 0 }, VP)).toBe(1);
	});
});

describe('zoomFrame', () => {
	it('is the identity at progress 0', () => {
		expect(zoomFrame({ x: 100, y: 100, width: 50, height: 50 }, VP, 2, 0)).toEqual({ k: 1, ox: 0, oy: 0, e: 0 });
	});

	it('centers a mid-page target at full progress', () => {
		const rect = { x: 400, y: 200, width: 100, height: 100 };
		const f = zoomFrame(rect, VP, 2, 1);
		expect(f.k).toBe(2);
		// target center (450, 250) lands on the viewport center
		expect(f.ox + f.k * 450).toBeCloseTo(640);
		expect(f.oy + f.k * 250).toBeCloseTo(360);
	});

	it('clamps so the scaled page always covers the viewport', () => {
		for (const rect of [
			{ x: 0, y: 0, width: 40, height: 20 },
			{ x: 1240, y: 700, width: 40, height: 20 }
		]) {
			for (const e of [0.25, 0.5, 1]) {
				const f = zoomFrame(rect, VP, 2.5, e);
				expect(f.ox).toBeLessThanOrEqual(0);
				expect(f.oy).toBeLessThanOrEqual(0);
				expect(f.ox + f.k * VP.width).toBeGreaterThanOrEqual(VP.width - 1e-9);
				expect(f.oy + f.k * VP.height).toBeGreaterThanOrEqual(VP.height - 1e-9);
			}
		}
		// top-left target stays pinned to the corner instead of being centered
		expect(zoomFrame({ x: 0, y: 0, width: 40, height: 20 }, VP, 2.5, 1)).toMatchObject({ ox: 0, oy: 0 });
	});
});

describe('zoomFrames', () => {
	it('runs eased from identity to the full zoom at ~60fps', () => {
		const frames = zoomFrames({ x: 400, y: 200, width: 100, height: 100 }, VP, 2, 640);
		expect(frames).toHaveLength(41);
		expect(frames[0]).toMatchObject({ k: 1, e: 0 });
		expect(frames[frames.length - 1]).toMatchObject({ k: 2, e: 1 });
		for (let i = 1; i < frames.length; i++) expect(frames[i].k).toBeGreaterThanOrEqual(frames[i - 1].k);
	});
});

describe('zoomBlurPx', () => {
	it('maps the blur option to a radius', () => {
		expect(zoomBlurPx(undefined)).toBe(0);
		expect(zoomBlurPx(false)).toBe(0);
		expect(zoomBlurPx(true)).toBe(4);
		expect(zoomBlurPx(10)).toBe(10);
		expect(zoomBlurPx(0)).toBe(0);
	});
});

describe('TutorialZoom', () => {
	it('zooms in, then out with the same frames reversed', async () => {
		const page = createMockPage();
		const zoom = new TutorialZoom(page as any);
		const rect = { x: 600, y: 340, width: 80, height: 40 };

		await zoom.zoomIn(rect, VP, { blur: true, transition: 160 });
		expect(zoom.isZoomed).toBe(true);
		const inArgs = page.evaluate.mock.calls[0][1];
		expect(inArgs).toMatchObject({ direction: 'in', blurPx: 4, durationMs: 160, rect });
		expect(inArgs.frames).toHaveLength(11);

		await zoom.zoomOut();
		expect(zoom.isZoomed).toBe(false);
		expect(page.evaluate.mock.calls[1][1]).toMatchObject({ direction: 'out', frames: inArgs.frames });

		// Not zoomed: zoomOut is a no-op
		await zoom.zoomOut();
		expect(page.evaluate).toHaveBeenCalledTimes(2);
	});

	it('zooming in twice zooms out first', async () => {
		const page = createMockPage();
		const zoom = new TutorialZoom(page as any);
		await zoom.zoomIn({ x: 0, y: 0, width: 10, height: 10 }, VP);
		await zoom.zoomIn({ x: 0, y: 0, width: 10, height: 10 }, VP);
		expect(page.evaluate.mock.calls.map((c: any) => c[1].direction)).toEqual(['in', 'out', 'in']);
	});
});

describe('Tutorial.zoom', () => {
	beforeEach(() => vi.resetModules());

	it('is a no-op outside tutorial mode', async () => {
		const original = process.env.TUTORIAL_MODE;
		delete process.env.TUTORIAL_MODE;
		try {
			const { Tutorial } = await import('../src/Tutorial');
			const page = createMockPage();
			const tutorial = new Tutorial(page as any, { title: 'T', backgroundMusic: '' });
			await tutorial.zoom('#x', { blur: true });
			await tutorial.zoomIn('#x');
			await tutorial.zoomOut();
			expect(page.evaluate).not.toHaveBeenCalled();
			expect(page._locator.boundingBox).not.toHaveBeenCalled();
		} finally {
			process.env.TUTORIAL_MODE = original;
		}
	});

	it('zooms in on the element box, holds, and zooms out', async () => {
		const original = process.env.TUTORIAL_MODE;
		process.env.TUTORIAL_MODE = 'true';
		try {
			const { Tutorial } = await import('../src/Tutorial');
			const page = createMockPage();
			const tutorial = new Tutorial(page as any, { title: 'T', backgroundMusic: '', enableVoice: false });
			await tutorial.zoom('#pro', { duration: 900 });
			expect(page._locator.scrollIntoViewIfNeeded).toHaveBeenCalled();
			const directions = page.evaluate.mock.calls
				.map((c: any) => c[1]?.direction)
				.filter(Boolean);
			expect(directions).toEqual(['in', 'out']);
			expect(page.evaluate.mock.calls.find((c: any) => c[1]?.direction === 'in')[1].rect)
				.toEqual({ x: 600, y: 340, width: 80, height: 40 });
			expect(page.waitForTimeout).toHaveBeenCalledWith(900);
		} finally {
			process.env.TUTORIAL_MODE = original;
		}
	});
});
