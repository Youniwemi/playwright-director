import { existsSync, writeFileSync, cpSync, rmSync, mkdirSync, symlinkSync, readFileSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { pathToFileURL, fileURLToPath } from 'url';
import { execFileSync } from 'child_process';
import { createRequire } from 'module';
import { createInterface } from 'readline';
import { scanTutorials } from './scan-tutorials.js';
import { generateManifest } from './generate-manifest.js';
import { scaffold } from './scaffold.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DEFAULT_CONFIG = {
    title: 'Tutorials',
    primaryColor: '#6366f1',
    font: 'system-ui, -apple-system, sans-serif',
    input: 'tutorials/',
    output: 'tutorial-site-dist/',
    baseUrl: '/',
    lang: 'fr'
};
/**
 * Astro is playwright-director's dependency, not the consuming app's: resolve
 * it from here and link it into the scaffold's node_modules, so `astro/config`
 * and the compiled components' `astro/*` imports resolve from the build dir
 * under any linker (bun isolated, pnpm, npm workspaces). Returns the CLI path.
 */
export function linkAstro(buildDir) {
    let pkgPath;
    try {
        pkgPath = createRequire(import.meta.url).resolve('astro/package.json');
    }
    catch {
        throw new Error('[build-site] astro is not installed next to playwright-director — reinstall playwright-director.');
    }
    const astroDir = dirname(pkgPath);
    const link = join(buildDir, 'node_modules', 'astro');
    mkdirSync(dirname(link), { recursive: true });
    rmSync(link, { recursive: true, force: true });
    symlinkSync(astroDir, link, 'junction');
    const { bin } = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    return join(astroDir, typeof bin === 'string' ? bin : bin.astro);
}
function ask(question) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    return new Promise((res) => {
        rl.question(question, (answer) => {
            rl.close();
            res(answer.trim().toLowerCase());
        });
    });
}
export async function buildSite(configPath) {
    const resolvedConfigPath = resolve(configPath || join(process.cwd(), 'tutorial-site.config.js'));
    let config;
    if (existsSync(resolvedConfigPath)) {
        console.log(`  Using config: ${resolvedConfigPath}`);
        const imported = await import(pathToFileURL(resolvedConfigPath).href);
        config = { ...DEFAULT_CONFIG, ...imported.default };
    }
    else {
        console.log('  No config file found. Generating tutorial-site.config.js with defaults...');
        const configContent = `/** @type {import('playwright-director/site').SiteConfig} */
export default ${JSON.stringify(DEFAULT_CONFIG, null, 2)};
`;
        writeFileSync(resolvedConfigPath, configContent);
        console.log(`  Created ${resolvedConfigPath}`);
        const answer = await ask('  Continue with defaults? [Y/n] ');
        if (answer && answer !== 'y' && answer !== 'yes') {
            console.log('  Edit the config file, then re-run build-site.');
            return;
        }
        config = { ...DEFAULT_CONFIG };
    }
    config.input = resolve(config.input);
    config.output = resolve(config.output);
    config.timelines = resolve(config.timelines ?? join(config.input, 'output'));
    config.videos = resolve(config.videos ?? join(config.input, 'videos'));
    console.log(`\n  Scanning ${config.timelines} and ${config.videos} for tutorials...`);
    const tutorials = scanTutorials(config.input, config.timelines, config.videos);
    if (tutorials.length === 0) {
        console.error(`  No tutorials found: need .webm files in ${config.videos} (timelines in ${config.timelines}). Set \`videos\` / \`timelines\` in the config if they live elsewhere.`);
        process.exit(1);
    }
    console.log(`  Found ${tutorials.length} tutorial(s).`);
    const manifest = generateManifest(tutorials, config);
    console.log(`  Generated manifest: ${manifest.videos.length} videos, ${Object.keys(manifest.categories).length} categories.`);
    const tempDir = join(config.output, '.astro-build');
    console.log('  Scaffolding Astro project...');
    scaffold(config, manifest, tempDir);
    console.log('  Building static site...');
    try {
        execFileSync(process.execPath, [linkAstro(tempDir), 'build'], {
            cwd: tempDir,
            stdio: 'inherit',
            env: { ...process.env, NODE_ENV: 'production' }
        });
    }
    catch {
        console.error('  Astro build failed.');
        process.exit(1);
    }
    cpSync(join(tempDir, 'dist'), config.output, { recursive: true });
    rmSync(tempDir, { recursive: true, force: true });
    console.log(`\n  ✓ Site built to ${config.output}`);
    console.log(`  Open ${join(config.output, 'index.html')} to preview.\n`);
}
//# sourceMappingURL=build-site.js.map