/** Bumped on any breaking change to the embed payloads; additions keep it. */
export const EMBED_SCHEMA_VERSION = 1;
/** config.lang may be a comma-separated list — the first entry is the site default */
const siteLang = (config) => (config.lang || 'en').split(',')[0].trim();
export function buildEmbedTutorial(video, config) {
    let counter = 0;
    const steps = (video.stepsDetail ?? []).map((s) => ({
        ...(s.context ? {} : { num: ++counter }),
        ...(s.at !== undefined ? { at: s.at } : {}),
        ...(s.title ? { title: s.title } : {}),
        ...(s.key ? { key: s.key } : {}),
        ...(s.text ? { text: s.text } : {}),
        ...(s.image ? { image: `videos/${s.image}` } : {}),
        ...(s.context ? { context: true } : {})
    }));
    const poster = video.poster ?? (video.stepsDetail ?? []).find((s) => s.image)?.image;
    return {
        schemaVersion: EMBED_SCHEMA_VERSION,
        id: video.id,
        title: video.title,
        ...(video.description ? { description: video.description } : {}),
        duration: video.duration,
        durationSeconds: video.durationSeconds ?? 0,
        ...(video.variant ? { variant: video.variant } : {}),
        ...(video.slug ? { slug: video.slug } : {}),
        lang: video.lang || siteLang(config),
        ...(video.langs?.length ? { langs: video.langs } : {}),
        accent: config.primaryColor || '#6366f1',
        video: `videos/${video.file}`,
        ...(poster ? { poster: `videos/${poster}` } : {}),
        page: `${video.id}/`,
        steps
    };
}
/** All the JSON files players consume: one payload per tutorial plus an
 *  index (slug discovery). Paths are relative to the site root — scaffold
 *  writes them under public/. */
export function buildEmbedFiles(manifest, config) {
    const defaultLang = siteLang(config);
    const files = new Map();
    for (const v of manifest.videos)
        files.set(`embed/${v.id}.json`, buildEmbedTutorial(v, config));
    // Per-language aliases: embed/<slug>.<lang>.json for every recorded language,
    // and embed/<slug>.json = the default language (else the first one recorded).
    const bySlug = new Map();
    for (const v of manifest.videos) {
        const slug = v.slug ?? v.id;
        bySlug.set(slug, [...(bySlug.get(slug) ?? []), v]);
    }
    const primary = [];
    for (const [slug, group] of bySlug) {
        const langOf = (v) => v.lang || defaultLang;
        for (const v of group) {
            const path = `embed/${slug}.${langOf(v)}.json`;
            if (!files.has(path))
                files.set(path, buildEmbedTutorial(v, config));
        }
        const main = group.find((v) => langOf(v) === defaultLang) ?? group[0];
        primary.push(main);
        if (!files.has(`embed/${slug}.json`))
            files.set(`embed/${slug}.json`, buildEmbedTutorial(main, config));
    }
    const index = {
        schemaVersion: EMBED_SCHEMA_VERSION,
        defaultLang,
        tutorials: primary.map((v) => ({
            id: v.id,
            ...(v.slug ? { slug: v.slug } : {}),
            title: v.title,
            duration: v.duration,
            durationSeconds: v.durationSeconds ?? 0,
            lang: v.lang || defaultLang,
            ...(v.langs?.length ? { langs: v.langs } : {}),
            ...(v.variant ? { variant: v.variant } : {})
        }))
    };
    files.set('embed/index.json', index);
    return [...files].map(([path, data]) => ({ path, data }));
}
//# sourceMappingURL=embed.js.map