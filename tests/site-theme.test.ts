import { describe, it, expect, afterEach } from 'vitest';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { scaffold } from '../src/site/scaffold.js';
import { tokensCss } from '../src/site/tokens.js';
import type { SiteConfig, VideoManifest } from '../src/site/types.js';

const config: SiteConfig = { title: 'Docs', input: 'tutorials/', output: 'dist/', baseUrl: '/', lang: 'fr' };
const manifest: VideoManifest = { categories: {}, videos: [], ui: { heroTitle: 'Docs', heroSubtitle: 'Videos' } };

describe('tokensCss', () => {
	it('maps config tokens to --pd-* properties on html:root', () => {
		expect(tokensCss({ primary: '#0b5d47', fontDisplay: 'Fraunces, serif' })).toBe(
			'html:root {\n\t--pd-primary: #0b5d47;\n\t--pd-font-display: Fraunces, serif;\n}\n'
		);
	});

	it('returns nothing without tokens', () => {
		expect(tokensCss({})).toBe('');
	});

	it('rejects an unknown token and lists the valid ones', () => {
		expect(() => tokensCss({ primaryColour: 'red' })).toThrow(/Unknown design token\(s\): primaryColour\. Valid tokens: primary, /);
	});
});

describe('scaffold themes', () => {
	const root = join(tmpdir(), `playwright-director-theme-test-${process.pid}`);
	const tempDir = join(root, 'build');

	afterEach(() => rmSync(root, { recursive: true, force: true }));

	it('copies the chosen theme into src/theme', () => {
		scaffold({ ...config, theme: 'classic' }, manifest, tempDir);
		expect(readFileSync(join(tempDir, 'src', 'theme', 'theme.css'), 'utf-8')).toContain('Classic theme');
		expect(existsSync(join(tempDir, 'src', 'theme', 'VideoPage.astro'))).toBe(true);
		expect(existsSync(join(tempDir, 'src', 'components', 'StepGuide.astro'))).toBe(true);
	});

	it('defaults to the academy theme and its fonts', () => {
		scaffold({ ...config, theme: undefined }, manifest, tempDir);
		expect(readFileSync(join(tempDir, 'src', 'theme', 'theme.css'), 'utf-8')).toContain('Académie theme');
		expect(existsSync(join(tempDir, 'src', 'theme', 'CourseNav.astro'))).toBe(true);
		expect(JSON.parse(readFileSync(join(tempDir, 'src', 'data', 'site-config.json'), 'utf-8')).googleFonts[0]).toMatch(/^Fraunces/);
	});

	it('rejects an unknown theme', () => {
		expect(() => scaffold({ ...config, theme: 'studio' as never }, manifest, tempDir)).toThrow(/Unknown theme "studio"\. Available themes: academy, classic/);
	});

	it('writes tokens then the extra stylesheet into user.css (primaryColor/font still honoured)', () => {
		mkdirSync(root, { recursive: true });
		const css = join(root, 'site.css');
		writeFileSync(css, '.hero { padding: 0; }');
		scaffold({ ...config, theme: 'classic', primaryColor: '#111', tokens: { radius: '4px' }, css }, manifest, tempDir);
		const user = readFileSync(join(tempDir, 'src', 'styles', 'user.css'), 'utf-8');
		expect(user).toContain('--pd-primary: #111;');
		expect(user).toContain('--pd-radius: 4px;');
		expect(user.indexOf('--pd-radius')).toBeLessThan(user.indexOf('.hero { padding: 0; }'));
	});

	it('copies overrides over the theme, and generated data over the overrides', () => {
		const overrides = join(root, 'overrides');
		mkdirSync(join(overrides, 'theme'), { recursive: true });
		mkdirSync(join(overrides, 'data'), { recursive: true });
		writeFileSync(join(overrides, 'theme', 'theme.css'), '/* mine */');
		writeFileSync(join(overrides, 'data', 'tutorials.json'), '{}');
		scaffold({ ...config, theme: 'classic', overrides }, manifest, tempDir);
		expect(readFileSync(join(tempDir, 'src', 'theme', 'theme.css'), 'utf-8')).toBe('/* mine */');
		expect(JSON.parse(readFileSync(join(tempDir, 'src', 'data', 'tutorials.json'), 'utf-8')).ui.heroTitle).toBe('Docs');
	});

	it('passes the theme fonts and the theme switcher to the templates', () => {
		scaffold({ ...config, theme: 'classic', googleFonts: ['Inter:wght@400'], themeSwitcher: { A: '/a/', B: '/b/' } }, manifest, tempDir);
		const site = JSON.parse(readFileSync(join(tempDir, 'src', 'data', 'site-config.json'), 'utf-8'));
		expect(site.googleFonts).toEqual(['Inter:wght@400']);
		expect(site.themeSwitcher).toEqual({ A: '/a/', B: '/b/' });
		expect(site.theme).toBe('classic');
	});
});
