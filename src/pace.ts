import type { ContextStyle, Pace } from './types.js';

export type { Pace };

/**
 * Rendering pace — one written tutorial, three cuts.
 *
 * - `walkthrough` (default): everything is narrated — the historical behavior.
 * - `snippet`: documentation clip. Steps say their "do" half only, contexts
 *   their title only, clarifications are dropped, pauses are short.
 * - `demo`: showcase / social cut. Like snippet, plus no overlay description,
 *   only the goal context, a faster cursor and faster typing.
 *
 * Whatever is not narrated is still recorded in the timeline (`fullText`, or
 * an unvoiced context), so the gallery's step guide and SEO keep the "why".
 */
export const PACES: readonly Pace[] = ['walkthrough', 'snippet', 'demo'];

export interface PaceProfile {
	/** Narrate the "explain" half of two-phase steps */
	voiceExplain: boolean;
	/** Narrate the context's text after its title */
	contextText: boolean;
	/** Context styles shown and narrated; the others are recorded unvoiced */
	contexts: readonly ContextStyle[];
	/** Context shown as a corner banner over the live page instead of a centered card */
	compactContext: boolean;
	/** Show the step's description under its title in the overlay */
	overlayDescription: boolean;
	/** Pause after a context and before an unvoiced step's action (ms); `undefined` = `stepDelay` option */
	stepDelay?: number;
	/** Pause after each step's action, unless the step sets `delay` (ms) */
	afterStep: number;
	/** Hold on the completion screen before the recording ends (ms) */
	endHold: number;
	/** Cursor travel steps and pre-click pause; `undefined` = the options */
	mouseSteps?: number;
	pauseBeforeClick?: number;
	/** Multiplier on `typeSlowly` / `typeBlurred` keystroke delays */
	typingFactor: number;
}

export const PACE_PROFILES: Record<Pace, PaceProfile> = {
	walkthrough: {
		voiceExplain: true,
		contextText: true,
		contexts: ['goal', 'clarification', 'attention'],
		compactContext: false,
		overlayDescription: true,
		afterStep: 300,
		endHold: 2000,
		typingFactor: 1
	},
	snippet: {
		voiceExplain: false,
		contextText: false,
		contexts: ['goal', 'attention'],
		compactContext: true,
		overlayDescription: true,
		stepDelay: 200,
		afterStep: 150,
		endHold: 1000,
		pauseBeforeClick: 150,
		typingFactor: 0.6
	},
	demo: {
		voiceExplain: false,
		contextText: false,
		contexts: ['goal'],
		compactContext: true,
		overlayDescription: false,
		stepDelay: 150,
		afterStep: 100,
		endHold: 1500,
		mouseSteps: 15,
		pauseBeforeClick: 100,
		typingFactor: 0.4
	}
};

/** `pace` option, else `TUTORIAL_PACE`, else walkthrough. An unknown name throws with the valid list. */
export function resolvePace(option?: string, env: string | undefined = process.env.TUTORIAL_PACE): Pace {
	const value = option ?? (env || 'walkthrough');
	if (!(PACES as readonly string[]).includes(value)) {
		throw new Error(`[Tutorial] Unknown pace "${value}" — use one of: ${PACES.join(', ')}`);
	}
	return value as Pace;
}

/** testName suffix of a pace: none for walkthrough, `-<pace>` otherwise. */
export const paceSuffix = (pace: Pace | undefined): string => (pace && pace !== 'walkthrough' ? `-${pace}` : '');
