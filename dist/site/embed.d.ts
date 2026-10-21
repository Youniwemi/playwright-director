import type { SiteConfig, VideoManifest, VideoManifestEntry } from './types.js';
/** Bumped on any breaking change to the embed payloads; additions keep it. */
export declare const EMBED_SCHEMA_VERSION = 1;
/** One step of a payload. Display numbers are precomputed
 *  (sequential, contexts don't count) so any player stays dumb. */
export interface EmbedStep {
    num?: number;
    /** Start time in the video, seconds — seek here for chapters. Absent for screenshot-only steps. */
    at?: number;
    /** Human heading (never the raw i18n key) */
    title?: string;
    /** i18n key the step was declared with */
    key?: string;
    text?: string;
    /** Base-relative screenshot path, e.g. "videos/demo-step-1.webp" */
    image?: string;
    context?: boolean;
}
/** Payload served at embed/<id>.json — everything a player needs to render
 *  one tutorial. All paths are relative to the site base URL (the directory
 *  serving widget.js and embed/). Schema: schemas/embed-v1.schema.json. */
export interface EmbedTutorial {
    schemaVersion: number;
    id: string;
    title: string;
    description?: string;
    /** "m:ss" display string ('' when unknown) */
    duration: string;
    durationSeconds: number;
    variant?: string;
    lang: string;
    /** id without its `.<lang>` suffix */
    slug?: string;
    /** Every language this tutorial was recorded in */
    langs?: string[];
    /** Site primary color — the widget's default accent */
    accent: string;
    /** Base-relative video path ("videos/<file>") */
    video: string;
    /** Base-relative poster image */
    poster?: string;
    /** Base-relative path of the full tutorial page ("<id>/") */
    page: string;
    /** Absolute URLs: the app screen this tutorial shows, its documentation page */
    links?: {
        app?: string;
        docs?: string;
    };
    steps: EmbedStep[];
}
export interface EmbedIndexEntry {
    id: string;
    slug?: string;
    title: string;
    duration: string;
    durationSeconds: number;
    lang: string;
    langs?: string[];
    variant?: string;
}
export interface EmbedIndex {
    schemaVersion: number;
    /** Site default language — embed/<slug>.json holds it */
    defaultLang?: string;
    tutorials: EmbedIndexEntry[];
}
/** config.lang may be a comma-separated list — the first entry is the site default */
export declare const siteLang: (config: Pick<SiteConfig, "lang">) => string;
/** Poster: the recorded one, else the first step screenshot (the site template has its own copy in lib/site.ts) */
export declare const posterOf: (video: VideoManifestEntry) => string | undefined;
export declare function buildEmbedTutorial(video: VideoManifestEntry, config: SiteConfig): EmbedTutorial;
/** All the JSON files players consume: one payload per tutorial plus an
 *  index (slug discovery). Paths are relative to the site root — scaffold
 *  writes them under public/. */
export declare function buildEmbedFiles(manifest: VideoManifest, config: SiteConfig): {
    path: string;
    data: EmbedTutorial | EmbedIndex;
}[];
//# sourceMappingURL=embed.d.ts.map