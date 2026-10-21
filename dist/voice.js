import { createHash } from 'crypto';
import { existsSync, mkdirSync } from 'fs';
import { join, basename } from 'path';
import { createTTSProvider } from './tts-provider.js';
import { voiceCacheDir, adoptLegacyClip, VOICE_URL_PATH } from './voice-dir.js';
const TUTORIAL_MODE = process.env.TUTORIAL_MODE === 'true';
/** Cache path of a clip, adopting a pre-0.5 clip from static/ on the way. */
function clipPath(filename) {
    const dir = voiceCacheDir();
    if (!existsSync(dir))
        mkdirSync(dir, { recursive: true });
    adoptLegacyClip(filename, dir);
    return join(dir, filename);
}
/**
 * Get hash-based filename for text
 */
function getAudioFilename(text, lang) {
    const hash = createHash('md5').update(`${lang}:${text}`).digest('hex').slice(0, 12);
    const ext = process.platform === 'darwin' ? 'wav' : 'mp3';
    return `${hash}.${ext}`;
}
/**
 * TTS voice generation for tutorials.
 * Pre-generates audio files and tracks their durations.
 * Optionally plays audio in browser during test.
 */
export class TutorialVoice {
    page;
    options;
    ttsProvider = null;
    preloadedAudio = new Map();
    constructor(page, options) {
        this.page = page;
        this.options = {
            lang: options.lang,
            voiceName: options.voiceName,
            voiceRate: options.voiceRate,
            voicePitch: options.voicePitch,
            playInBrowser: options.playInBrowser ?? true,
            audioBaseUrl: options.audioBaseUrl ?? 'http://localhost:5173'
        };
    }
    switchPage(page) {
        this.page = page;
    }
    routedPages = new WeakSet();
    /** The app server no longer serves the clips: Playwright answers the voice URLs from the cache. */
    async ensureVoiceRoute() {
        if (this.routedPages.has(this.page) || typeof this.page.route !== 'function')
            return;
        this.routedPages.add(this.page);
        await this.page
            .route(`**${VOICE_URL_PATH}/*`, (route) => {
            const path = join(voiceCacheDir(), basename(new URL(route.request().url()).pathname));
            return existsSync(path) ? route.fulfill({ path }) : route.fulfill({ status: 404 });
        })
            .catch(() => { });
    }
    /**
     * Pre-generate a single audio file (non-blocking).
     * Returns a promise that resolves when preload is complete.
     * No-op when TUTORIAL_MODE is not enabled.
     */
    preloadSingle(text) {
        if (!TUTORIAL_MODE)
            return Promise.resolve();
        return this.generateAudio(text).then(() => { });
    }
    /**
     * Pre-generate all audio files before the test runs.
     * No-op when TUTORIAL_MODE is not enabled.
     */
    async preload(texts) {
        if (!TUTORIAL_MODE)
            return;
        // Initialize TTS provider
        if (!this.ttsProvider) {
            this.ttsProvider = await createTTSProvider({
                lang: this.options.lang,
                voice: this.options.voiceName || undefined,
                rate: this.options.voiceRate
            });
            console.log(`[Voice] Using TTS provider: ${this.ttsProvider.name}`);
        }
        console.log(`[Voice] Preloading ${texts.length} audio files...`);
        const startTime = Date.now();
        for (const text of texts) {
            const filename = getAudioFilename(text, this.options.lang);
            const filePath = clipPath(filename);
            const url = `${VOICE_URL_PATH}/${filename}`;
            let durationMs;
            // Check cache
            if (existsSync(filePath)) {
                // Get duration from cached file
                durationMs = await this.getAudioDuration(filePath);
            }
            else {
                // Generate audio file
                const result = await this.ttsProvider.synthesize(text, filePath);
                durationMs = result.duration;
            }
            this.preloadedAudio.set(text, {
                text,
                filename,
                filePath,
                url,
                durationMs
            });
        }
        console.log(`[Voice] Preloaded ${texts.length} files in ${Date.now() - startTime}ms`);
    }
    /**
     * Get audio info for a text (must be preloaded first)
     */
    getAudio(text) {
        return this.preloadedAudio.get(text);
    }
    /**
     * Get duration in ms for a text (must be preloaded)
     */
    getDuration(text) {
        return this.preloadedAudio.get(text)?.durationMs ?? 0;
    }
    /**
     * Get the filename for a text (for timeline)
     */
    getFilename(text) {
        const cached = this.preloadedAudio.get(text);
        if (cached)
            return cached.filename;
        return getAudioFilename(text, this.options.lang);
    }
    /**
     * Start audio playback without waiting for it to finish.
     * Returns the clip duration in ms — the caller owns the wall clock
     * (action offset + clamp to duration), so headed playback and the
     * ffmpeg merge stay in sync.
     * No-op when TUTORIAL_MODE is not enabled (returns 0).
     */
    async startPlayback(text) {
        if (!TUTORIAL_MODE)
            return 0;
        let audio = this.preloadedAudio.get(text);
        if (!audio)
            audio = await this.generateAudio(text);
        if (!audio) {
            console.warn(`[Voice] Failed to generate audio for: "${text.substring(0, 30)}..."`);
            return 0;
        }
        if (this.options.playInBrowser) {
            await this.ensureVoiceRoute();
            // Fire-and-forget: a navigation during the step action may kill the
            // context — playback loss is acceptable, timing comes from durationMs.
            await this.page
                .evaluate(({ url }) => {
                new Audio(url).play().catch(() => { });
            }, { url: `${this.options.audioBaseUrl}${audio.url}` })
                .catch(() => { });
        }
        return audio.durationMs;
    }
    /**
     * Play audio in browser (optional, for live viewing)
     * Returns duration in ms
     * Will generate audio on-demand if not preloaded.
     * No-op when TUTORIAL_MODE is not enabled (returns 0).
     */
    async play(text) {
        if (!TUTORIAL_MODE)
            return 0;
        let audio = this.preloadedAudio.get(text);
        if (!audio) {
            audio = await this.generateAudio(text);
        }
        if (!audio) {
            console.warn(`[Voice] Failed to generate audio for: "${text.substring(0, 30)}..."`);
            return 0;
        }
        if (this.options.playInBrowser) {
            await this.ensureVoiceRoute();
            await this.page.evaluate(({ url }) => {
                return new Promise((resolve) => {
                    const audio = new Audio(url);
                    audio.onended = () => resolve();
                    audio.onerror = () => resolve();
                    audio.play().catch(() => resolve());
                });
            }, { url: `${this.options.audioBaseUrl}${audio.url}` });
        }
        else {
            // Just wait for the duration (silent)
            await this.page.waitForTimeout(audio.durationMs);
        }
        return audio.durationMs;
    }
    /**
     * Generate audio for a single text on demand
     */
    async generateAudio(text) {
        // Initialize TTS provider if needed
        if (!this.ttsProvider) {
            this.ttsProvider = await createTTSProvider({
                lang: this.options.lang,
                voice: this.options.voiceName || undefined,
                rate: this.options.voiceRate
            });
        }
        const filename = getAudioFilename(text, this.options.lang);
        const filePath = clipPath(filename);
        const url = `${VOICE_URL_PATH}/${filename}`;
        let durationMs;
        try {
            // Check cache first
            if (existsSync(filePath)) {
                durationMs = await this.getAudioDuration(filePath);
            }
            else {
                // Generate audio file
                const result = await this.ttsProvider.synthesize(text, filePath);
                durationMs = result.duration;
            }
            const audio = {
                text,
                filename,
                filePath,
                url,
                durationMs
            };
            // Cache for future use
            this.preloadedAudio.set(text, audio);
            return audio;
        }
        catch (error) {
            console.error(`[Voice] Error generating audio: ${error}`);
            return null;
        }
    }
    /**
     * Get audio duration using ffprobe or file stats
     */
    async getAudioDuration(filePath) {
        try {
            const { execSync } = await import('child_process');
            const output = execSync(`ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${filePath}"`, { encoding: 'utf-8' });
            return Math.ceil(parseFloat(output.trim()) * 1000);
        }
        catch {
            // Fallback: estimate based on file size (rough)
            const { statSync } = await import('fs');
            const stats = statSync(filePath);
            // Rough estimate: ~16KB per second for wav at 44100Hz mono
            return Math.ceil((stats.size / 16000) * 1000);
        }
    }
}
//# sourceMappingURL=voice.js.map