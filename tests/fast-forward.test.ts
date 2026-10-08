import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { execFileSync, execSync } from 'child_process';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { fastForwardOutputMs, buildFastForwardFilter, type FastForwardSegment } from '../src/fast-forward';
import { buildMergeCommand } from '../src/merge';
import { TutorialTimeline } from '../src/timeline';

const seg = (startMs: number, endMs: number, speed: number, vhs?: boolean): FastForwardSegment => ({
	startMs,
	endMs,
	speed,
	outputStartMs: fastForwardOutputMs(startMs, []),
	outputEndMs: 0,
	...(vhs === false ? { vhs } : {})
});

describe('fastForwardOutputMs', () => {
	it('is the identity without segments', () => {
		expect(fastForwardOutputMs(12345, [])).toBe(12345);
	});

	it('compresses the span by its speed and shifts everything after it', () => {
		const s = [seg(2000, 10000, 4)];
		expect(fastForwardOutputMs(1000, s)).toBe(1000); // before
		expect(fastForwardOutputMs(6000, s)).toBe(3000); // halfway: 2000 + 4000/4
		expect(fastForwardOutputMs(10000, s)).toBe(4000); // end: 2000 + 8000/4
		expect(fastForwardOutputMs(15000, s)).toBe(9000); // after: shifted by 6000
	});

	it('stacks several segments with different speeds', () => {
		const s = [seg(1000, 5000, 4), seg(6000, 14000, 8)];
		// 1000 + 4000/4 + 1000 + 8000/8 + 1000
		expect(fastForwardOutputMs(15000, s)).toBe(5000);
	});
});

describe('buildFastForwardFilter', () => {
	it('is empty without segments', () => {
		expect(buildFastForwardFilter([])).toBe('');
	});

	it('re-times with a piecewise setpts and resamples to 25fps', () => {
		const f = buildFastForwardFilter([{ ...seg(2000, 10000, 4), outputStartMs: 2000, outputEndMs: 4000 }]);
		expect(f).toContain("setpts='(T-(clip(T,2.000,10.000)-2.000)*0.750000)/TB'");
		expect(f).toContain('fps=25');
		expect(f).toContain("noise=alls=12:allf=t:enable='between(t,2.000,4.000)'");
		expect(f).toContain("rgbashift=rh=-2:bh=2:enable='between(t,2.000,4.000)'");
	});

	it('limits the VHS grain to vhs segments', () => {
		const f = buildFastForwardFilter([
			{ ...seg(1000, 5000, 4), outputStartMs: 1000, outputEndMs: 2000 },
			{ ...seg(6000, 14000, 8, false), outputStartMs: 3000, outputEndMs: 4000 }
		]);
		expect(f).toContain('*0.875000');
		expect(f).toContain("enable='between(t,1.000,2.000)'");
		expect(f).not.toContain('between(t,3.000');
	});

	it('leaves the grain out entirely when no segment wants it', () => {
		const f = buildFastForwardFilter([{ ...seg(1000, 5000, 4, false), outputStartMs: 1000, outputEndMs: 2000 }]);
		expect(f).not.toContain('noise');
		expect(f).not.toContain('rgbashift');
	});
});

describe('buildMergeCommand with fast-forward', () => {
	const steps = [{ audioFile: 'a.wav', startMs: 500 }];

	it('maps the re-timed [vout] stream', () => {
		const { command, filter } = buildMergeCommand(
			{ totalDurationMs: 9000, steps, fastForward: [{ ...seg(2000, 10000, 4), outputStartMs: 2000, outputEndMs: 4000 }] },
			'in.webm',
			'out.webm',
			{ musicFile: '', checkFileExists: () => true }
		);
		expect(filter.startsWith('[0:v]setpts=')).toBe(true);
		expect(filter).toContain('[vout];');
		expect(command).toContain('-map "[vout]"');
		expect(command).not.toContain('-map 0:v');
		expect(command).toContain('-t 9.000');
	});

	it('keeps the plain video map without segments', () => {
		const { command, filter } = buildMergeCommand({ totalDurationMs: 9000, steps }, 'in.webm', 'out.webm', {
			musicFile: '',
			checkFileExists: () => true
		});
		expect(filter).not.toContain('[vout]');
		expect(command).toContain('-map 0:v');
	});
});

describe('TutorialTimeline fast-forward', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
	});
	afterEach(() => vi.useRealTimers());

	const t0 = new Date('2026-01-01T00:00:00Z').getTime();

	it('stores step starts in final-video time and shortens the total', () => {
		const tl = new TutorialTimeline('ff', '', '', 'en', 'ff');
		tl.start();
		tl.addStep(1, 'Generate', 'a.wav', 1500, t0 + 1000);
		tl.startFastForward(4, t0 + 2000);
		tl.endFastForward(t0 + 10000);
		tl.addStep(2, 'Result', 'b.wav', 1500, t0 + 11000);
		vi.setSystemTime(t0 + 14000);

		const data = tl.getData();
		expect(data.steps.map((s) => s.startMs)).toEqual([1000, 5000]);
		expect(data.tapeDurationMs).toBe(14000);
		expect(data.totalDurationMs).toBe(8000);
		expect(data.fastForward).toEqual([
			{ startMs: 2000, endMs: 10000, speed: 4, outputStartMs: 2000, outputEndMs: 4000 }
		]);
		expect(data.mergeCommand).toContain('-map "[vout]"');
		expect(data.mergeCommand).toContain('-t 8.000');
	});

	it('closes a span left open at the end of the recording', () => {
		const tl = new TutorialTimeline('ff', '', '', 'en', 'ff');
		tl.start();
		tl.startFastForward(8, t0 + 2000, false);
		vi.setSystemTime(t0 + 10000);
		const data = tl.getData();
		expect(data.fastForward).toEqual([
			{ startMs: 2000, endMs: 10000, speed: 8, outputStartMs: 2000, outputEndMs: 3000, vhs: false }
		]);
		expect(data.totalDurationMs).toBe(3000);
	});

	it('leaves the timeline untouched without fast-forward', () => {
		const tl = new TutorialTimeline('ff', '', '', 'en', 'ff');
		tl.start();
		vi.setSystemTime(t0 + 5000);
		const data = tl.getData();
		expect(data.totalDurationMs).toBe(5000);
		expect(data.fastForward).toBeUndefined();
		expect(data.tapeDurationMs).toBeUndefined();
	});
});

const createMockPage = () => ({
	evaluate: vi.fn().mockResolvedValue(undefined),
	waitForTimeout: vi.fn().mockResolvedValue(undefined),
	viewportSize: vi.fn().mockReturnValue({ width: 1280, height: 720 }),
	locator: vi.fn(),
	mouse: { move: vi.fn().mockResolvedValue(undefined) },
	screenshot: vi.fn().mockRejectedValue(new Error('no screenshots in unit tests')),
	video: vi.fn().mockReturnValue(null)
});

describe('Tutorial.fastForward', () => {
	let original: string | undefined;
	beforeEach(() => {
		vi.resetModules();
		original = process.env.TUTORIAL_MODE;
	});
	afterEach(() => {
		if (original === undefined) delete process.env.TUTORIAL_MODE;
		else process.env.TUTORIAL_MODE = original;
	});

	it('just runs the action outside tutorial mode', async () => {
		delete process.env.TUTORIAL_MODE;
		const { Tutorial } = await import('../src/Tutorial');
		const page = createMockPage();
		const tutorial = new Tutorial(page as any, { title: 'T', backgroundMusic: '' });
		const result = await tutorial.fastForward(4, async () => 42);
		await tutorial.startFastForward(4);
		await tutorial.endFastForward();
		expect(result).toBe(42);
		expect(page.evaluate).not.toHaveBeenCalled();
	});

	it('rejects a speed that is not > 1', async () => {
		delete process.env.TUTORIAL_MODE;
		const { Tutorial } = await import('../src/Tutorial');
		const tutorial = new Tutorial(createMockPage() as any, { title: 'T', backgroundMusic: '' });
		await expect(tutorial.startFastForward(1)).rejects.toThrow(/> 1/);
		await expect(tutorial.fastForward(0.5, async () => {})).rejects.toThrow(/> 1/);
	});

	it('records a span inside complete() and shows the VHS badge', async () => {
		process.env.TUTORIAL_MODE = 'true';
		{
			const { Tutorial } = await import('../src/Tutorial');
			const page = createMockPage();
			const tutorial = new Tutorial(page as any, { title: 'T', backgroundMusic: '', enableVoice: false, testName: 'ff-unit' });
			tutorial.step('Wait for the report', async () => {
				await tutorial.fastForward(6, () => new Promise((r) => setTimeout(r, 40)));
			});
			await tutorial.complete();

			const segments = tutorial.getTimeline().fastForward!;
			expect(segments).toHaveLength(1);
			expect(segments[0].speed).toBe(6);
			expect(segments[0].endMs - segments[0].startMs).toBeGreaterThanOrEqual(30);
			const shown = page.evaluate.mock.calls.find((c: any) => c[1] === 6);
			expect(shown, 'VHS badge was not injected').toBeTruthy();
		}
	});

	it('warns and does nothing before complete() starts the timeline', async () => {
		process.env.TUTORIAL_MODE = 'true';
		const { Tutorial } = await import('../src/Tutorial');
		const page = createMockPage();
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const tutorial = new Tutorial(page as any, { title: 'T', backgroundMusic: '', enableVoice: false });
		await tutorial.startFastForward(4);
		expect(warn).toHaveBeenCalled();
		expect(page.evaluate).not.toHaveBeenCalled();
		warn.mockRestore();
	});
});

const hasFfmpeg = (() => {
	try {
		execSync('ffmpeg -version', { stdio: 'ignore' });
		return true;
	} catch {
		return false;
	}
})();

describe.skipIf(!hasFfmpeg)('fast-forward merge on a real video', () => {
	it('produces exactly the predicted duration', () => {
		const dir = mkdtempSync(join(tmpdir(), 'ff-merge-'));
		try {
			const src = join(dir, 'src.webm');
			execFileSync('ffmpeg', ['-loglevel', 'error', '-f', 'lavfi', '-i', 'testsrc=size=320x180:rate=25', '-t', '12', '-c:v', 'libvpx', '-y', src]);
			const fastForward = [
				{ startMs: 1000, endMs: 5000, speed: 4, outputStartMs: 1000, outputEndMs: 2000 },
				{ startMs: 6000, endMs: 10000, speed: 8, outputStartMs: 3000, outputEndMs: 3500 }
			];
			// 12s tape: 1 + 4/4 + 1 + 4/8 + 2 = 5.5s
			const totalDurationMs = fastForwardOutputMs(12000, fastForward);
			expect(totalDurationMs).toBe(5500);
			const out = join(dir, 'out.webm');
			const { command } = buildMergeCommand({ totalDurationMs, steps: [], fastForward }, src, out, { musicFile: '' });
			execSync(command.replace('ffmpeg -y', 'ffmpeg -loglevel error -y'));
			const seconds = parseFloat(
				execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', out], { encoding: 'utf-8' })
			);
			expect(Math.abs(seconds - 5.5)).toBeLessThan(0.1);
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
	}, 60_000);
});
