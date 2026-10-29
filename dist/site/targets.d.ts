import type { SiteConfig, TutorialFilter } from './types.js';
/** `override` over `base`: objects are merged, arrays and plain values replace, `null` deletes the key. */
export declare function deepMerge<T>(base: T, override: unknown): T;
/** The config with `targets[name]` merged in (no name = the config as is); an unknown name lists the targets. */
export declare function applyTarget(config: SiteConfig, name?: string): SiteConfig;
/** `*` = any characters, `?` = one, the rest literal; the whole slug must match. */
export declare function globMatch(slug: string, pattern: string): boolean;
/** Its category is listed, or its slug matches one of the globs. */
export declare function matchesFilter(filter: TutorialFilter, slug: string, category: string): boolean;
/** Published = matches `include` (or no include) and not `exclude`. `slug` is the base slug (no `.<lang>`, no `-<variant>`). */
export declare function isPublished(tutorials: SiteConfig['tutorials'], slug: string, category: string): boolean;
//# sourceMappingURL=targets.d.ts.map