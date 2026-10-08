import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { buildMergeCommand } from './merge.js';
import { buildTranscriptMarkdown } from './transcript.js';
import { fastForwardOutputMs, type FastForwardSegment } from './fast-forward.js';

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
export class TutorialTimeline {
	private testName: string;
	private testTitle: string;
	private title: string = '';
	private testFile: string;
	private projectName: string;
	private lang: string;
	private feature: string = '';
	private variant: string = '';
	private musicOptions: TimelineMusicOptions;
	private startTime: number = 0;
	private videoTrimMs: number = 0;
	private syncMarker: boolean = false;
	private steps: TimelineStep[] = [];
	private fastForwards: FastForwardSegment[] = [];
	private openFastForward: { startMs: number; speed: number; vhs: boolean } | null = null;
	private videoPath: string = '';

	constructor(
		testName: string,
		testFile: string = '',
		projectName: string = '',
		lang: string = 'fr',
		testTitle: string = '',
		feature: string = '',
		musicOptions: TimelineMusicOptions = {},
		title: string = '',
		variant: string = ''
	) {
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
	start(videoTrimMs: number = 0, syncMarker: boolean = false): void {
		this.startTime = Date.now();
		this.videoTrimMs = videoTrimMs;
		this.syncMarker = syncMarker;
		console.log(`[Timeline] Started at ${new Date().toISOString()} (trim ${videoTrimMs}ms from video start)`);
	}

	/**
	 * Set the video path (from Playwright's page.video()?.path())
	 */
	setVideoPath(path: string): void {
		this.videoPath = path;
	}

	/** Open a fast-forwarded span at `timestamp` (epoch ms). */
	startFastForward(speed: number, timestamp: number, vhs: boolean = true): void {
		if (this.openFastForward) this.endFastForward(timestamp);
		this.openFastForward = { startMs: timestamp - this.startTime, speed, vhs };
	}

	/** Close the open fast-forwarded span at `timestamp` (epoch ms). No-op when none is open. */
	endFastForward(timestamp: number): void {
		const open = this.openFastForward;
		if (!open) return;
		this.openFastForward = null;
		const segment = this.closeFastForward(open, timestamp - this.startTime);
		if (segment) {
			this.fastForwards.push(segment);
			console.log(`[Timeline] Fast-forward ×${segment.speed}: ${segment.startMs}–${segment.endMs}ms tape → ${segment.outputStartMs}–${segment.outputEndMs}ms video`);
		}
	}

	private closeFastForward(open: { startMs: number; speed: number; vhs: boolean }, endMs: number): FastForwardSegment | null {
		if (endMs <= open.startMs) return null;
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
	private segmentsAt(tapeMs: number): FastForwardSegment[] {
		const open = this.openFastForward && this.closeFastForward(this.openFastForward, tapeMs);
		return open ? [...this.fastForwards, open] : this.fastForwards;
	}

	/**
	 * Record a step at a specific timestamp (for accurate voice timing).
	 * `startMs` is stored in final-video time, i.e. after fast-forwards.
	 */
	addStep(step: number, title: string, audioFile: string, durationMs: number, timestamp: number, text?: string, key?: string, scene?: string | string[]): void {
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
	getData(): TimelineData {
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
	save(outputPath: string): void {
		const data = this.getData();
		writeFileSync(outputPath, JSON.stringify(data, null, 2));
		console.log(`[Timeline] Saved to ${outputPath}`);

		const transcriptDir = join(process.cwd(), 'tutorials/transcripts');
		if (!existsSync(transcriptDir)) mkdirSync(transcriptDir, { recursive: true });

		const transcriptPath = join(transcriptDir, `${data.testName}.md`);
		writeFileSync(transcriptPath, buildTranscriptMarkdown(data), 'utf-8');
		console.log(`[Timeline] Transcript: tutorials/transcripts/${data.testName}.md`);
	}
}
