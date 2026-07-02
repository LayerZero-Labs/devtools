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

## 2. Package Relationship Diagram

```
                    toolbox-hardhat
                    (main entry point)
                           │
           ┌───────────────┼───────────────┐
           │               │               │
           ▼               ▼               ▼
    ua-devtools-    devtools-evm-    protocol-devtools-
    evm-hardhat       hardhat           evm
           │               │               │
           └───────┬───────┴───────┬───────┘
                   │               │
                   ▼               ▼
             devtools-evm       devtools
                               (core types)
```

**Key Packages:**
- `toolbox-hardhat` - Main entry point, re-exports everything
- `ua-devtools-evm-hardhat` - OApp/OFT wiring tasks
- `devtools-evm-hardhat` - Deploy tasks, HRE utilities
- `devtools` - Core types (OmniPoint, OmniGraph)

---

## 3. Directory-Specific AGENTS.md Files

Codex will apply the most specific `AGENTS.md` under:

| Directory | Contains |
|-----------|----------|
| `examples/AGENTS.md` | Example-specific guidelines, structure templates |
| `packages/AGENTS.md` | Package-specific guidelines, naming conventions |
| `tests/AGENTS.md` | Test-specific guidelines |
| `examples/*/AGENTS.md` | Per-example build/test commands |
| `packages/*/AGENTS.md` | Per-package build/test commands |

---

## 4. Environment Setup

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

---

## 5. Repo Structure Overview

```
/
├── examples/        ← standalone demo projects
│   ├── oapp/        ← OApp example (start here for messaging)
│   ├── oft/         ← OFT example (start here for tokens)
│   ├── oft-adapter/ ← Wrap existing ERC20
│   └── .../
├── packages/        ← reusable libraries & plugins
│   ├── toolbox-hardhat/      ← Main entry point
│   ├── devtools/             ← Core types
│   ├── devtools-evm-hardhat/ ← Deploy tasks
│   ├── ua-devtools-evm-hardhat/ ← OApp/OFT tasks
│   ├── oft-evm/              ← OFT contracts
│   └── .../
├── tests/           ← integration & helper suites
├── turbo.json       ← Turbo Pipeline config
├── package.json     ← monorepo root
├── WORKFLOW.md      ← Deployment workflow guide
├── DEBUGGING.md     ← Troubleshooting guide
├── CHEATSHEET.md    ← Quick reference
└── AGENTS.md        ← this file
```

---

## 6. JS Tooling & Build

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

## 7. Common Hardhat Tasks

| Task | Description | Package |
|------|-------------|---------|
| `lz:deploy` | Deploy contracts to all configured networks | devtools-evm-hardhat |
| `lz:oapp:wire` | Wire OApp pathways (setPeer, setConfig) | ua-devtools-evm-hardhat |
| `lz:oapp:config:get` | Get current on-chain configuration | ua-devtools-evm-hardhat |
| `lz:oapp:config:get:default` | Get LayerZero default configuration | ua-devtools-evm-hardhat |
| `lz:oapp:peers:get` | Get peer relationships | ua-devtools-evm-hardhat |
| `lz:read:wire` | Wire OApp Read channels | ua-devtools-evm-hardhat |
| `lz:errors:decode` | Decode LayerZero error messages | ua-devtools-evm-hardhat |

---

## 8. Agent Workflow

1. **Initial Setup**
   * Run `pnpm install` to install dependencies
   * Ensure all required system tools are available

2. **Development Phase**
   * Make necessary code changes
   * Follow platform-specific guidelines in respective AGENTS.md files
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

## 9. Common Troubleshooting Patterns

| Issue | Diagnostic | Solution |
|-------|------------|----------|
| "Peer not set" | `lz:oapp:peers:get` | Run `lz:oapp:wire` |
| "InvalidNonce" | Check message lifecycle | Verify DVN verification |
| Config mismatch | `lz:oapp:config:get` | Compare with expected config |
| Build fails | `pnpm build --filter <pkg>` | Check dependencies |
| Deploy fails | Check `.env` | Verify RPC URLs, credentials |

---

## 10. Versioning & Changesets

After modifying any packages under `examples/`, `packages/`, or `tests/`:

```bash
pnpm changeset
```

Generates and stages a changeset for versioning & changelog.

---

## 11. Commit & PR Guidelines

* **Commits**: semantic scope:

  * `feat(hardhat): add network mapping`
  * `fix(example-onft721): correct anchor script`
* **PR Title**: brief summary (max 72 chars).
* **PR Body**:

  1. Motivation
  2. What changed
  3. How to verify (build/test commands)
* **Footer**: link to changeset, list breaking changes.
