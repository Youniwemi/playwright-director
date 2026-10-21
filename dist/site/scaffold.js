import { cpSync, mkdirSync, writeFileSync, existsSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { buildEmbedFiles } from './embed.js';
import { mergeStrings } from './strings.js';
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
export function scaffold(config, manifest, tempDir) {
    const templateDir = join(__dirname, '..', '..', 'templates', 'site');
    mkdirSync(tempDir, { recursive: true });
    cpSync(templateDir, tempDir, { recursive: true });
    const siteConfigData = {
        title: config.title,
        logo: config.logo,
        primaryColor: config.primaryColor,
        font: config.font,
        baseUrl: config.baseUrl,
        lang: config.lang,
        stepsLayout: config.tutorials?.stepsLayout || 'text',
        showStrip: config.tutorials?.showStrip !== false,
        strings: mergeStrings(config.strings)
    };
    if (config.logo && existsSync(config.logo)) {
        const logoExt = config.logo.split('.').pop();
        mkdirSync(join(tempDir, 'public'), { recursive: true });
        cpSync(config.logo, join(tempDir, 'public', `logo.${logoExt}`));
        siteConfigData.logo = `/logo.${logoExt}`;
    }
    mkdirSync(join(tempDir, 'src', 'data'), { recursive: true });
    writeFileSync(join(tempDir, 'src', 'data', 'site-config.json'), JSON.stringify(siteConfigData, null, 2));
    writeFileSync(join(tempDir, 'src', 'data', 'tutorials.json'), JSON.stringify(manifest, null, 2));
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
    const videosDir = resolve(config.videos ?? join(config.input, 'videos'));
    const publicVideos = join(tempDir, 'public', 'videos');
    if (existsSync(videosDir)) {
        mkdirSync(publicVideos, { recursive: true });
        cpSync(videosDir, publicVideos, { recursive: true });
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