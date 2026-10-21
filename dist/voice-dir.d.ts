/** Pre-0.5 cache location — inside the app's static/, so it shipped in the app build. Still read. */
export declare const LEGACY_VOICE_DIR: string;
/** URL path the browser plays clips from; Playwright answers it from the cache (page.route). */
export declare const VOICE_URL_PATH = "/__playwright-director/voice";
/** Voice clip cache: TUTORIAL_VOICE_DIR, default tutorials/.cache/voice (outside static/ and public/). */
export declare function voiceCacheDir(): string;
/** A clip missing from the cache but present in the legacy dir is copied in once. Returns true if adopted. */
export declare function adoptLegacyClip(filename: string, dir?: string): boolean;
//# sourceMappingURL=voice-dir.d.ts.map