import type { SiteConfig, VideoManifest } from './types.js';
/**
 * Cloudflare Pages / Netlify `_headers`: CORS on what an app on another origin
 * fetches (embed JSON, client.js, widget.js, videos/posters), a short cache on
 * the data and scripts (they change on every build) and a longer one on media.
 * Returns '' when `cors` is false.
 */
export declare function buildHeadersFile(basePath: string, cors: string | false): string;
export declare function scaffold(config: SiteConfig, manifest: VideoManifest, tempDir: string): string;
//# sourceMappingURL=scaffold.d.ts.map