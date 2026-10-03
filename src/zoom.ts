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

export const ZOOM_MAX_SCALE = 2.5;
const ZOOM_FILL = 0.7;
const ZOOM_DEFAULT_BLUR = 4;

/** The zoom factor for a target: explicit `scale` wins, otherwise fit the target to ~70% of the viewport. */
export function zoomScale(rect: ZoomRect, viewport: ZoomViewport, scale?: number): number {
	if (scale !== undefined) return Math.max(1, scale);
	if (rect.width <= 0 || rect.height <= 0) return 1;
	const fit = Math.min(
		(viewport.width * ZOOM_FILL) / rect.width,
		(viewport.height * ZOOM_FILL) / rect.height
	);
	return Math.min(ZOOM_MAX_SCALE, Math.max(1, fit));
}

/**
 * The camera at progress `e` (0 → 1): scale grows from 1 to `scale` while the
 * target's center glides toward the viewport center. The origin is clamped so
 * the scaled page always covers the viewport — a target near an edge stays
 * off-center rather than exposing blank canvas.
 */
export function zoomFrame(rect: ZoomRect, viewport: ZoomViewport, scale: number, e: number): ZoomFrame {
	const k = 1 + (scale - 1) * e;
	const axis = (center: number, size: number) => {
		const target = center + (size / 2 - center) * e;
		return Math.min(0, Math.max(size * (1 - k), target - k * center));
	};
	return {
		k,
		ox: axis(rect.x + rect.width / 2, viewport.width),
		oy: axis(rect.y + rect.height / 2, viewport.height),
		e
	};
}

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** Precomputed zoom-in frames (~60fps); zoom-out plays them backwards. */
export function zoomFrames(rect: ZoomRect, viewport: ZoomViewport, scale: number, transitionMs: number): ZoomFrame[] {
	const n = Math.max(1, Math.round(transitionMs / 16));
	return Array.from({ length: n + 1 }, (_, i) => zoomFrame(rect, viewport, scale, easeInOut(i / n)));
}

export function zoomBlurPx(blur: ZoomOptions['blur']): number {
	if (blur === true) return ZOOM_DEFAULT_BLUR;
	if (typeof blur === 'number' && blur > 0) return blur;
	return 0;
}

interface ZoomRun {
	frames: ZoomFrame[];
	durationMs: number;
	rect: ZoomRect;
	blurPx: number;
	direction: 'in' | 'out';
}

/**
 * Camera zoom on the top-level page. The page (iframes and scenes included) is
 * scaled with a CSS transform on `<html>`, while the tutorial UI (step banner,
 * cursor, email preview, debug clock) is lifted into a top-layer popover so it
 * stays crisp and in place. Returns the cursor's on-screen position at the end,
 * so the Node-side cursor can continue from there.
 */
export class TutorialZoom {
	private page: Page;
	private active: { frames: ZoomFrame[]; rect: ZoomRect; blurPx: number; durationMs: number } | null = null;

	constructor(page: Page) {
		this.page = page;
	}

	switchPage(page: Page): void {
		this.page = page;
		this.active = null;
	}

	get isZoomed(): boolean {
		return this.active !== null;
	}

	async zoomIn(rect: ZoomRect, viewport: ZoomViewport, options: ZoomOptions = {}): Promise<{ x: number; y: number } | null> {
		if (this.active) await this.zoomOut();
		const scale = zoomScale(rect, viewport, options.scale);
		const durationMs = options.transition ?? 600;
		const frames = zoomFrames(rect, viewport, scale, durationMs);
		const blurPx = zoomBlurPx(options.blur);
		this.active = { frames, rect, blurPx, durationMs };
		return this.run({ frames, durationMs, rect, blurPx, direction: 'in' });
	}

	async zoomOut(): Promise<{ x: number; y: number } | null> {
		if (!this.active) return null;
		const { frames, rect, blurPx, durationMs } = this.active;
		this.active = null;
		try {
			return await this.run({ frames, durationMs, rect, blurPx, direction: 'out' });
		} catch {
			return null; // page navigated or closed while zoomed — nothing left to restore
		}
	}

	private run(args: ZoomRun): Promise<{ x: number; y: number } | null> {
		return this.page.evaluate(async ({ frames, durationMs, rect, blurPx, direction }) => {
			const UI_IDS = ['tutorial-overlay', 'tutorial-email-preview', 'tutorial-cursor', 'tutorial-debug-clock'];
			const html = document.documentElement;
			const w = window as unknown as { __tutorialZoom?: any };
			let state = w.__tutorialZoom;
			// Re-inserting a node restarts its CSS entrance animation (banner fade-in):
			// jump finite ones to their end so moving the UI never flashes it.
			const settle = (el: Element) => {
				for (const a of el.getAnimations({ subtree: true })) {
					if (a.effect?.getComputedTiming().iterations !== Infinity) a.finish();
				}
			};

			if (direction === 'in') {
				// <html> becomes the containing block of fixed elements once it has a
				// transform; shift them back by its offset so a scrolled page keeps its
				// fixed headers in place.
				const htmlRect = html.getBoundingClientRect();
				const htmlTL = { x: htmlRect.left, y: htmlRect.top };
				const fixed: { el: HTMLElement; prev: string }[] = [];
				if (htmlTL.x !== 0 || htmlTL.y !== 0) {
					const establishesBlock = (el: Element) => {
						const cs = getComputedStyle(el);
						return cs.transform !== 'none' || cs.filter !== 'none' || cs.perspective !== 'none'
							|| cs.backdropFilter !== 'none' || /paint|layout|strict|content/.test(cs.contain)
							|| /transform|filter|perspective/.test(cs.willChange);
					};
					for (const el of Array.from(document.body.querySelectorAll<HTMLElement>('*'))) {
						if (UI_IDS.includes(el.id) || getComputedStyle(el).position !== 'fixed') continue;
						let contained = false;
						for (let p = el.parentElement; p && p !== html; p = p.parentElement) {
							if (establishesBlock(p)) { contained = true; break; }
						}
						if (contained) continue;
						const [tx = '0px', ty = '0px'] = getComputedStyle(el).translate === 'none'
							? [] : getComputedStyle(el).translate.split(' ');
						fixed.push({ el, prev: el.style.translate });
						el.style.translate = `calc(${tx} + ${-htmlTL.x}px) calc(${ty} + ${-htmlTL.y}px)`;
					}
				}

				const layer = document.createElement('div');
				layer.id = 'tutorial-zoom-layer';
				layer.className = 'tutorial-zoom-layer';
				layer.style.cssText = 'position:fixed;inset:0;width:auto;height:auto;margin:0;padding:0;border:0;'
					+ 'background:transparent;overflow:visible;pointer-events:none;color:inherit;';
				let blur: HTMLElement | null = null;
				if (blurPx > 0) {
					blur = document.createElement('div');
					blur.className = 'tutorial-zoom-blur';
					blur.style.cssText = `position:fixed;inset:0;pointer-events:none;opacity:0;`
						+ `backdrop-filter:blur(${blurPx}px);-webkit-backdrop-filter:blur(${blurPx}px);`;
					layer.appendChild(blur);
				}
				document.body.appendChild(layer);
				for (const id of UI_IDS) {
					const el = document.getElementById(id);
					if (el) {
						layer.appendChild(el);
						settle(el);
					}
				}
				if (typeof layer.showPopover === 'function') {
					layer.setAttribute('popover', 'manual');
					layer.showPopover();
				}

				const cursor = document.getElementById('tutorial-cursor');
				const cursorBase = cursor && cursor.style.left
					? { x: parseFloat(cursor.style.left), y: parseFloat(cursor.style.top) }
					: null;

				state = w.__tutorialZoom = {
					htmlTL,
					fixed,
					layer,
					blur,
					cursorBase,
					prevTransform: html.style.transform,
					prevOrigin: html.style.transformOrigin
				};
				html.style.transformOrigin = '0 0';
				html.setAttribute('data-tutorial-zoom', '');
			} else {
				if (!state) return null;
				// The cursor may have moved while zoomed: map it back into page space.
				const last = frames[frames.length - 1];
				const cursor = document.getElementById('tutorial-cursor');
				state.cursorBase = cursor && cursor.style.left
					? { x: (parseFloat(cursor.style.left) - last.ox) / last.k, y: (parseFloat(cursor.style.top) - last.oy) / last.k }
					: null;
			}

			const apply = (f: { k: number; ox: number; oy: number; e: number }) => {
				const tx = f.ox - state.htmlTL.x * (1 - f.k);
				const ty = f.oy - state.htmlTL.y * (1 - f.k);
				html.style.transform = `translate(${tx}px, ${ty}px) scale(${f.k})`;
				const cursor = document.getElementById('tutorial-cursor');
				if (cursor && state.cursorBase) {
					cursor.style.left = `${f.ox + f.k * state.cursorBase.x}px`;
					cursor.style.top = `${f.oy + f.k * state.cursorBase.y}px`;
				}
				if (state.blur) {
					const pad = 6 * f.k;
					const x1 = f.ox + f.k * rect.x - pad;
					const y1 = f.oy + f.k * rect.y - pad;
					const x2 = f.ox + f.k * (rect.x + rect.width) + pad;
					const y2 = f.oy + f.k * (rect.y + rect.height) + pad;
					state.blur.style.opacity = String(f.e);
					state.blur.style.clipPath = `polygon(evenodd, 0 0, 100% 0, 100% 100%, 0 100%, 0 0, `
						+ `${x1}px ${y1}px, ${x2}px ${y1}px, ${x2}px ${y2}px, ${x1}px ${y2}px, ${x1}px ${y1}px)`;
				}
			};

			const sequence = direction === 'in' ? frames : [...frames].reverse();
			await new Promise<void>((resolve) => {
				const start = performance.now();
				const tick = (now: number) => {
					const t = Math.min(1, (now - start) / durationMs);
					const pos = t * (sequence.length - 1);
					const i = Math.min(sequence.length - 2, Math.floor(pos));
					const a = sequence[Math.max(0, i)];
					const b = sequence[Math.min(sequence.length - 1, i + 1)];
					const u = pos - Math.max(0, i);
					apply({
						k: a.k + (b.k - a.k) * u,
						ox: a.ox + (b.ox - a.ox) * u,
						oy: a.oy + (b.oy - a.oy) * u,
						e: a.e + (b.e - a.e) * u
					});
					if (t < 1) requestAnimationFrame(tick);
					else resolve();
				};
				requestAnimationFrame(tick);
			});

			const cursor = document.getElementById('tutorial-cursor');
			const cursorPos = cursor && cursor.style.left
				? { x: parseFloat(cursor.style.left), y: parseFloat(cursor.style.top) }
				: null;

			if (direction === 'out') {
				html.style.transform = state.prevTransform;
				html.style.transformOrigin = state.prevOrigin;
				html.removeAttribute('data-tutorial-zoom');
				for (const { el, prev } of state.fixed) el.style.translate = prev;
				// Everything in the layer (incl. a banner shown while zoomed) goes back to <body>.
				for (const el of Array.from(state.layer.children) as Element[]) {
					if (el === state.blur) continue;
					document.body.appendChild(el);
					settle(el);
				}
				if (state.layer.matches(':popover-open')) state.layer.hidePopover();
				state.layer.remove();
				delete w.__tutorialZoom;
			}
			return cursorPos;
		}, args);
	}
}
