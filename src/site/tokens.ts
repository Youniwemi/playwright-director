/** Design tokens a site config may set (`tokens: { primary: '#0b5d47' }`) → CSS custom properties. */
export const TOKENS = {
	primary: '--pd-primary',
	onPrimary: '--pd-on-primary',
	accent: '--pd-accent',
	bg: '--pd-bg',
	surface: '--pd-surface',
	text: '--pd-text',
	muted: '--pd-muted',
	border: '--pd-border',
	pro: '--pd-pro',
	radius: '--pd-radius',
	shadow: '--pd-shadow',
	shadowHover: '--pd-shadow-hover',
	fontBody: '--pd-font-body',
	fontDisplay: '--pd-font-display'
} as const;

/** Each theme's default --pd-primary (keep in sync with templates/themes/<theme>/theme.css): the widget's
 *  accent when the config sets no primary, so the in-app widget matches the gallery. */
export const THEME_PRIMARY: Record<string, string> = {
	academy: 'oklch(42% 0.09 165)',
	classic: '#6366f1'
};

export type TokenName = keyof typeof TOKENS;
export type Tokens = Partial<Record<TokenName, string>>;

/**
 * `html:root { --pd-…: … }` from the config tokens. `html:root` outranks the themes' `:root`
 * defaults whatever the stylesheet order. Throws on an unknown token name.
 */
export function tokensCss(tokens: Record<string, string>): string {
	const unknown = Object.keys(tokens).filter((k) => !(k in TOKENS));
	if (unknown.length) {
		throw new Error(`Unknown design token(s): ${unknown.join(', ')}. Valid tokens: ${Object.keys(TOKENS).join(', ')}`);
	}
	const decls = Object.entries(tokens)
		.filter(([, value]) => value !== undefined && value !== '')
		.map(([name, value]) => `\t${TOKENS[name as TokenName]}: ${value};`);
	return decls.length ? `html:root {\n${decls.join('\n')}\n}\n` : '';
}
