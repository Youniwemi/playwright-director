/**
 * Astro is playwright-director's dependency, not the consuming app's: resolve
 * it from here and link it into the scaffold's node_modules, so `astro/config`
 * and the compiled components' `astro/*` imports resolve from the build dir
 * under any linker (bun isolated, pnpm, npm workspaces). Returns the CLI path.
 */
export declare function linkAstro(buildDir: string): string;
export interface BuildSiteOptions {
    /** Overrides config.baseUrl, e.g. "/help/" for a sub-path deployment */
    base?: string;
    /** Overrides config.theme */
    theme?: string;
    /** Overrides config.output */
    output?: string;
    /** Run `astro dev` on the scaffold (kept in <output>/.astro-build) instead of building */
    dev?: boolean;
    /** Never prompt (CI): a missing config is created with the defaults and used */
    yes?: boolean;
    /** Only these tutorials (slugs or ids) — all their languages and variants */
    only?: string[];
}
/** `look` matches look, look.en, look-mobile.ar…; an exact id matches itself. */
export declare function matchesOnly(id: string, only: string[]): boolean;
export declare function buildSite(configPath?: string, options?: BuildSiteOptions): Promise<void>;
//# sourceMappingURL=build-site.d.ts.map