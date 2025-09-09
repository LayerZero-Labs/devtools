import { readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const examplesDir = join(repoRoot, "examples");

// Only consider `examples/`.
const dirs = readdirSync(examplesDir, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => join(examplesDir, d.name))
  .filter(p => existsSync(join(p, "package.json")));

if (dirs.length === 0) {
  console.error("No packages found under examples/");
  process.exit(1);
}

let failures = 0;
for (const pkgDir of dirs) {
  console.log(`\n[lockfile] ${pkgDir}`);

  // Generate lockfile for package.
  const res = spawnSync(
    "pnpm",
    ["--ignore-workspace", "install", "--lockfile-only", "--lockfile-dir", "."],
    { cwd: pkgDir, stdio: "inherit", env: { ...process.env } }
  );
  if (res.status !== 0) {
    console.error(`[lockfile] failed: ${pkgDir}`);
    failures++;
  }

  // Ensure lockfile was created.
  if (!existsSync(join(pkgDir, "pnpm-lock.yaml"))) {
    console.error(`[lockfile] missing pnpm-lock.yaml: ${pkgDir}`);
    failures++;
  }
}

if (failures) {
  console.error(`\nCompleted with ${failures} failures`);
  process.exit(1);
}

console.log("\nDone.");
