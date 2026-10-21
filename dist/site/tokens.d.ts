/** Design tokens a site config may set (`tokens: { primary: '#0b5d47' }`) → CSS custom properties. */
export declare const TOKENS: {
    readonly primary: "--pd-primary";
    readonly onPrimary: "--pd-on-primary";
    readonly accent: "--pd-accent";
    readonly bg: "--pd-bg";
    readonly surface: "--pd-surface";
    readonly text: "--pd-text";
    readonly muted: "--pd-muted";
    readonly border: "--pd-border";
    readonly pro: "--pd-pro";
    readonly radius: "--pd-radius";
    readonly shadow: "--pd-shadow";
    readonly shadowHover: "--pd-shadow-hover";
    readonly fontBody: "--pd-font-body";
    readonly fontDisplay: "--pd-font-display";
};
/** Each theme's default --pd-primary (keep in sync with templates/themes/<theme>/theme.css): the widget's
 *  accent when the config sets no primary, so the in-app widget matches the gallery. */
export declare const THEME_PRIMARY: Record<string, string>;
export type TokenName = keyof typeof TOKENS;
export type Tokens = Partial<Record<TokenName, string>>;
/**
 * `html:root { --pd-…: … }` from the config tokens. `html:root` outranks the themes' `:root`
 * defaults whatever the stylesheet order. Throws on an unknown token name.
 */
export declare function tokensCss(tokens: Record<string, string>): string;
//# sourceMappingURL=tokens.d.ts.map