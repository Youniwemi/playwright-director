import { cpSync, mkdirSync, writeFileSync, existsSync, readFileSync, readdirSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { buildEmbedFiles, siteLang } from './embed.js';
import { mergeStrings } from './strings.js';
import { tokensCss } from './tokens.js';
import { siteUrlOf, videoJsonLd, buildSitemap, buildRobots, buildLinksFile } from './seo.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
/**
 * Cloudflare Pages / Netlify `_headers`: CORS on what an app on another origin
 * fetches (embed JSON, client.js, widget.js, videos/posters), a short cache on
 * the data and scripts (they change on every build) and a longer one on media.
 * Returns '' when `cors` is false.
 */
export function buildHeadersFile(basePath, cors) {
    if (cors === false)
        return '';
    const base = basePath.endsWith('/') ? basePath : `${basePath}/`;
    const rule = (path, maxAge) => `${base}${path}\n  Access-Control-Allow-Origin: ${cors}\n  Cache-Control: public, max-age=${maxAge}\n`;
    // shortcut: media keep their name across re-recordings, so a week, not immutable — upgrade with hashed names.
    return [rule('embed/*', 300), rule('client.js', 300), rule('widget.js', 300), rule('videos/*', 604800)].join('\n');
}
/** Matches the files of these tutorial ids in the videos folder: `<id>.<ext>`, `<id>-poster.*`, `<id>-step-N.*` */
export function ownedBy(ids) {
    const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`^(${ids.map(esc).join('|')})(\\.[a-z0-9]+|-poster\\.[a-z0-9]+|-step-\\d+\\.[a-z0-9]+)$`, 'i');
    return (file) => re.test(file);
}
export const THEMES = ['academy', 'classic'];
/** Google Fonts each theme loads unless the config sets `googleFonts` */
const THEME_FONTS = {
    academy: ['Fraunces:opsz,wght@9..144,400;9..144,600', 'Manrope:wght@400;500;600;700'],
    classic: []
};
/**
 * Copy order — later wins: shared base (templates/site) → theme (templates/themes/<theme> → src/theme/)
 * → config `overrides` (over src/) → generated files (data, user.css, public/*).
 */
export function scaffold(config, manifest, tempDir) {
    const templatesDir = join(__dirname, '..', '..', 'templates');
    const theme = config.theme ?? 'academy';
    if (!THEMES.includes(theme)) {
        throw new Error(`Unknown theme "${theme}". Available themes: ${THEMES.join(', ')}`);
    }
    mkdirSync(tempDir, { recursive: true });
    cpSync(join(templatesDir, 'site'), tempDir, { recursive: true });
    cpSync(join(templatesDir, 'themes', theme), join(tempDir, 'src', 'theme'), { recursive: true });
    if (config.overrides) {
        if (!existsSync(config.overrides))
            throw new Error(`overrides folder not found: ${config.overrides}`);
        cpSync(config.overrides, join(tempDir, 'src'), { recursive: true });
    }
    const site = siteUrlOf(config);
    const siteConfigData = {
        title: config.title,
        logo: config.logo,
        baseUrl: config.baseUrl,
        lang: config.lang,
        theme,
        stepsLayout: config.tutorials?.stepsLayout || 'text',
        showStrip: config.tutorials?.showStrip !== false,
        googleFonts: config.googleFonts === false ? [] : (config.googleFonts ?? THEME_FONTS[theme]),
        themeSwitcher: config.themeSwitcher,
        appUrl: config.appUrl,
        cta: config.cta !== false,
        strings: mergeStrings(config.strings),
        siteUrl: site
    };
    if (config.logo && existsSync(config.logo)) {
        const logoExt = config.logo.split('.').pop();
        mkdirSync(join(tempDir, 'public'), { recursive: true });
        cpSync(config.logo, join(tempDir, 'public', `logo.${logoExt}`));
        siteConfigData.logo = `/logo.${logoExt}`;
    }
    // Config tokens (primaryColor / font are the pre-0.6 spellings) + the extra stylesheet, loaded last.
    const tokens = { primary: config.primaryColor, fontBody: config.font, ...config.tokens };
    let userCss = tokensCss(tokens); // tokensCss skips empty values
    if (config.css) {
        if (!existsSync(config.css))
            throw new Error(`css file not found: ${config.css}`);
        userCss += `\n${readFileSync(config.css, 'utf-8')}`;
    }
    writeFileSync(join(tempDir, 'src', 'styles', 'user.css'), userCss || '/* no tokens, no css */\n');
    // SEO needs absolute URLs: JSON-LD per video page, sitemap, robots, links.json only with a full baseUrl.
    const pageData = site ? { ...manifest, videos: manifest.videos.map((v) => ({ ...v, jsonLd: videoJsonLd(v, site) })) } : manifest;
    mkdirSync(join(tempDir, 'public'), { recursive: true });
    if (site) {
        writeFileSync(join(tempDir, 'public', 'sitemap.xml'), buildSitemap(manifest, site, siteLang(config)));
        // Crawlers only read robots.txt at the host root
        if (new URL(site).pathname === '/')
            writeFileSync(join(tempDir, 'public', 'robots.txt'), buildRobots(site));
        writeFileSync(join(tempDir, 'public', 'links.json'), JSON.stringify(buildLinksFile(manifest, site), null, 2));
    }
    mkdirSync(join(tempDir, 'src', 'data'), { recursive: true });
    writeFileSync(join(tempDir, 'src', 'data', 'site-config.json'), JSON.stringify(siteConfigData, null, 2));
    writeFileSync(join(tempDir, 'src', 'data', 'tutorials.json'), JSON.stringify(pageData, null, 2));
    // In-app widget data: one JSON payload per tutorial + an index, served
    // next to widget.js (template public/) so any app can embed tutorials.
    // The headless client (dist/client.js) is served as <site>/client.js — widget.js imports it.
    // From src/ (unit tests) the compiled copy lives in dist/.
    const clientJs = [join(__dirname, '..', 'client.js'), join(__dirname, '..', '..', 'dist', 'client.js')].find(existsSync);
    if (clientJs)
        cpSync(clientJs, join(tempDir, 'public', 'client.js'));
    const embedDir = join(tempDir, 'public', 'embed');
    mkdirSync(embedDir, { recursive: true });
    for (const file of buildEmbedFiles(manifest, config)) {
        writeFileSync(join(tempDir, 'public', file.path), JSON.stringify(file.data, null, 2));
    }
    // Only the published tutorials' files: an excluded (or --only filtered) tutorial must leave no video behind.
    const videosDir = resolve(config.videos ?? join(config.input, 'videos'));
    const publicVideos = join(tempDir, 'public', 'videos');
    if (existsSync(videosDir)) {
        mkdirSync(publicVideos, { recursive: true });
        const owned = ownedBy(manifest.videos.map((v) => v.id));
        for (const file of readdirSync(videosDir))
            if (owned(file))
                cpSync(join(videosDir, file), join(publicVideos, file));
    }
    // baseUrl is a full URL (site + base) or just a path ("/docs/") for a sub-path deployment.
    let siteDirective = '';
    let basePath = '/';
    if (config.baseUrl && config.baseUrl.startsWith('http')) {
        siteDirective = `site: ${JSON.stringify(config.baseUrl)},`;
        try {
            basePath = new URL(config.baseUrl).pathname || '/';
        }
        catch { /* invalid URL, skip */ }
    }
    else if (config.baseUrl?.startsWith('/')) {
        basePath = config.baseUrl;
    }
    const baseDirective = basePath !== '/' ? `base: ${JSON.stringify(basePath)},` : '';
    const headers = buildHeadersFile(basePath, config.cors ?? '*');
    if (headers)
        writeFileSync(join(tempDir, 'public', '_headers'), headers);
    const astroConfig = `import { defineConfig } from 'astro/config';

export default defineConfig({
  srcDir: './src',
  publicDir: './public',
  outDir: './dist',
  ${siteDirective}
  ${baseDirective}
  build: { assets: 'assets' },
});
`;
    writeFileSync(join(tempDir, 'astro.config.mjs'), astroConfig);
    writeFileSync(join(tempDir, 'package.json'), JSON.stringify({ name: 'tutorial-site-build', type: 'module', private: true }, null, 2));
    return tempDir;
}
//# sourceMappingURL=scaffold.js.map