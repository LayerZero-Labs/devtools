import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
// Assuming common-lockfiles.mjs exports the getExampleDirs function
import { getExampleDirs } from './common-lockfiles.mjs'; 
import { exit } from 'node:process';

// --- CONFIGURATION ---
const PNPM_LOCKFILE_NAME = 'pnpm-lock.yaml';

// --- MAIN EXECUTION ---

function main() {
    try {
        // Only consider packages under 'examples/'.
        const dirs = getExampleDirs();

        if (dirs.length === 0) {
            console.error('No packages found under examples/');
            exit(1);
        }

        const pnpmVersion = getPnpmVersionFromPath();
        console.log(`Using pnpm version: ${pnpmVersion}`);
        
        const expectedVersion = getExpectedVersionFromPackageJson();
        // Assert installed pnpm version matches the required version from package.json
        if (pnpmVersion !== expectedVersion) {
            console.error(`\n[FATAL] Version mismatch: Expected pnpm version ${expectedVersion}, got ${pnpmVersion}`);
            exit(1);
        }

        let failures = 0;
        for (const pkgDir of dirs) {
            console.log(`\n[LOCKFILE] Generating lockfile for: ${pkgDir}`);

            // 1. Generate lockfile for package.
            // Using '--lockfile-only' ensures only the lockfile is created/updated, not node_modules.
            const res = spawnSync(
                'pnpm',
                [
                    '--ignore-workspace', 
                    'install', 
                    '--lockfile-only', 
                    '--lockfile-dir', 
                    '.'
                ],
                {
                    cwd: pkgDir,
                    stdio: 'inherit',
                    // Inherit environment variables including necessary PATH settings
                    env: { ...process.env }, 
                }
            );
            
            if (res.status !== 0) {
                console.error(`[LOCKFILE] FAILED: pnpm install failed in ${pkgDir}.`);
                failures++;
                continue; // Skip lockfile existence check if generation failed
            }

            // 2. Ensure lockfile was created.
            if (!existsSync(join(pkgDir, PNPM_LOCKFILE_NAME))) {
                console.error(`[LOCKFILE] FAILED: Missing ${PNPM_LOCKFILE_NAME} after generation in ${pkgDir}.`);
                failures++;
            }
        }

        if (failures) {
            console.error(`\nCompleted with ${failures} failures.`);
            exit(1);
        }

        console.log('\nDone. All lockfiles generated successfully.');

    } catch (error) {
        // Catch and log fatal errors during initialization or version checking
        console.error(`\n[CRITICAL ERROR] Execution failed:`);
        console.error(error.stack || error.message);
        exit(1);
    }
}

// --- HELPER FUNCTIONS ---

function getExpectedVersionFromPackageJson() {
    const packageJsonPath = join(process.cwd(), 'package.json');
    if (!existsSync(packageJsonPath)) {
        throw new Error(`Could not find package.json at: ${packageJsonPath}`);
    }
    
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    const packageManager = packageJson.packageManager;
    
    if (!packageManager?.startsWith('pnpm@')) {
        throw new Error(`Invalid packageManager field: ${packageManager || 'missing'}. Expected format: "pnpm@x.y.z"`);
    }
    
    // Cleaner way to extract version without relying on magic index numbers
    return packageManager.split('@').pop(); 
}

function getPnpmVersionFromPath() {
    const { status, stdout, error } = spawnSync('pnpm', ['--version'], { encoding: 'utf8' });
    
    if (status !== 0) {
        const hint = error?.code === 'ENOENT' ? 'pnpm is not on PATH.' : 'Failed to run "pnpm --version".';
        throw new Error(`Could not determine pnpm version: ${hint}`);
    }
    
    const version = stdout.trim();
    if (!version) {
        throw new Error('Empty version output from "pnpm --version".');
    }
    return version;
}

main();
