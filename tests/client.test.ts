import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { load, loadIndex, currentStep } from '../src/client.js';

const payload = {
	schemaVersion: 1,
	id: 'demo',
	title: 'Demo',
	duration: '0:30',
	durationSeconds: 30,
	lang: 'fr',
	accent: '#000',
	video: 'videos/demo.webm',
	poster: 'videos/demo-poster.webp',
	page: 'demo/',
	steps: [
		{ num: 1, at: 2, title: 'Un', image: 'videos/demo-step-1.webp' },
		{ at: 9, text: 'Contexte', context: true },
		{ num: 2, at: 12, title: 'Deux' }
	]
};

/** fetch stub: url → JSON body; anything else 404. */
const fakeFetch = (routes: Record<string, unknown>, calls: string[] = []) =>
	(async (url: string) => {
		calls.push(url);
		if (!(url in routes)) return new Response('not found', { status: 404 });
		return new Response(JSON.stringify(routes[url]), { status: 200 });
	}) as unknown as typeof fetch;

describe('load', () => {
	it('resolves every URL against the base', async () => {
		const t = await load('demo', {
			baseUrl: 'https://docs.example.com/gallery',
			fetch: fakeFetch({ 'https://docs.example.com/gallery/embed/demo.json': payload })
		});
		expect(t.baseUrl).toBe('https://docs.example.com/gallery/');
		expect(t.video).toBe('https://docs.example.com/gallery/videos/demo.webm');
		expect(t.poster).toBe('https://docs.example.com/gallery/videos/demo-poster.webp');
		expect(t.page).toBe('https://docs.example.com/gallery/demo/');
		expect(t.steps[0]).toEqual({ num: 1, at: 2, title: 'Un', image: 'https://docs.example.com/gallery/videos/demo-step-1.webp' });
		expect(t.steps[2].at).toBe(12);
	});

	it('tries <slug>.<lang>.json first, then the default language', async () => {
		const calls: string[] = [];
		const t = await load('demo', {
			baseUrl: 'https://d.test/',
			lang: 'ar',
			fetch: fakeFetch({ 'https://d.test/embed/demo.json': payload }, calls)
		});
		expect(calls).toEqual(['https://d.test/embed/demo.ar.json', 'https://d.test/embed/demo.json']);
		expect(t.lang).toBe('fr');

		const en = await load('demo', {
			baseUrl: 'https://d.test/',
			lang: 'en',
			fetch: fakeFetch({ 'https://d.test/embed/demo.en.json': { ...payload, lang: 'en' } })
		});
		expect(en.lang).toBe('en');
	});

	it('names the URLs and the index for an unknown slug', async () => {
		await expect(load('nope', { baseUrl: 'https://d.test/', fetch: fakeFetch({}) })).rejects.toThrow(
			/Tutorial "nope" not found: https:\/\/d\.test\/embed\/nope\.json answered HTTP 404\. Known slugs: https:\/\/d\.test\/embed\/index\.json/
		);
	});

	it('explains a network/CORS failure with the URL', async () => {
		const failing = (async () => {
			throw new TypeError('Failed to fetch');
		}) as unknown as typeof fetch;
		await expect(load('demo', { baseUrl: 'https://d.test/', fetch: failing })).rejects.toThrow(
			/Could not fetch https:\/\/d\.test\/embed\/demo\.json: network error, or the tutorials host sends no Access-Control-Allow-Origin/
		);
	});
});

describe('loadIndex', () => {
	it('returns embed/index.json', async () => {
		const index = { schemaVersion: 1, tutorials: [] };
		expect(await loadIndex({ baseUrl: 'https://d.test/', fetch: fakeFetch({ 'https://d.test/embed/index.json': index }) })).toEqual(index);
	});
});

describe('currentStep', () => {
	it('returns the last step whose start is reached', () => {
		expect(currentStep(payload.steps, 0)).toBeUndefined();
		expect(currentStep(payload.steps, 10)?.text).toBe('Contexte');
		expect(currentStep(payload.steps, 40)?.title).toBe('Deux');
	});
});

describe('embed schema v1', () => {
	it('lists the fields the builder always writes as required', () => {
		const schema = JSON.parse(readFileSync(join(__dirname, '..', 'schemas', 'embed-v1.schema.json'), 'utf-8'));
		for (const field of schema.$defs.tutorial.required) expect(payload).toHaveProperty(field);
	});
});
