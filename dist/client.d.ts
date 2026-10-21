/**
 * Headless data API for a deployed playwright-director gallery — "bring your own UI".
 *
 *   import { load } from 'playwright-director/client';
 *   const t = await load('create-account', { baseUrl: 'https://tutorials.example.com/', lang: 'fr' });
 *   video.src = t.video; t.steps.forEach((s) => addChapter(s.at, s.title));
 *
 * Browser-safe, zero dependencies. The gallery also serves this file as
 * `<site>/client.js`; widget.js builds on it (`PlaywrightDirector.load()`).
 * Payload schema: schemas/embed-v1.schema.json.
 */
import type { EmbedIndex, EmbedStep, EmbedTutorial } from './site/embed.js';
export type { EmbedIndex, EmbedIndexEntry, EmbedStep, EmbedTutorial } from './site/embed.js';
/** A tutorial payload with every URL (video, poster, page, steps[].image) made absolute. */
export interface TutorialData extends EmbedTutorial {
    /** Absolute base URL the payload was loaded from */
    baseUrl: string;
    steps: EmbedStep[];
}
export interface LoadOptions {
    /** Gallery base URL (the directory serving embed/). Relative URLs resolve against the page. */
    baseUrl: string;
    /** Preferred narration language; falls back to the tutorial's default language */
    lang?: string;
    fetch?: typeof fetch;
}
/** All tutorials of the gallery (embed/index.json). */
export declare function loadIndex(options: Omit<LoadOptions, 'lang'>): Promise<EmbedIndex>;
/** One tutorial, URLs resolved. Rejects with a message naming the URL and the reason. */
export declare function load(slug: string, options: LoadOptions): Promise<TutorialData>;
/** The chapter playing at `time` seconds — the last step whose `at` is reached. */
export declare function currentStep(steps: EmbedStep[], time: number): EmbedStep | undefined;
//# sourceMappingURL=client.d.ts.map