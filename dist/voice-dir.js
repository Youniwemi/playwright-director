import { copyFileSync, existsSync, mkdirSync } from 'fs';
import { join, resolve } from 'path';
/** Pre-0.5 cache location — inside the app's static/, so it shipped in the app build. Still read. */
export const LEGACY_VOICE_DIR = join('static', 'audio', 'tutorial-voice');
/** URL path the browser plays clips from; Playwright answers it from the cache (page.route). */
export const VOICE_URL_PATH = '/__playwright-director/voice';
/** Voice clip cache: TUTORIAL_VOICE_DIR, default tutorials/.cache/voice (outside static/ and public/). */
export function voiceCacheDir() {
    return resolve(process.env.TUTORIAL_VOICE_DIR || join('tutorials', '.cache', 'voice'));
}
/** A clip missing from the cache but present in the legacy dir is copied in once. Returns true if adopted. */
export function adoptLegacyClip(filename, dir = voiceCacheDir()) {
    const target = join(dir, filename);
    const legacy = resolve(LEGACY_VOICE_DIR, filename);
    if (existsSync(target) || !existsSync(legacy))
        return false;
    mkdirSync(dir, { recursive: true });
    copyFileSync(legacy, target);
    return true;
}
//# sourceMappingURL=voice-dir.js.map