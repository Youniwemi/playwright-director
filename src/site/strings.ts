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
	theme: string;
	openInApp: string;
	readDocs: string;
	/** Fallback page note: `{lang}` = the recording language, named in the page language */
	videoInLang: string;
	search: string;
	noResults: string;
	startHere: string;
	heroEyebrow: string;
	heroEyebrow_one: string;
	sectionStats: string;
	/** Plural form for n = 1 — the site's t() picks `<key>_<Intl.PluralRules category>` when present */
	sectionStats_one: string;
	sections: string;
	/** Label of the role chips (Académie hero) */
	roles: string;
	nextSection: string;
	ctaTitle: string;
	ctaText: string;
	ctaButton: string;
	openApp: string;
	home: string;
	courseContent: string;
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
		screenshot: 'Screenshot',
		theme: 'Theme',
		openInApp: 'Open in the app',
		readDocs: 'Read the documentation',
		videoInLang: 'This video is in {lang}.',
		search: 'Search tutorials',
		noResults: 'No tutorial matches “{q}”.',
		startHere: 'Start here',
		heroEyebrow: '{n} tutorials · under {m} min each',
		heroEyebrow_one: '1 tutorial · under {m} min',
		sectionStats: '{n} videos · ~{m} min',
		sectionStats_one: '1 video · ~{m} min',
		sections: 'Sections',
		roles: 'Your profile',
		nextSection: 'Next section',
		ctaTitle: 'Your turn',
		ctaText: 'Open the app and repeat these steps in a few minutes.',
		ctaButton: 'Try it now',
		openApp: 'Open the app',
		home: 'Home',
		courseContent: 'Course content'
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
		screenshot: 'Capture d’écran',
		theme: 'Thème',
		openInApp: 'Ouvrir dans l’application',
		readDocs: 'Lire la documentation',
		videoInLang: 'Cette vidéo est en {lang}.',
		search: 'Rechercher un tutoriel',
		noResults: 'Aucun tutoriel ne correspond à « {q} ».',
		startHere: 'Commencez ici',
		heroEyebrow: '{n} tutoriels · moins de {m} min chacun',
		heroEyebrow_one: '1 tutoriel · moins de {m} min',
		sectionStats: '{n} vidéos · ~{m} min',
		sectionStats_one: '1 vidéo · ~{m} min',
		sections: 'Sections',
		roles: 'Votre profil',
		nextSection: 'Section suivante',
		ctaTitle: 'À vous de jouer',
		ctaText: 'Ouvrez l’application et refaites ces étapes en quelques minutes.',
		ctaButton: 'Essayer maintenant',
		openApp: 'Ouvrir l’application',
		home: 'Accueil',
		courseContent: 'Contenu du parcours'
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
		screenshot: 'لقطة الشاشة',
		theme: 'السمة',
		openInApp: 'فتح في التطبيق',
		readDocs: 'قراءة التوثيق',
		videoInLang: 'هذا الفيديو باللغة {lang}.',
		search: 'ابحث في الدروس',
		noResults: 'لا يوجد درس يطابق «{q}».',
		startHere: 'ابدأ من هنا',
		heroEyebrow: '{n} درسًا · أقل من {m} دقائق لكل درس',
		heroEyebrow_one: 'درس واحد · أقل من {m} دقائق',
		sectionStats: '{n} فيديو · ~{m} د',
		sectionStats_one: 'فيديو واحد · ~{m} د',
		sections: 'الأقسام',
		roles: 'ملفك',
		nextSection: 'القسم التالي',
		ctaTitle: 'دورك الآن',
		ctaText: 'افتح التطبيق وكرر هذه الخطوات في بضع دقائق.',
		ctaButton: 'جرّب الآن',
		openApp: 'فتح التطبيق',
		home: 'الرئيسية',
		courseContent: 'محتوى المسار'
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
