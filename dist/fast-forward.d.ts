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
export declare const FAST_FORWARD_FPS = 25;
export declare function assertFastForwardSpeed(speed: number): void;
/**
 * Map a tape time to final-video time: every fast-forwarded ms before `tapeMs`
 * only lasts `1 / speed` ms in the output.
 */
export declare function fastForwardOutputMs(tapeMs: number, segments: ReadonlyArray<Pick<FastForwardSegment, 'startMs' | 'endMs' | 'speed'>>): number;
/**
 * The video filter chain that plays each segment at its speed: a single
 * piecewise `setpts` (no split/concat), resampled to a constant frame rate so
 * the sped-up span drops frames instead of bloating the file, then the VHS
 * grain + chroma shift enabled on the output spans of `vhs` segments.
 * Returns '' when there is nothing to fast-forward.
 */
export declare function buildFastForwardFilter(segments: ReadonlyArray<FastForwardSegment>): string;
/**
 * The in-page half of the VHS look: an OSD badge, scanlines and a tracking
 * band. Recorded at real speed and sped up with the rest of the tape, so the
 * band's animation is slowed by `speed` to roll at a watchable pace on output.
 */
export declare class TutorialFastForward {
    private page;
    constructor(page: Page);
    switchPage(page: Page): void;
    show(speed: number): Promise<void>;
    hide(): Promise<void>;
}
//# sourceMappingURL=fast-forward.d.ts.map