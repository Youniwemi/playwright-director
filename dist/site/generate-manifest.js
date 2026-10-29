import { mergeStrings, uiString } from './strings.js';
import { siteLang } from './embed.js';
import { isPublished } from './targets.js';
const warn = (message) => console.warn(`  ⚠ ${message}`);
const DEFAULT_CATEGORY_ICONS = {
    'getting-started': '⭐',
    premium: '💎',
    portal: '👥',
    accountant: '🧾',
    payroll: '💰',
    accounting: '📊',
    settings: '⚙️'
};
function humanize(slug) {
    const s = slug.replace(/[-_]/g, ' ').trim();
    return s.charAt(0).toUpperCase() + s.slice(1);
}
/**
 * Merge a tutorial's timeline narration with its step screenshots into the
 * step-by-step guide shown on the video page. Leading context narrations
 * become the page description; mid-flow contexts stay in the list as
 * unnumbered entries; screenshots of non-voiced steps (absent from the
 * timeline) are inserted at their step position with no text.
 */
export function buildStepsDetail(t) {
    const shotByN = new Map(t.stepScreenshots.map((s) => [s.n, s.file]));
    const usedShots = new Set();
    const stepsDetail = [];
    const leadingContext = [];
    let seenStep = false;
    for (const s of t.timeline.steps) {
        const at = Math.round(s.startMs / 10) / 100;
        if (s.step === 0 && s.title === 'Context') {
            if (!s.text)
                continue;
            if (seenStep)
                stepsDetail.push({ at, text: s.text, context: true });
            else
                leadingContext.push(s.text);
            continue;
        }
        if (s.title === 'Complete')
            continue;
        seenStep = true;
        const image = shotByN.get(s.step);
        if (image !== undefined)
            usedShots.add(s.step);
        // An untranslated step (identity translate) has its key as title — show the narration's first sentence instead.
        const title = s.key && s.title === s.key && s.text ? s.text.split('. ')[0].replace(/\.$/, '') : s.title;
        stepsDetail.push({
            n: s.step,
            at,
            title,
            ...(s.key ? { key: s.key } : {}),
            ...(s.text ? { text: s.text } : {}),
            ...(image ? { image } : {})
        });
    }
    for (const shot of t.stepScreenshots) {
        if (usedShots.has(shot.n))
            continue;
        const at = stepsDetail.findIndex((d) => d.n !== undefined && d.n > shot.n);
        const entry = { n: shot.n, image: shot.file };
        if (at === -1)
            stepsDetail.push(entry);
        else
            stepsDetail.splice(at, 0, entry);
    }
    return {
        description: leadingContext.length > 0 ? leadingContext.join(' ') : undefined,
        stepsDetail
    };
}
/** A link path on an origin (`{lang}` replaced); full URLs and missing origins leave the path as is. */
export function resolveLink(path, origin, lang) {
    if (!path)
        return undefined;
    if (/^[a-z]+:/i.test(path) || !origin)
        return path;
    return origin.replaceAll('{lang}', lang).replace(/\/$/, '') + (path.startsWith('/') ? path : `/${path}`);
}
/** id without its `.<lang>` suffix (TUTORIAL_LANG recordings) */
const slugOf = (id, lang) => (lang && id.endsWith(`.${lang}`) ? id.slice(0, -lang.length - 1) : id);
/**
 * The slug that groups the languages of one tutorial. Recordings named after their translated title have
 * different ids, so group by test (`testFile` + `testTitle` + variant) and take the site-language recording's
 * slug (else the first language's). No `testFile`/`testTitle` (old timelines) = own slug.
 */
function groupSlugs(tutorials, defaultLang) {
    const own = (t) => slugOf(t.timeline.testName, t.timeline.lang);
    const groups = new Map();
    for (const t of tutorials) {
        const { testFile, testTitle, variant } = t.timeline;
        if (!testFile || !testTitle)
            continue;
        const key = `${testFile}|${testTitle}|${variant ?? ''}`;
        (groups.get(key) ?? groups.set(key, []).get(key)).push(t);
    }
    const result = new Map(tutorials.map((t) => [t, own(t)]));
    for (const members of groups.values()) {
        const lang = (t) => t.timeline.lang || defaultLang;
        const head = members.find((t) => lang(t) === defaultLang) ?? [...members].sort((a, b) => lang(a).localeCompare(lang(b)))[0];
        for (const t of members)
            result.set(t, own(head));
    }
    return result;
}
export function generateManifest(scanned, config) {
    const groupSlug = groupSlugs(scanned, siteLang(config));
    /** The name the config uses (`items`, `premium`, `links`): the group slug without its `-<variant>` suffix too */
    const configSlugOf = (t) => {
        const slug = groupSlug.get(t);
        const variant = t.timeline.variant;
        return variant && slug.endsWith(`-${variant}`) ? slug.slice(0, -variant.length - 1) : slug;
    };
    const configured = config.tutorials?.categories ?? {};
    // A slug listed in a configured section's `items` belongs there, whatever its timeline feature.
    const listed = new Map();
    for (const [id, cat] of Object.entries(configured)) {
        (cat.items ?? []).forEach((slug, rank) => listed.set(slug, { category: id, rank }));
    }
    const categoryOf = (t) => listed.get(configSlugOf(t))?.category ?? (t.timeline.feature || 'general');
    // Configured sections first, in config order, then the detected ones.
    const categories = {};
    for (const [id, cat] of Object.entries(configured)) {
        categories[id] = { icon: cat.icon ?? DEFAULT_CATEGORY_ICONS[id] ?? '📹', label: cat.label, blurb: cat.blurb };
    }
    for (const t of scanned) {
        const cat = categoryOf(t);
        categories[cat] ??= { icon: DEFAULT_CATEGORY_ICONS[cat] || '📹', label: cat.charAt(0).toUpperCase() + cat.slice(1).replace(/-/g, ' ') };
    }
    // Checked against every section, excluded ones included: a target that drops a section keeps its roles valid.
    const configRoles = config.tutorials?.roles;
    for (const [id, role] of Object.entries(configRoles ?? {})) {
        const unknown = role.sections.find((s) => !(s in categories));
        if (unknown)
            throw new Error(`Unknown section "${unknown}" in role "${id}". Sections: ${Object.keys(categories).join(', ')}`);
    }
    // include / exclude: a tutorial left out leaves no trace — everything below only sees the published ones.
    const tutorials = scanned.filter((t) => isPublished(config.tutorials, configSlugOf(t), categoryOf(t)));
    const publishedSlugs = new Set(tutorials.map(configSlugOf));
    const excludedSlugs = new Set(scanned.map(configSlugOf).filter((s) => !publishedSlugs.has(s)));
    if (tutorials.length === 0) {
        throw new Error(`Nothing to publish: tutorials.include / exclude left none of the ${scanned.length} tutorial(s).`);
    }
    if (excludedSlugs.size > 0)
        console.log(`  Excluded ${excludedSlugs.size} tutorial(s): ${[...excludedSlugs].join(', ')}`);
    for (const [id, cat] of Object.entries(configured)) {
        for (const slug of cat.items ?? [])
            if (excludedSlugs.has(slug))
                warn(`"${slug}" is in categories.${id}.items but excluded — skipped.`);
    }
    for (const slug of config.tutorials?.premium ?? [])
        if (excludedSlugs.has(slug))
            warn(`"${slug}" is in premium but excluded — skipped.`);
    if (Object.keys(configured).length > 0) {
        const unknown = new Set(tutorials.map(categoryOf).filter((c) => !(c in configured)));
        for (const c of unknown) {
            warn(`Category "${c}" is not in tutorials.categories — its tutorials are published anyway. Use tutorials.exclude.categories to leave them out.`);
        }
    }
    let featured = config.tutorials?.featured;
    if (featured && !publishedSlugs.has(featured) && excludedSlugs.has(featured)) {
        const fallback = configSlugOf(tutorials[0]);
        warn(`Featured tutorial "${featured}" is excluded — featuring "${fallback}" instead.`);
        featured = fallback;
    }
    // Recording dates per slug (all languages and variants): first = uploadDate, last = dateModified.
    const dates = new Map();
    for (const t of tutorials) {
        const slug = configSlugOf(t);
        (dates.get(slug) ?? dates.set(slug, []).get(slug)).push(t.recordedAt.slice(0, 10));
    }
    const premium = new Set(config.tutorials?.premium ?? []);
    const videos = tutorials.map((t) => {
        const durationSec = Math.round(t.timeline.totalDurationMs / 1000);
        const minutes = Math.floor(durationSec / 60);
        const seconds = durationSec % 60;
        const { description, stepsDetail } = buildStepsDetail(t);
        const slug = configSlugOf(t);
        const slugDates = dates.get(slug).sort();
        const raw = { ...t.timeline.links, ...config.tutorials?.links?.[slug] };
        const links = {
            app: resolveLink(raw.app, config.appUrl, t.timeline.lang),
            docs: resolveLink(raw.docs, config.docsUrl, t.timeline.lang)
        };
        return {
            id: t.timeline.testName,
            category: categoryOf(t),
            // Older timelines don't carry `title` (the Tutorial display title) —
            // fall back to the Playwright test title, then the slug.
            title: t.timeline.title || t.timeline.testTitle || humanize(t.timeline.testName),
            duration: durationSec > 0 ? `${minutes}:${seconds.toString().padStart(2, '0')}` : '',
            durationSeconds: Math.round(t.timeline.totalDurationMs / 100) / 10,
            lang: t.timeline.lang,
            premium: premium.has(slug),
            file: t.videoFile,
            ...(t.poster ? { poster: t.poster } : {}),
            feature: t.timeline.feature,
            variant: t.timeline.variant,
            uploadDate: slugDates[0],
            dateModified: slugDates[slugDates.length - 1],
            ...(links.app || links.docs ? { links } : {}),
            steps: t.stepScreenshots.length,
            description: description ?? stepsDetail.find((s) => s.text && !s.context)?.text,
            stepsDetail: stepsDetail.length > 0 ? stepsDetail : undefined
        };
    });
    // Group the languages of one tutorial: `look`, `look.en`, `look.ar` share the slug `look`.
    const langsBySlug = new Map();
    videos.forEach((v, i) => {
        const lang = v.lang ?? '';
        v.slug = groupSlug.get(tutorials[i]);
        if (lang)
            (langsBySlug.get(v.slug) ?? langsBySlug.set(v.slug, new Set()).get(v.slug)).add(lang);
    });
    for (const v of videos)
        v.langs = [...(langsBySlug.get(v.slug) ?? [])].sort();
    // Section order, then the configured `items` order; unlisted videos keep the scan order (stable sort).
    const sectionRank = Object.keys(categories);
    const slugById = new Map(tutorials.map((t) => [t.timeline.testName, configSlugOf(t)]));
    const rank = (v) => listed.get(slugById.get(v.id))?.rank ?? Infinity;
    videos.sort((a, b) => sectionRank.indexOf(a.category) - sectionRank.indexOf(b.category) || rank(a) - rank(b));
    // Sections and roles left with nothing to show are hidden.
    for (const id of Object.keys(categories))
        if (!videos.some((v) => v.category === id))
            delete categories[id];
    const roles = Object.fromEntries(Object.entries(configRoles ?? {})
        .map(([id, role]) => [id, { ...role, sections: role.sections.filter((s) => s in categories) }])
        .filter(([, role]) => role.sections.length > 0));
    return {
        categories,
        ...(configRoles && Object.keys(roles).length > 0 ? { roles } : {}),
        ...(featured ? { featured } : {}),
        videos,
        ui: {
            heroTitle: config.tutorials?.ui?.heroTitle || config.title,
            heroSubtitle: config.tutorials?.ui?.heroSubtitle ||
                uiString(mergeStrings(config.strings), siteLang(config), 'videoTutorials')
        }
    };
}
//# sourceMappingURL=generate-manifest.js.map