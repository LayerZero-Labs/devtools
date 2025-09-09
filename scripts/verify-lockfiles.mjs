import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { cwd: repoRoot, encoding: "utf8", ...opts });
  if (r.error) throw r.error;
  return r;
}

// Regenerate all lockfiles.
const gen = run("node", ["scripts/generate-lockfiles.mjs"], { stdio: "inherit" });
if (gen.status !== 0) process.exit(gen.status || 1);

// Check if any lockfiles changed or are untracked.
const diff = run("git", ["diff", "--name-only"]);
const untracked = run("git", ["ls-files", "--others", "--exclude-standard"]);
const changed = [
  ...diff.stdout.split("\n"),
  ...untracked.stdout.split("\n"),
]
  .filter(Boolean)
  .filter(p => /^(examples\/[^/]+\/pnpm-lock\.yaml)$/.test(p));

if (changed.length) {
  console.error("\n🔴 Lockfiles changed.\n");
  for (const f of changed) {
    console.error(`Changed: ${f}`);
  }
  process.exit(1);
}

console.log("🟢 Lockfiles match.");
