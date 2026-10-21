import type { UiStrings } from './strings.js';
import type { Tokens } from './tokens.js';
import type { TutorialLinks } from '../types.js';
export type { TutorialLinks };
/** A string, or one per language (`{ fr: '…', en: '…' }`) */
export type Localized = string | Record<string, string>;
export interface SiteCategory {
    icon?: string;
    label: Localized;
    /** One line under the section title */
    blurb?: Localized;
    /** Tutorial slugs of this section, in display order — wins over the timeline `feature` */
    items?: string[];
}
export interface SiteConfig {
    title: string;
    logo?: string;
    /** Same as `tokens.primary` */
    primaryColor?: string;
    /** Same as `tokens.fontBody` */
    font?: string;
    /** Site theme: 'academy' (default) or 'classic' */
    theme?: 'academy' | 'classic';
    /** Design tokens over the theme defaults, e.g. `{ primary: '#0b5d47', radius: '12px' }` */
    tokens?: Tokens;
    /** Google Fonts families (`'Manrope:wght@400;600'`); default: the theme's; `false` = none */
    googleFonts?: string[] | false;
    /** Extra stylesheet, loaded after the theme */
    css?: string;
    /** Folder copied over the site's `src/` — replaces any component, theme or page file */
    overrides?: string;
    /** Links between builds of this gallery in other themes: `{ 'Academy': '/help/', 'Classic': '/help/classic/' }` */
    themeSwitcher?: Record<string, string>;
    /** App origin: the tutorial `links.app` paths are resolved against it, and the call-to-action opens it */
    appUrl?: string;
    /** Docs origin for `links.docs` paths; `{lang}` is replaced by the tutorial language */
    docsUrl?: string;
    /** Académie "try it yourself" panel on video pages (default true when there is an app link) */
    cta?: boolean;
    input: string;
    output: string;
    /** Timeline JSON dir (default `<input>/output`) — match TUTORIAL_OUTPUT_DIR if you override it */
    timelines?: string;
    /** Videos + step screenshots dir (default `<input>/videos`) */
    videos?: string;
    /** Full public URL ("https://docs.example.com/help/") or a path ("/help/") — the base path prefixes every link */
    baseUrl: string;
    /** Access-Control-Allow-Origin written to the `_headers` file (Cloudflare Pages / Netlify): '*' (default), one origin, or false for no file */
    cors?: string | false;
    /** Single lang or comma-separated list, e.g. "fr,en,ar" — the first one is the default */
    lang: string;
    /** UI string overrides per language, merged over the built-in en/fr/ar
     *  (site chrome + widget), e.g. `{ fr: { allTutorials: 'Toute l’aide' }, es: { … } }` */
    strings?: Record<string, Partial<UiStrings>>;
    tutorials?: {
        /** Sections in display order */
        categories?: Record<string, SiteCategory>;
        ui?: {
            heroTitle?: Localized;
            heroSubtitle?: Localized;
        };
        /** Slug of the "start here" tutorial (Académie hero) */
        featured?: string;
        /** Slugs shown with a PRO badge */
        premium?: string[];
        /** Per-slug links, over the ones declared in the test: `{ invoice: { app: '/invoices/new', docs: '/invoices/' } }` */
        links?: Record<string, TutorialLinks>;
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
    /** Oldest recording of this slug (any language/variant), YYYY-MM-DD */
    uploadDate: string;
    /** Newest recording of this slug, YYYY-MM-DD */
    dateModified?: string;
    /** Absolute app / docs URLs (test `links` resolved on `appUrl` / `docsUrl`, config overrides) */
    links?: TutorialLinks;
    steps: number;
    /** Intro narration (leading context steps), shown under the video title */
    description?: string;
    /** Step-by-step guide rendered on the video page */
    stepsDetail?: ManifestStep[];
}
export interface VideoManifest {
    /** Sections in display order */
    categories: Record<string, {
        icon?: string;
        label: Localized;
        blurb?: Localized;
    }>;
    /** Slug of the "start here" tutorial */
    featured?: string;
    videos: VideoManifestEntry[];
    ui: {
        heroTitle: Localized;
        heroSubtitle: Localized;
    };
}
//# sourceMappingURL=types.d.ts.map