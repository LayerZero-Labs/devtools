import { spawnSync } from 'node:child_process';
import { getExampleDirs } from './common-lockfiles.mjs';

// Only consider `examples/`.
const dirs = getExampleDirs();

if (dirs.length === 0) {
    console.error('No packages found under examples/');
    process.exit(1);
}

const failedPackages = [];

for (const pkgDir of dirs) {
    console.log(`\n[lockfile] ${pkgDir}`);

    // Verify lockfile is valid for package.
    const res = spawnSync(
        'pnpm',
        ['--ignore-workspace', 'install', '--frozen-lockfile', '--offline', '--lockfile-only', '--lockfile-dir', '.'],
        {
            cwd: pkgDir,
            stdio: 'inherit',
            env: { ...process.env },
        }
    );
    if (res.status !== 0) {
        console.error(`[lockfile] failed: ${pkgDir}`);
        failedPackages.push(pkgDir);
    }
}

if (failedPackages.length) {
    console.error(`\n🔴 Lockfile verification failed for:`);
    for (const f of failedPackages) {
        console.error(` - ${f}`);
    }
    process.exit(1);
}

console.log('\n🟢 Lockfiles match.');
