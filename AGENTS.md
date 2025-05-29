# AGENTS.md (Root-Level Configuration)

This file defines global rules & conventions for Codex agents working in the **devtools** monorepo.

---

## 1. Agent Settings

```yaml
model: codex-32k
approvalMode: manual     # Options: auto / manual / semi
notifications:
  onCompletion: true
  onError: true
```

---

## 2. Environment Setup

1. **Setup Script** (internet + proxy phase)

   * Install system deps: `solc`, Foundry (`forge` & `cast`), Hardhat tools.
   * Seed offline caches:

     * Solidity compiler binaries under `~/.foundry/solc/…`
     * Hardhat `list.json` under each project's `cache/solc-bin/bin`.
   * Bootstrap JS deps: `pnpm install` (root) to populate lockfile and `node_modules`.

2. **Code-Mode** (network disabled)

   * Only run builds & tests against prepared caches.
   * No additional `apt-get` or registry downloads allowed.

3. **Offline Metadata**

   * Snapshot LayerZero metadata during setup:
     ```bash
     # In setup script
     mkdir -p cache/metadata
     curl -sSL https://metadata.layerzero-api.com/v1/metadata/deployments \
         -o cache/metadata/deployments.json
     curl -sSL https://metadata.layerzero-api.com/v1/metadata/dvns \
         -o cache/metadata/dvns.json
     curl -sSL https://metadata.layerzero-api.com/v1/metadata/defaultConfig \
         -o cache/metadata/defaultConfig.json
     ```

   * During code-mode, agents must read from local cache instead of live URLs:

     * `cache/metadata/deployments.json`: Contains all LayerZero on-chain deployment addresses for every chain (Endpoints, Message Libraries, etc.)
     * `cache/metadata/dvns.json`: Contains DVN (Decentralized Verifier Network) records with contract addresses and endpoint IDs
     * `cache/metadata/defaultConfig.json`: Contains default cross-chain configuration settings between Endpoints

   * Benefits:
     * Setup captures latest metadata during internet access
     * Code-mode runs fully offline using local JSON snapshots
     * Provides reference data for metadata-tools package and LayerZero configurations

---

## 3. Repo Structure Overview

```
/
├── examples/        ← standalone demo projects
│   ├── oapp/       ← LayerZero OApp examples
│   ├── oft/        ← OFT implementation examples
│   └── onft/       ← ONFT implementation examples
|   └── .../
├── packages/        ← reusable libraries & plugins
│   ├── devtools/   ← core devtools package
│   ├── oft-evm/        ← OFT implementations
│   └── onft-evm/       ← ONFT implementations
│   └── .../ 
├── tests/           ← integration & helper suites
|    └── .../
├── .gitignore
├── turbo.json       ← Turbo Pipeline config
├── package.json     ← monorepo root
└── AGENTS.md        ← this file
```

---

## 4. JS Tooling & Build

* **Package Manager**: pnpm v8.15.6 (via Corepack or `npm install -g pnpm@8.15.6`).
* **Monorepo Runner**: Turbo (`turbo.json`).

  * CI concurrency: `npx turbo run build --force --concurrency=2`
  * Local dev: adjust `--concurrency` up to available cores.
* **Commands**:

  * Install: `pnpm install`
  * Build:   `npx turbo run build`
  * Test CI: `pnpm test:ci`
  * Test Local: `pnpm test:local`
  * E2E User:   `pnpm test:user`
  * Lint:      `pnpm lint:fix`

---

## 5. Agent Workflow

1. **Initial Setup**
   * Run `pnpm install` to install dependencies
   * Ensure all required system tools are available

2. **Development Phase**
   * Make necessary code changes
   * Follow platform-specific guidelines in respective CODEX.md files
   * Ensure changes are properly documented

3. **Pre-Submission Checks**
   * Run `pnpm build` to verify compilation
   * Run `pnpm lint:fix` to ensure code style consistency
   * Run `pnpm test:local` to verify tests pass
   * If package changes were made:
     * Run `pnpm changeset` to create version updates
     * Review and commit changeset files

4. **PR Creation**
   * Create PR with clear title and description
   * Include changeset if applicable
   * Ensure CI checks pass

---

## 6. Versioning & Changesets

After modifying any packages under `examples/`, `packages/`, or `tests/`:

```bash
pnpm changeset
```

Generates and stages a changeset for versioning & changelog.

---

## 7. Commit & PR Guidelines

* **Commits**: semantic scope:

  * `feat(hardhat): add network mapping`
  * `fix(example-onft721): correct anchor script`
* **PR Title**: brief summary (max 72 chars).
* **PR Body**:

  1. Motivation
  2. What changed
  3. How to verify (build/test commands)
* **Footer**: link to changeset, list breaking changes.

---

## 8. Directory-Specific Overrides

Codex will apply the most specific `CODEX.md` under:

* `examples/CODEX.md`
* `packages/CODEX.md`
* `tests/CODEX.md`

Each directory's CODEX.md provides platform-specific guidelines while maintaining consistency with this root configuration.