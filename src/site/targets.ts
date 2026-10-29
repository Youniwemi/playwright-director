import type { SiteConfig, SiteTarget, TutorialFilter } from './types.js';

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** `override` over `base`: objects are merged, arrays and plain values replace, `null` deletes the key. */
export function deepMerge<T>(base: T, override: unknown): T {
	if (!isObject(base) || !isObject(override)) return override as T;
	const out: Record<string, unknown> = { ...base };
	for (const [key, value] of Object.entries(override)) {
		if (value === null) delete out[key];
		else if (value !== undefined) out[key] = isObject(value) && isObject(out[key]) ? deepMerge(out[key], value) : value;
	}
	return out as T;
}

/** The config with `targets[name]` merged in (no name = the config as is); an unknown name lists the targets. */
export function applyTarget(config: SiteConfig, name?: string): SiteConfig {
	const { targets, ...main } = config;
	if (!name) return main;
	const target: SiteTarget | undefined = targets?.[name];
	if (!target) {
		const known = Object.keys(targets ?? {});
		throw new Error(`Unknown target "${name}". Targets: ${known.length ? known.join(', ') : 'none (add `targets` to the site config)'}`);
	}
	return deepMerge(main, target);
}

/** `*` = any characters, `?` = one, the rest literal; the whole slug must match. */
export function globMatch(slug: string, pattern: string): boolean {
	const re = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replaceAll('*', '.*').replaceAll('?', '.');
	return new RegExp(`^${re}$`).test(slug);
}

/** Its category is listed, or its slug matches one of the globs. */
export function matchesFilter(filter: TutorialFilter, slug: string, category: string): boolean {
	return !!filter.categories?.includes(category) || !!filter.slugs?.some((p) => globMatch(slug, p));
}

/** Published = matches `include` (or no include) and not `exclude`. `slug` is the base slug (no `.<lang>`, no `-<variant>`). */
export function isPublished(tutorials: SiteConfig['tutorials'], slug: string, category: string): boolean {
	const { include, exclude } = tutorials ?? {};
	const hasInclude = !!(include?.categories || include?.slugs);
	if (hasInclude && !matchesFilter(include!, slug, category)) return false;
	return !(exclude && matchesFilter(exclude, slug, category));
}
