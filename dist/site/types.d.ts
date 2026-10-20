export interface SiteConfig {
    title: string;
    logo?: string;
    primaryColor: string;
    font: string;
    input: string;
    output: string;
    /** Timeline JSON dir (default `<input>/output`) — match TUTORIAL_OUTPUT_DIR if you override it */
    timelines?: string;
    /** Videos + step screenshots dir (default `<input>/videos`) */
    videos?: string;
    baseUrl: string;
    /** Single lang or comma-separated list, e.g. "fr,en,ar" */
    lang: string;
    tutorials?: {
        categories?: Record<string, {
            icon: string;
            label: string;
        }>;
        ui?: {
            heroTitle?: string;
            heroSubtitle?: string;
        };
        /** Video page step guide layout:
         *  - 'text':  text-only cards, click to reveal the screenshot (default)
         *  - 'cards': numbered text cards with a small screenshot, click to enlarge
         *  - 'full':  full-width screenshot under each step's text
         *  - 'none':  no step guide */
        stepsLayout?: 'text' | 'cards' | 'full' | 'none';
        /** Horizontal thumbnail strip under the video info (default true).
         *  Independent of stepsLayout; clicking a thumbnail opens the screenshot
         *  with its step's title + text. */
        showStrip?: boolean;
    };
}
/** One entry of a video page's step-by-step guide, built from the timeline
 *  narration merged with the step screenshots. */
export interface ManifestStep {
    /** Timeline step number; absent for mid-flow context narrations */
    n?: number;
    /** Start time in the final video, seconds; absent for screenshot-only steps */
    at?: number;
    /** Human heading — the narration's first sentence when the step was never translated */
    title?: string;
    /** i18n key the step was declared with */
    key?: string;
    /** Narration text spoken during this step */
    text?: string;
    /** Screenshot filename relative to videos/ */
    image?: string;
    /** True for a context narration shown between steps (no number, no image) */
    context?: boolean;
}
export interface VideoManifestEntry {
    id: string;
    category: string;
    title: string;
    duration: string;
    /** Final video length in seconds (0 when unknown) */
    durationSeconds: number;
    /** Narration language, from the timeline */
    lang?: string;
    /** id without its `.<lang>` suffix (TUTORIAL_LANG recordings) — groups one tutorial's languages */
    slug?: string;
    /** Every language this slug was recorded in, sorted */
    langs?: string[];
    premium: boolean;
    /** Filename relative to videos/ */
    file: string;
    /** `<id>-poster.*` filename relative to videos/, when recorded */
    poster?: string;
    feature?: string;
    /** Recording variant (e.g. 'mobile'); absent = regular/desktop */
    variant?: string;
    uploadDate: string;
    dateModified?: string;
    steps: number;
    /** Intro narration (leading context steps), shown under the video title */
    description?: string;
    /** Step-by-step guide rendered on the video page */
    stepsDetail?: ManifestStep[];
}
export interface VideoManifest {
    categories: Record<string, {
        icon: string;
        label: string;
    }>;
    videos: VideoManifestEntry[];
    ui: {
        heroTitle: string;
        heroSubtitle: string;
    };
}
//# sourceMappingURL=types.d.ts.map