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
export const PACES = ['walkthrough', 'snippet', 'demo'];
export const PACE_PROFILES = {
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
export function resolvePace(option, env = process.env.TUTORIAL_PACE) {
    const value = option ?? (env || 'walkthrough');
    if (!PACES.includes(value)) {
        throw new Error(`[Tutorial] Unknown pace "${value}" — use one of: ${PACES.join(', ')}`);
    }
    return value;
}
/** testName suffix of a pace: none for walkthrough, `-<pace>` otherwise. */
export const paceSuffix = (pace) => (pace && pace !== 'walkthrough' ? `-${pace}` : '');
//# sourceMappingURL=pace.js.map