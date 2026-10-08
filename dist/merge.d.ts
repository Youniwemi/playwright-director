import { type FastForwardSegment } from './fast-forward.js';
export interface MergeOptions {
    audioDir: string;
    musicFile: string;
    musicVolume: number;
    voiceVolume: number;
    /** Override file existence check (for testing) */
    checkFileExists?: (path: string) => boolean;
}
interface TimelineInput {
    /** Final video duration (fast-forwards already applied) */
    totalDurationMs: number;
    videoTrimMs?: number;
    /** Spans played sped up — the video stream is then re-timed by a filter */
    fastForward?: FastForwardSegment[];
    steps: Array<{
        audioFile: string;
        startMs: number;
    }>;
}
/**
 * Build the ffmpeg command to merge video with audio
 */
export declare function buildMergeCommand(timeline: TimelineInput, videoPath: string, outputPath: string, options?: Partial<MergeOptions>): {
    command: string;
    inputs: string[];
    filter: string;
};
export {};
//# sourceMappingURL=merge.d.ts.map