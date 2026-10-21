import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { voiceCacheDir, adoptLegacyClip, LEGACY_VOICE_DIR } from '../src/voice-dir.js';
import { buildMergeCommand } from '../src/merge.js';

let cwd: string;
let project: string;

beforeEach(() => {
	cwd = process.cwd();
	project = mkdtempSync(join(tmpdir(), 'pd-voice-'));
	process.chdir(project);
	delete process.env.TUTORIAL_VOICE_DIR;
});
afterEach(() => {
	process.chdir(cwd);
	rmSync(project, { recursive: true, force: true });
	delete process.env.TUTORIAL_VOICE_DIR;
	delete process.env.TUTORIAL_MODE;
});

describe('voice cache dir', () => {
	it('defaults to tutorials/.cache/voice, outside static/ and public/', () => {
		expect(voiceCacheDir()).toBe(join(process.cwd(), 'tutorials', '.cache', 'voice'));
	});

	it('follows TUTORIAL_VOICE_DIR', () => {
		process.env.TUTORIAL_VOICE_DIR = 'e2e/.voice';
		expect(voiceCacheDir()).toBe(join(process.cwd(), 'e2e', '.voice'));
	});

	it('adopts a clip from the pre-0.5 static/ cache once', () => {
		mkdirSync(LEGACY_VOICE_DIR, { recursive: true });
		writeFileSync(join(LEGACY_VOICE_DIR, 'abc.wav'), 'old');
		expect(adoptLegacyClip('abc.wav')).toBe(true);
		expect(readFileSync(join(voiceCacheDir(), 'abc.wav'), 'utf-8')).toBe('old');
		expect(adoptLegacyClip('abc.wav')).toBe(false); // already there
		expect(adoptLegacyClip('missing.wav')).toBe(false);
	});

	it('is where the merge command reads the clips by default', () => {
		const { inputs } = buildMergeCommand(
			{ totalDurationMs: 1000, steps: [{ audioFile: 'abc.wav', startMs: 0 }] },
			'in.webm',
			'out.webm',
			{ musicFile: '', checkFileExists: () => true }
		);
		expect(inputs).toContain(join(voiceCacheDir(), 'abc.wav'));
	});
});

describe('browser playback', () => {
	it('plays from the voice URL and answers it from the cache with page.route', async () => {
		process.env.TUTORIAL_MODE = 'true';
		vi.resetModules();
		const { TutorialVoice } = await import('../src/voice.js');
		mkdirSync(voiceCacheDir(), { recursive: true });
		writeFileSync(join(voiceCacheDir(), 'abc.wav'), 'clip');

		let handler: ((route: any) => Promise<void>) | undefined;
		const page = {
			route: vi.fn(async (_pattern: string, h: any) => { handler = h; }),
			evaluate: vi.fn().mockResolvedValue(undefined)
		};
		const voice = new TutorialVoice(page as any, { lang: 'fr', voiceName: '', voiceRate: 1, voicePitch: 1, audioBaseUrl: 'http://app.test' });
		(voice as any).preloadedAudio.set('Bonjour.', { text: 'Bonjour.', filename: 'abc.wav', filePath: '', url: '/__playwright-director/voice/abc.wav', durationMs: 900 });

		expect(await voice.startPlayback('Bonjour.')).toBe(900);
		expect(await voice.startPlayback('Bonjour.')).toBe(900);
		expect(page.route).toHaveBeenCalledTimes(1); // once per page
		expect(page.evaluate.mock.calls[0][1]).toEqual({ url: 'http://app.test/__playwright-director/voice/abc.wav' });

		const fulfill = vi.fn();
		await handler!({ request: () => ({ url: () => 'http://app.test/__playwright-director/voice/abc.wav' }), fulfill });
		expect(fulfill).toHaveBeenCalledWith({ path: join(voiceCacheDir(), 'abc.wav') });
		expect(existsSync(join(project, 'static'))).toBe(false);
	});
});
