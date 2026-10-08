import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { buildMergeCommand } from './merge.js';
import { buildTranscriptMarkdown } from './transcript.js';
import { fastForwardOutputMs } from './fast-forward.js';
/**
 * Tracks timing of tutorial steps for post-processing audio merge.
 */
export class TutorialTimeline {
    testName;
    testTitle;
    title = '';
    testFile;
    projectName;
    lang;
    feature = '';
    variant = '';
    musicOptions;
    startTime = 0;
    videoTrimMs = 0;
    syncMarker = false;
    steps = [];
    fastForwards = [];
    openFastForward = null;
    videoPath = '';
    constructor(testName, testFile = '', projectName = '', lang = 'fr', testTitle = '', feature = '', musicOptions = {}, title = '', variant = '') {
        this.variant = variant;
        this.testName = testName;
        this.testTitle = testTitle;
        this.title = title;
        this.testFile = testFile;
        this.projectName = projectName;
        this.lang = lang;
        this.feature = feature;
        this.musicOptions = musicOptions;
    }
    /**
     * Mark the start of the tutorial (second 0 for video)
     */
    start(videoTrimMs = 0, syncMarker = false) {
        this.startTime = Date.now();
        this.videoTrimMs = videoTrimMs;
        this.syncMarker = syncMarker;
        console.log(`[Timeline] Started at ${new Date().toISOString()} (trim ${videoTrimMs}ms from video start)`);
    }
    /**
     * Set the video path (from Playwright's page.video()?.path())
     */
    setVideoPath(path) {
        this.videoPath = path;
    }
    /** Open a fast-forwarded span at `timestamp` (epoch ms). */
    startFastForward(speed, timestamp, vhs = true) {
        if (this.openFastForward)
            this.endFastForward(timestamp);
        this.openFastForward = { startMs: timestamp - this.startTime, speed, vhs };
    }
    /** Close the open fast-forwarded span at `timestamp` (epoch ms). No-op when none is open. */
    endFastForward(timestamp) {
        const open = this.openFastForward;
        if (!open)
            return;
        this.openFastForward = null;
        const segment = this.closeFastForward(open, timestamp - this.startTime);
        if (segment) {
            this.fastForwards.push(segment);
            console.log(`[Timeline] Fast-forward ×${segment.speed}: ${segment.startMs}–${segment.endMs}ms tape → ${segment.outputStartMs}–${segment.outputEndMs}ms video`);
        }
    }
    closeFastForward(open, endMs) {
        if (endMs <= open.startMs)
            return null;
        return {
            startMs: open.startMs,
            endMs,
            speed: open.speed,
            outputStartMs: fastForwardOutputMs(open.startMs, this.fastForwards),
            outputEndMs: fastForwardOutputMs(endMs, [...this.fastForwards, { ...open, endMs }]),
            ...(open.vhs ? {} : { vhs: false })
        };
    }
    /** Spans so far, the open one (if any) closed at `tapeMs`. */
    segmentsAt(tapeMs) {
        const open = this.openFastForward && this.closeFastForward(this.openFastForward, tapeMs);
        return open ? [...this.fastForwards, open] : this.fastForwards;
    }
    /**
     * Record a step at a specific timestamp (for accurate voice timing).
     * `startMs` is stored in final-video time, i.e. after fast-forwards.
     */
    addStep(step, title, audioFile, durationMs, timestamp, text, key, scene) {
        const tapeMs = timestamp - this.startTime;
        const startMs = fastForwardOutputMs(tapeMs, this.segmentsAt(tapeMs));
        this.steps.push({
            step,
            title,
            ...(text ? { text } : {}),
            ...(key ? { key } : {}),
            ...(scene ? { scene } : {}),
            audioFile,
            startMs,
            durationMs
        });
        console.log(`[Timeline] Step ${step}: "${title}" at ${startMs}ms (${durationMs}ms audio)`);
    }
    /**
     * Get the timeline data with merge command
     */
    getData() {
        const tapeDurationMs = Date.now() - this.startTime;
        const fastForward = this.segmentsAt(tapeDurationMs);
        const data = {
            testName: this.testName,
            testTitle: this.testTitle,
            title: this.title || undefined,
            testFile: this.testFile,
            projectName: this.projectName,
            lang: this.lang,
            feature: this.feature || undefined,
            variant: this.variant || undefined,
            totalDurationMs: fastForwardOutputMs(tapeDurationMs, fastForward),
            tapeDurationMs: fastForward.length ? tapeDurationMs : undefined,
            fastForward: fastForward.length ? fastForward : undefined,
            videoTrimMs: this.videoTrimMs,
            syncMarker: this.syncMarker || undefined,
            steps: this.steps,
            videoPath: this.videoPath
        };
        // Output filename is already language-specific (testName = slugified translated title).
        // No `-en` / `-ar` suffix needed — each locale produces its own SEO-friendly slug.
        const { command } = buildMergeCommand(data, this.videoPath, `tutorials/videos/${this.testName}.webm`, this.musicOptions);
        return {
            ...data,
            mergeCommand: command
        };
    }
    /**
     * Save timeline to JSON file and auto-generate transcript markdown.
     */
    save(outputPath) {
        const data = this.getData();
        writeFileSync(outputPath, JSON.stringify(data, null, 2));
        console.log(`[Timeline] Saved to ${outputPath}`);
        const transcriptDir = join(process.cwd(), 'tutorials/transcripts');
        if (!existsSync(transcriptDir))
            mkdirSync(transcriptDir, { recursive: true });
        const transcriptPath = join(transcriptDir, `${data.testName}.md`);
        writeFileSync(transcriptPath, buildTranscriptMarkdown(data), 'utf-8');
        console.log(`[Timeline] Transcript: tutorials/transcripts/${data.testName}.md`);
    }
}
//# sourceMappingURL=timeline.js.map