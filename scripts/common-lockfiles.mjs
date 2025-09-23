import { readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
const examplesDir = join(repoRoot, 'examples');

// Only consider `examples/`.
export const getExampleDirs = () =>
    readdirSync(examplesDir, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => join(examplesDir, d.name))
        .filter((p) => existsSync(join(p, 'package.json')));
