// UI strings: dictionaries written by scaffold() (built-in en/fr/ar + config `strings`).
import siteConfig from './data/site-config.json';

const strings: Record<string, Record<string, string>> = (siteConfig as any).strings ?? {};
export const siteLang = String((siteConfig as any).lang || 'en').split(',')[0].trim();
export const RTL_LANGS = ['ar', 'he', 'fa', 'ur'];
/** Language switcher labels, in their own language */
export const LANG_NAMES: Record<string, string> = { fr: 'Français', en: 'English', ar: 'العربية', es: 'Español', de: 'Deutsch' };

/**
 * `t(lang, 'step', { n: 2 })` — primary subtag, falls back to English, then to the key.
 * A numeric `n` selects a plural form `<key>_<category>` (`sectionStats_one`) when the dictionary has one.
 */
export function t(lang: string | undefined, key: string, vars: Record<string, string | number> = {}): string {
	const code = (lang || siteLang).toLowerCase().split('-')[0];
	const dict = strings[code] ?? strings.en ?? {};
	const plural = typeof vars.n === 'number' ? dict[`${key}_${new Intl.PluralRules(code).select(vars.n)}`] : undefined;
	return (plural ?? dict[key] ?? key).replace(/\{(\w+)\}/g, (m, name) => (name in vars ? String(vars[name]) : m));
}
