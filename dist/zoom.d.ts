import type { Page } from '@playwright/test';
export interface ZoomOptions {
    /** Zoom factor. Default: auto — the target fills ~70% of the viewport, capped at 2.5×, never below 1×. */
    scale?: number;
    /** `zoom()` only: how long to hold the zoomed view, in ms (default: 1500). */
    duration?: number;
    /** Blur (and slightly dim) everything but the target. `true` = 4px; a number sets the radius in px. Default: false. */
    blur?: boolean | number;
    /** Duration of each zoom-in / zoom-out animation, in ms (default: 600). */
    transition?: number;
}
export interface ZoomRect {
    x: number;
    y: number;
    width: number;
    height: number;
}
export interface ZoomViewport {
    width: number;
    height: number;
}
/** One animation frame: the page is drawn at `k`× with its viewport origin at (`ox`, `oy`); `e` is the eased progress. */
export interface ZoomFrame {
    k: number;
    ox: number;
    oy: number;
    e: number;
}
export declare const ZOOM_MAX_SCALE = 2.5;
/** The zoom factor for a target: explicit `scale` wins, otherwise fit the target to ~70% of the viewport. */
export declare function zoomScale(rect: ZoomRect, viewport: ZoomViewport, scale?: number): number;
/**
 * The camera at progress `e` (0 → 1): scale grows from 1 to `scale` while the
 * target's center glides toward the viewport center. The origin is clamped so
 * the scaled page always covers the viewport — a target near an edge stays
 * off-center rather than exposing blank canvas.
 */
export declare function zoomFrame(rect: ZoomRect, viewport: ZoomViewport, scale: number, e: number): ZoomFrame;
/** Precomputed zoom-in frames (~60fps); zoom-out plays them backwards. */
export declare function zoomFrames(rect: ZoomRect, viewport: ZoomViewport, scale: number, transitionMs: number): ZoomFrame[];
export declare function zoomBlurPx(blur: ZoomOptions['blur']): number;
/**
 * Camera zoom on the top-level page. The page (iframes and scenes included) is
 * scaled with a CSS transform on `<html>`, while the tutorial UI (step banner,
 * cursor, email preview, debug clock) is lifted into a top-layer popover so it
 * stays crisp and in place. Returns the cursor's on-screen position at the end,
 * so the Node-side cursor can continue from there.
 */
export declare class TutorialZoom {
    private page;
    private active;
    constructor(page: Page);
    switchPage(page: Page): void;
    get isZoomed(): boolean;
    zoomIn(rect: ZoomRect, viewport: ZoomViewport, options?: ZoomOptions): Promise<{
        x: number;
        y: number;
    } | null>;
    zoomOut(): Promise<{
        x: number;
        y: number;
    } | null>;
    private run;
}
//# sourceMappingURL=zoom.d.ts.map