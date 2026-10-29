import type { ManifestStep, SiteConfig, VideoManifest } from './types.js';
import type { ScannedTutorial } from './scan-tutorials.js';
import { type Pace } from '../pace.js';
/**
 * Merge a tutorial's timeline narration with its step screenshots into the
 * step-by-step guide shown on the video page. Leading context narrations
 * become the page description; mid-flow contexts stay in the list as
 * unnumbered entries; screenshots of non-voiced steps (absent from the
 * timeline) are inserted at their step position with no text.
 */
export declare function buildStepsDetail(t: ScannedTutorial): {
    description?: string;
    stepsDetail: ManifestStep[];
};
/** A link path on an origin (`{lang}` replaced); full URLs and missing origins leave the path as is. */
export declare function resolveLink(path: string | undefined, origin: string | undefined, lang: string): string | undefined;
/**
 * One cut per recording: the same test (`testFile` + `testTitle` + variant + lang) recorded at several
 * paces keeps the first pace of `preference`, else the first of the others (PACES order).
 */
export declare function pickPaces(tutorials: ScannedTutorial[], preference?: Pace | Pace[]): ScannedTutorial[];
export declare function generateManifest(allScanned: ScannedTutorial[], config: SiteConfig): VideoManifest;
//# sourceMappingURL=generate-manifest.d.ts.map