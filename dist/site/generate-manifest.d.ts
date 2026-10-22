import type { ManifestStep, SiteConfig, VideoManifest, VideoManifestEntry } from './types.js';
import type { ScannedTutorial } from './scan-tutorials.js';
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
 * The site's video pages: every recording, plus — when `lang` lists several languages — a page for each language
 * a tutorial (slug + variant) was not recorded in, playing the default-language recording (else the first one)
 * with the UI in the page language (`videoLang` = the recording's). `tutorials.paths` overrides page paths.
 */
export declare function buildPages(manifest: VideoManifest, config: SiteConfig): VideoManifestEntry[];
export declare function generateManifest(tutorials: ScannedTutorial[], config: SiteConfig): VideoManifest;
//# sourceMappingURL=generate-manifest.d.ts.map