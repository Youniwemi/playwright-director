import { type FastForwardSegment } from './fast-forward.js';
export interface TimelineStep {
    step: number;
    title: string;
    text?: string;
    key?: string;
    audioFile: string;
    startMs: number;
    durationMs: number;
    /** Scene(s) on stage for this step — tells a transcript reader who was on
     *  screen. An array means two scenes shared the stage. */
    scene?: string | string[];
}
export interface TimelineData {
    testName: string;
    /** Raw test title passed to Playwright's `test(...)` — the i18n key.
     *  Lets the reporter match a timeline to its testCase without re-deriving testName. */
    testTitle: string;
    /** Display title from the Tutorial options — what the gallery site shows on the card. */
    title?: string;
    testFile: string;
    projectName: string;
    lang: string;
    /** Duration of the final video — fast-forwarded spans count at their sped-up length. */
    totalDurationMs: number;
    /** Recorded (tape) duration, only present when something was fast-forwarded. */
    tapeDurationMs?: number;
    /** Fast-forwarded spans, in order. Step `startMs` values are already in
     *  final-video time; these carry tape time too, for ffmpeg's setpts. */
    fastForward?: FastForwardSegment[];
    /** Milliseconds to trim from video start (preload time) */
    videoTrimMs: number;
    /** True when a full-screen black sync marker was recorded right before
     *  timeline zero — the reporter then computes the exact trim from the
     *  video itself (blackdetect) instead of trusting videoTrimMs. */
    syncMarker?: boolean;
    steps: TimelineStep[];
    /** Video file path from Playwright */
    videoPath: string;
    /** Pre-built ffmpeg command */
    mergeCommand: string;
    /** Feature name sourced from @feature:* test tag */
    feature?: string;
    /** Recording variant (e.g. 'mobile') — testName already carries its suffix.
     *  Lets the reporter pick the right timeline when the same test was recorded
     *  in several variants, and the site filter videos by variant. */
    variant?: string;
}
export interface TimelineMusicOptions {
    musicFile?: string;
    musicVolume?: number;
    voiceVolume?: number;
}
/**
 * Tracks timing of tutorial steps for post-processing audio merge.
 */
export declare class TutorialTimeline {
    private testName;
    private testTitle;
    private title;
    private testFile;
    private projectName;
    private lang;
    private feature;
    private variant;
    private musicOptions;
    private startTime;
    private videoTrimMs;
    private syncMarker;
    private steps;
    private fastForwards;
    private openFastForward;
    private videoPath;
    constructor(testName: string, testFile?: string, projectName?: string, lang?: string, testTitle?: string, feature?: string, musicOptions?: TimelineMusicOptions, title?: string, variant?: string);
    /**
     * Mark the start of the tutorial (second 0 for video)
     */
    start(videoTrimMs?: number, syncMarker?: boolean): void;
    /**
     * Set the video path (from Playwright's page.video()?.path())
     */
    setVideoPath(path: string): void;
    /** Open a fast-forwarded span at `timestamp` (epoch ms). */
    startFastForward(speed: number, timestamp: number, vhs?: boolean): void;
    /** Close the open fast-forwarded span at `timestamp` (epoch ms). No-op when none is open. */
    endFastForward(timestamp: number): void;
    private closeFastForward;
    /** Spans so far, the open one (if any) closed at `tapeMs`. */
    private segmentsAt;
    /**
     * Record a step at a specific timestamp (for accurate voice timing).
     * `startMs` is stored in final-video time, i.e. after fast-forwards.
     */
    addStep(step: number, title: string, audioFile: string, durationMs: number, timestamp: number, text?: string, key?: string, scene?: string | string[]): void;
    /**
     * Get the timeline data with merge command
     */
    getData(): TimelineData;
    /**
     * Save timeline to JSON file and auto-generate transcript markdown.
     */
    save(outputPath: string): void;
}
//# sourceMappingURL=timeline.d.ts.map