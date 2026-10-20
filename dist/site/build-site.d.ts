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
}
export declare function buildSite(configPath?: string, options?: BuildSiteOptions): Promise<void>;
//# sourceMappingURL=build-site.d.ts.map