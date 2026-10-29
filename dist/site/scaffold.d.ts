import type { SiteConfig, VideoManifest } from './types.js';
/**
 * Cloudflare Pages / Netlify `_headers`: CORS on what an app on another origin
 * fetches (embed JSON, client.js, widget.js, videos/posters), a short cache on
 * the data and scripts (they change on every build) and a longer one on media.
 * Returns '' when `cors` is false.
 */
export declare function buildHeadersFile(basePath: string, cors: string | false): string;
/** Matches the files of these tutorial ids in the videos folder: `<id>.<ext>`, `<id>-poster.*`, `<id>-step-N.*` */
export declare function ownedBy(ids: string[]): (file: string) => boolean;
export declare const THEMES: readonly ["academy", "classic"];
export type Theme = (typeof THEMES)[number];
/**
 * Copy order — later wins: shared base (templates/site) → theme (templates/themes/<theme> → src/theme/)
 * → config `overrides` (over src/) → generated files (data, user.css, public/*).
 */
export declare function scaffold(config: SiteConfig, manifest: VideoManifest, tempDir: string): string;
//# sourceMappingURL=scaffold.d.ts.map