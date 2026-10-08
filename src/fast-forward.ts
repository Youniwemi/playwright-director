import type { Page } from '@playwright/test';

export interface FastForwardOptions {
	/** VHS look: an on-screen "▶▶ ×N" badge, scanlines and a rolling tracking
	 *  band in the page, plus grain and a chroma shift added by ffmpeg on the
	 *  sped-up span. `false` keeps a plain speed-up. Default: true. */
	vhs?: boolean;
}

/**
 * One fast-forwarded span. `startMs`/`endMs` are tape time — ms from timeline
 * zero on the source recording (what ffmpeg's setpts reads); `outputStartMs`/
 * `outputEndMs` are where the span lands in the final video.
 */
export interface FastForwardSegment {
	startMs: number;
	endMs: number;
	speed: number;
	outputStartMs: number;
	outputEndMs: number;
	vhs?: boolean;
}

/** Frame rate Playwright records at — the sped-up span is resampled back to it. */
export const FAST_FORWARD_FPS = 25;

export function assertFastForwardSpeed(speed: number): void {
	if (typeof speed !== 'number' || !Number.isFinite(speed) || speed <= 1) {
		throw new Error(`[Tutorial] fastForward speed must be a number > 1 (got ${speed})`);
	}
}

/**
 * Map a tape time to final-video time: every fast-forwarded ms before `tapeMs`
 * only lasts `1 / speed` ms in the output.
 */
export function fastForwardOutputMs(
	tapeMs: number,
	segments: ReadonlyArray<Pick<FastForwardSegment, 'startMs' | 'endMs' | 'speed'>>
): number {
	let out = tapeMs;
	for (const s of segments) {
		const covered = Math.min(Math.max(tapeMs, s.startMs), s.endMs) - s.startMs;
		if (covered > 0) out -= covered * (1 - 1 / s.speed);
	}
	return Math.round(out);
}

/**
 * The video filter chain that plays each segment at its speed: a single
 * piecewise `setpts` (no split/concat), resampled to a constant frame rate so
 * the sped-up span drops frames instead of bloating the file, then the VHS
 * grain + chroma shift enabled on the output spans of `vhs` segments.
 * Returns '' when there is nothing to fast-forward.
 */
export function buildFastForwardFilter(segments: ReadonlyArray<FastForwardSegment>): string {
	if (segments.length === 0) return '';
	const sec = (ms: number) => (ms / 1000).toFixed(3);
	const shift = segments
		.map((s) => `(clip(T,${sec(s.startMs)},${sec(s.endMs)})-${sec(s.startMs)})*${(1 - 1 / s.speed).toFixed(6)}`)
		.join('-');
	const chain = [`setpts='(T-${shift})/TB'`, `fps=${FAST_FORWARD_FPS}`];

	const vhs = segments.filter((s) => s.vhs !== false);
	if (vhs.length > 0) {
		const enable = vhs.map((s) => `between(t,${sec(s.outputStartMs)},${sec(s.outputEndMs)})`).join('+');
		chain.push(`noise=alls=12:allf=t:enable='${enable}'`, `rgbashift=rh=-2:bh=2:enable='${enable}'`);
	}
	return chain.join(',');
}

/**
 * The in-page half of the VHS look: an OSD badge, scanlines and a tracking
 * band. Recorded at real speed and sped up with the rest of the tape, so the
 * band's animation is slowed by `speed` to roll at a watchable pace on output.
 */
export class TutorialFastForward {
	constructor(private page: Page) {}

	switchPage(page: Page): void {
		this.page = page;
	}

	async show(speed: number): Promise<void> {
		await this.page.evaluate((speed) => {
			document.getElementById('tutorial-fast-forward')?.remove();
			const el = document.createElement('div');
			el.id = 'tutorial-fast-forward';
			el.setAttribute('aria-hidden', 'true');
			el.style.setProperty('--tutorial-ff-roll', `${2.4 * speed}s`);
			el.innerHTML =
				'<div class="tutorial-ff-scanlines"></div>' +
				'<div class="tutorial-ff-tracking"></div>' +
				`<div class="tutorial-ff-osd"><span class="tutorial-ff-arrows">▶▶</span> ×${speed}</div>`;
			// Inside a zoom, the top layer is the only place left unscaled.
			(document.getElementById('tutorial-zoom-layer') ?? document.body).appendChild(el);
		}, speed);
	}

	async hide(): Promise<void> {
		await this.page.evaluate(() => {
			document.getElementById('tutorial-fast-forward')?.remove();
		}).catch(() => {});
	}
}
