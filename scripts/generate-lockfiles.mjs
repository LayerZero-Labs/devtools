import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { getExampleDirs } from './common-lockfiles.mjs';

// Only consider `examples/`.
const dirs = getExampleDirs();

if (dirs.length === 0) {
    console.error('No packages found under examples/');
    process.exit(1);
}

const pnpmVersion = getPnpmVersionFromPath();
const expectedVersion = getExpectedVersionFromPackageJson();
// assert pnpm V
if (pnpmVersion !== expectedVersion) {
    console.error(`Expected pnpm version ${expectedVersion}, got ${pnpmVersion}`);
    process.exit(1);
}

let failures = 0;
for (const pkgDir of dirs) {
    console.log(`\n[lockfile] ${pkgDir}`);

    // Generate lockfile for package.
    const res = spawnSync(
        'pnpm',
        ['--ignore-workspace', 'install', '--prefer-frozen-lockfile', '--lockfile-only', '--lockfile-dir', '.'],
        {
            cwd: pkgDir,
            stdio: 'inherit',
            env: { ...process.env },
        }
    );
    if (res.status !== 0) {
        console.error(`[lockfile] failed: ${pkgDir}`);
        failures++;
    }

    // Ensure lockfile was created.
    if (!existsSync(join(pkgDir, 'pnpm-lock.yaml'))) {
        console.error(`[lockfile] missing pnpm-lock.yaml: ${pkgDir}`);
        failures++;
    }
}

if (failures) {
    console.error(`\nCompleted with ${failures} failures`);
    process.exit(1);
}

console.log('\nDone.');

function getExpectedVersionFromPackageJson() {
    const packageJson = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8'));
    const packageManager = packageJson.packageManager;
    if (!packageManager?.startsWith('pnpm@')) {
        throw new Error(`Invalid packageManager: ${packageManager || 'missing'}. Expected format: "pnpm@x.y.z"`);
    }
    return packageManager.slice(5); // Remove "pnpm@" prefix
}

function getPnpmVersionFromPath() {
    const { status, stdout, error } = spawnSync('pnpm', ['--version'], {
        encoding: 'utf8',
    });

    // Not found (e.g., ENOENT) or non-zero exit
    if (status !== 0) {
        const hint = error.code === 'ENOENT' ? 'pnpm is not on PATH.' : 'failed to run "pnpm --version".';
        throw new Error(`Could not determine pnpm version: ${hint}`);
    }

    const v = stdout.trim();
    if (!v) {
        throw new Error('Empty version output from "pnpm --version".');
    }
    return v;
}
