/** UI strings of the gallery site. `{n}` / `{time}` are placeholders.
 *  Override or add languages with `strings` in tutorial-site.config.js.
 *  widget.js carries its own copy of the keys it uses (kept in sync by tests/strings.test.ts). */
export interface UiStrings {
	allTutorials: string;
	all: string;
	desktop: string;
	language: string;
	filterVariant: string;
	videoTutorials: string;
	step: string;
	steps: string;
	playFrom: string;
	enlarge: string;
	previous: string;
	next: string;
	previousStep: string;
	nextStep: string;
	close: string;
	navigation: string;
	builtWith: string;
	loading: string;
	unavailable: string;
	openFull: string;
	tutorial: string;
	duration: string;
	screenshot: string;
}

export const STRINGS: Record<string, UiStrings> = {
	en: {
		allTutorials: 'All tutorials',
		all: 'All',
		desktop: 'Desktop',
		language: 'Language',
		filterVariant: 'Filter by format',
		videoTutorials: 'Video tutorials',
		step: 'Step {n}',
		steps: 'Steps',
		playFrom: 'Play from {time}',
		enlarge: 'Enlarge screenshot of step {n}',
		previous: 'Previous',
		next: 'Next',
		previousStep: 'Previous step',
		nextStep: 'Next step',
		close: 'Close',
		navigation: 'Tutorial navigation',
		builtWith: 'Built with playwright-director',
		loading: 'Loading…',
		unavailable: 'Tutorial unavailable',
		openFull: 'Open full tutorial',
		tutorial: 'Tutorial',
		duration: 'Duration',
		screenshot: 'Screenshot'
	},
	fr: {
		allTutorials: 'Tous les tutoriels',
		all: 'Tous',
		desktop: 'Ordinateur',
		language: 'Langue',
		filterVariant: 'Filtrer par format',
		videoTutorials: 'Tutoriels vidéo',
		step: 'Étape {n}',
		steps: 'Étapes',
		playFrom: 'Lire à partir de {time}',
		enlarge: 'Agrandir la capture de l’étape {n}',
		previous: 'Précédent',
		next: 'Suivant',
		previousStep: 'Étape précédente',
		nextStep: 'Étape suivante',
		close: 'Fermer',
		navigation: 'Navigation entre tutoriels',
		builtWith: 'Réalisé avec playwright-director',
		loading: 'Chargement…',
		unavailable: 'Tutoriel indisponible',
		openFull: 'Ouvrir le tutoriel complet',
		tutorial: 'Tutoriel',
		duration: 'Durée',
		screenshot: 'Capture d’écran'
	},
	ar: {
		allTutorials: 'كل الدروس',
		all: 'الكل',
		desktop: 'حاسوب',
		language: 'اللغة',
		filterVariant: 'تصفية حسب الشكل',
		videoTutorials: 'دروس بالفيديو',
		step: 'الخطوة {n}',
		steps: 'الخطوات',
		playFrom: 'تشغيل من {time}',
		enlarge: 'تكبير لقطة الخطوة {n}',
		previous: 'السابق',
		next: 'التالي',
		previousStep: 'الخطوة السابقة',
		nextStep: 'الخطوة التالية',
		close: 'إغلاق',
		navigation: 'التنقل بين الدروس',
		builtWith: 'أُنشئ باستخدام playwright-director',
		loading: 'جارٍ التحميل…',
		unavailable: 'الدرس غير متاح',
		openFull: 'فتح الدرس كاملاً',
		tutorial: 'درس',
		duration: 'المدة',
		screenshot: 'لقطة الشاشة'
	}
};

/** Built-in dictionaries merged with the config overrides; unknown languages start from English. */
export function mergeStrings(overrides: Record<string, Partial<UiStrings>> = {}): Record<string, UiStrings> {
	const merged: Record<string, UiStrings> = {};
	for (const lang of new Set([...Object.keys(STRINGS), ...Object.keys(overrides)])) {
		merged[lang] = { ...STRINGS.en, ...STRINGS[lang], ...overrides[lang] };
	}
	return merged;
}

/** One string for `lang` (primary subtag, falls back to English), placeholders filled. */
export function uiString(
	strings: Record<string, UiStrings>,
	lang: string | undefined,
	key: keyof UiStrings,
	vars: Record<string, string | number> = {}
): string {
	const dict = strings[(lang || 'en').toLowerCase().split('-')[0]] ?? strings.en ?? STRINGS.en;
	return dict[key].replace(/\{(\w+)\}/g, (m, name) => (name in vars ? String(vars[name]) : m));
}
