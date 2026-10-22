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
export declare const STRINGS: Record<string, UiStrings>;
/** Built-in dictionaries merged with the config overrides; unknown languages start from English. */
export declare function mergeStrings(overrides?: Record<string, Partial<UiStrings>>): Record<string, UiStrings>;
/** One string for `lang` (primary subtag, falls back to English), placeholders filled. */
export declare function uiString(strings: Record<string, UiStrings>, lang: string | undefined, key: keyof UiStrings, vars?: Record<string, string | number>): string;
//# sourceMappingURL=strings.d.ts.map