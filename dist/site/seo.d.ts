import type { SiteConfig, VideoManifest, VideoManifestEntry } from './types.js';
/** Absolute site URL with a trailing slash, or undefined when baseUrl is only a path */
export declare function siteUrlOf(config: Pick<SiteConfig, 'baseUrl'>): string | undefined;
/** 206 → "PT3M26S" */
export declare function isoDuration(seconds: number): string;
/** schema.org VideoObject for one video page, chapters as `hasPart` Clips (Google "key moments") */
export declare function videoJsonLd(v: VideoManifestEntry, site: string): Record<string, unknown>;
/** Home pages (one per language) + every video page, each with its language alternates */
export declare function buildSitemap(manifest: VideoManifest, site: string, defaultLang: string): string;
export declare function buildRobots(site: string): string;
export interface DocsLink {
    slug: string;
    lang?: string;
    title: string;
    url: string;
    poster?: string;
    duration: string;
    durationSeconds: number;
}
/** links.json: docs URL → the tutorials that link to it, so a docs site can render "watch the video" cards */
export declare function buildLinksFile(manifest: VideoManifest, site: string): Record<string, DocsLink[]>;
//# sourceMappingURL=seo.d.ts.map