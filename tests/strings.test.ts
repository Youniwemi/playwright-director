import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { runInNewContext } from 'vm';
import { STRINGS, mergeStrings, uiString } from '../src/site/strings.js';
import { scaffold } from '../src/site/scaffold.js';
import type { SiteConfig } from '../src/site/types.js';

describe('UI strings', () => {
	it('ships complete en/fr/ar dictionaries', () => {
		const keys = Object.keys(STRINGS.en).sort();
		for (const lang of ['fr', 'ar']) expect(Object.keys(STRINGS[lang]).sort()).toEqual(keys);
	});

	it('merges config overrides and new languages over English', () => {
		const s = mergeStrings({ fr: { allTutorials: 'Toute l’aide' }, es: { close: 'Cerrar' } });
		expect(s.fr.allTutorials).toBe('Toute l’aide');
		expect(s.fr.close).toBe('Fermer');
		expect(s.es.close).toBe('Cerrar');
		expect(s.es.loading).toBe('Loading…');
	});

	it('fills placeholders and falls back from a region subtag or unknown language', () => {
		const s = mergeStrings();
		expect(uiString(s, 'fr-FR', 'step', { n: 3 })).toBe('Étape 3');
		expect(uiString(s, 'ar', 'playFrom', { time: '0:07' })).toBe('تشغيل من 0:07');
		expect(uiString(s, 'xx', 'close')).toBe('Close');
	});

	it('keeps the widget copy of the strings identical to the site dictionaries', () => {
		const source = readFileSync(join(__dirname, '..', 'templates', 'site', 'public', 'widget.js'), 'utf-8');
		const window: Record<string, any> = {};
		const document = { currentScript: null, querySelector: () => null, addEventListener: () => {}, documentElement: {} };
		runInNewContext(source, { window, document });
		const widget = window.PlaywrightDirector.strings as Record<string, Record<string, string>>;
		for (const lang of ['en', 'fr', 'ar']) {
			for (const [key, text] of Object.entries(widget[lang])) expect(text).toBe(STRINGS[lang][key as keyof (typeof STRINGS)['en']]);
		}
	});
});

describe('scaffold strings', () => {
	const dir = join(tmpdir(), `pd-strings-${process.pid}`);
	afterEach(() => rmSync(dir, { recursive: true, force: true }));

	it('writes the merged dictionaries to the site config', () => {
		const config: SiteConfig = {
			title: 'T', primaryColor: '#000', font: 'x', input: dir, output: 'dist', baseUrl: '/', lang: 'fr',
			strings: { fr: { close: 'Quitter' } }
		};
		scaffold(config, { categories: {}, videos: [], ui: { heroTitle: '', heroSubtitle: '' } }, dir);
		const site = JSON.parse(readFileSync(join(dir, 'src', 'data', 'site-config.json'), 'utf-8'));
		expect(site.strings.fr.close).toBe('Quitter');
	});
});
