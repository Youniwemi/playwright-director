import type { TimelineData } from '../timeline.js';
export interface ScannedTutorial {
    timeline: TimelineData;
    videoFile: string;
    /** ISO date of the recording */
    recordedAt: string;
    /** Screenshot filenames with their step number, sorted by step number */
    stepScreenshots: {
        n: number;
        file: string;
    }[];
    /** `<name>-poster.*` filename, when the recording wrote one */
    poster?: string;
}
/** Timelines default to `<input>/output`, videos to `<input>/videos`. */
export declare function scanTutorials(inputDir: string, outputDir?: string, videosDir?: string): ScannedTutorial[];
//# sourceMappingURL=scan-tutorials.d.ts.map