import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { cpSync, existsSync, mkdtempSync, rmSync, readdirSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { execSync } from 'child_process';

// Real installs (network) — opt-in: PD_WORKSPACE_TEST=1 npm test (needs `npm run build` first).
// The fixture app declares only playwright-director: build-site must find astro on its own.
const enabled = process.env.PD_WORKSPACE_TEST === '1';
const fixture = join(__dirname, 'fixtures', 'workspace');
const root = mkdtempSync(join(tmpdir(), 'pd-ws-'));
let tarball = '';

const has = (bin: string) => {
	try {
		execSync(`command -v ${bin}`, { stdio: 'ignore' });
		return true;
	} catch {
		return false;
	}
};

const managers: { name: string; setup: (dir: string) => void; install: string; run: string }[] = [
	{ name: 'bun', setup: () => {}, install: 'bun install --linker isolated --ignore-scripts', run: 'bunx playwright-director build-site' },
	{
		name: 'pnpm',
		setup: (dir) => writeFileSync(join(dir, 'pnpm-workspace.yaml'), 'packages:\n  - apps/*\n'),
		install: 'pnpm install --ignore-scripts',
		run: 'pnpm exec playwright-director build-site'
	},
	{ name: 'npm', setup: () => {}, install: 'npm install --ignore-scripts --no-audit --no-fund', run: 'npx playwright-director build-site' }
];

describe.skipIf(!enabled)('build-site in a workspace (no astro in the app)', () => {
	beforeAll(() => {
		execSync(`npm pack --pack-destination ${root}`, { cwd: join(__dirname, '..'), stdio: 'ignore' });
		tarball = join(root, readdirSync(root).find((f) => f.endsWith('.tgz'))!);
	}, 120_000);
	afterAll(() => rmSync(root, { recursive: true, force: true }));

	for (const pm of managers) {
		it.skipIf(!has(pm.name))(pm.name, () => {
			const dir = join(root, pm.name);
			cpSync(fixture, dir, { recursive: true });
			const appPkg = join(dir, 'apps', 'host', 'package.json');
			writeFileSync(appPkg, readFileSync(appPkg, 'utf-8').replace('TARBALL', tarball));
			pm.setup(dir);
			execSync(pm.install, { cwd: dir, stdio: 'inherit' });
			execSync(pm.run, { cwd: join(dir, 'apps', 'host'), stdio: 'inherit' });
			expect(existsSync(join(dir, 'apps', 'host', 'tutorials', 'site', 'dist', 'embed', 'demo.json'))).toBe(true);
		}, 300_000);
	}
});
