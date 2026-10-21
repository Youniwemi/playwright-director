import { readdirSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { TimelineData } from '../timeline.js';

export interface ScannedTutorial {
	timeline: TimelineData;
	videoFile: string;
	/** Screenshot filenames with their step number, sorted by step number */
	stepScreenshots: { n: number; file: string }[];
	/** `<name>-poster.*` filename, when the recording wrote one */
	poster?: string;
}

/** Timelines default to `<input>/output`, videos to `<input>/videos`. */
export function scanTutorials(
	inputDir: string,
	outputDir = join(inputDir, 'output'),
	videosDir = join(inputDir, 'videos')
): ScannedTutorial[] {
	const results: ScannedTutorial[] = [];

	if (!existsSync(videosDir)) return results;

	const videoFiles = readdirSync(videosDir).filter((f) => f.endsWith('.webm'));
	const allVideoDirFiles = readdirSync(videosDir);

	// Index timelines by testName
	const timelinesByName = new Map<string, TimelineData>();
	if (existsSync(outputDir)) {
		for (const tf of readdirSync(outputDir).filter((f) => f.endsWith('_timeline.json'))) {
			const timeline: TimelineData = JSON.parse(readFileSync(join(outputDir, tf), 'utf-8'));
			timelinesByName.set(timeline.testName, timeline);
		}
	}

	for (const videoFileName of videoFiles) {
		const baseName = videoFileName.replace(/\.webm$/, '');
		const timeline = timelinesByName.get(baseName);

		const stepPattern = new RegExp(`^${escapeRegex(baseName)}-step-(\\d+)\\.(png|jpe?g|webp|avif)$`);
		const steps: { n: number; file: string }[] = [];
		for (const file of allVideoDirFiles) {
			const m = file.match(stepPattern);
			if (m) steps.push({ n: parseInt(m[1], 10), file });
		}

		// No timeline to read from — recognize the `.<lang>` and `-mobile`/`-tablet` suffixes.
		const langSuffix = baseName.match(/\.([a-z]{2,3})$/)?.[1];
		const syntheticTimeline: TimelineData = timeline ?? {
			testName: baseName,
			testTitle: baseName,
			testFile: '',
			projectName: '',
			lang: langSuffix ?? 'fr',
			totalDurationMs: 0,
			videoTrimMs: 0,
			steps: [],
			videoPath: '',
			mergeCommand: '',
			variant: baseName.replace(/\.[a-z]{2,3}$/, '').match(/-(mobile|tablet)$/)?.[1]
		};

		const posterPattern = new RegExp(`^${escapeRegex(baseName)}-poster\\.(png|jpe?g|webp|avif)$`);
		results.push({
			timeline: syntheticTimeline,
			videoFile: videoFileName,
			stepScreenshots: steps.sort((a, b) => a.n - b.n),
			poster: allVideoDirFiles.find((f) => posterPattern.test(f))
		});
	}

	return results;
}

function escapeRegex(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
