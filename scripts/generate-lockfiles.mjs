import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { getExampleDirs } from './common-lockfiles.mjs';

// Only consider `examples/`.
const dirs = getExampleDirs();

if (dirs.length === 0) {
    console.error('No packages found under examples/');
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
