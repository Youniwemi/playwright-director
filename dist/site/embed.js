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
        lang: video.lang || siteLang(config),
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
    const files = manifest.videos.map((v) => ({
        path: `embed/${v.id}.json`,
        data: buildEmbedTutorial(v, config)
    }));
    const index = {
        schemaVersion: EMBED_SCHEMA_VERSION,
        tutorials: manifest.videos.map((v) => ({
            id: v.id,
            title: v.title,
            duration: v.duration,
            durationSeconds: v.durationSeconds ?? 0,
            lang: v.lang || siteLang(config),
            ...(v.variant ? { variant: v.variant } : {})
        }))
    };
    files.push({ path: 'embed/index.json', data: index });
    return files;
}
//# sourceMappingURL=embed.js.map