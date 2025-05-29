# examples/CODEX.md

```yaml
model: codex-32k
approvalMode: manual
```

## Example Categories

```
examples/
├── oapp/                    ← LayerZero OApp example
├── oapp-read/              ← OApp read-only example
├── oapp-aptos-move/        ← Aptos Move OApp
├── oapp-evm/               ← EVM OApp implementation
├── oapp-evm-upgradeable/   ← Upgradeable EVM OApp
├── oft/                    ← OFT base example
├── oft-evm/                ← EVM OFT implementation
├── oft-solana/             ← Solana OFT implementation
├── oft-aptos-move/         ← Aptos Move OFT
├── oft-hyperliquid/        ← Hyperliquid OFT
├── oft-upgradeable/        ← Upgradeable OFT
├── oft-alt/                ← Alternative OFT
├── oft-adapter/            ← OFT adapter pattern
├── onft721/                ← ONFT721 implementation
├── onft721-zksync/         ← ZkSync ONFT721
└── [other specialized examples]
```

## Example Structure by Platform

### EVM Examples (Solidity)
```
example-name/
├── contracts/              ← Smart contracts
│   ├── mocks/             ← Contract mocks
│   │   └── ExampleOAppMock.sol  ← Mock contract for testing
│   └── ExampleOApp.sol    ← Contract solidity file
├── tasks/                 ← Hardhat tasks
│   ├── verify.ts          ← Verification task
│   └── [other-tasks].ts   ← Additional tasks
├── deploy/                ← Deployment scripts
├── test/                  ← Integration tests
├── cache/                 ← Hardhat cache
├── artifacts/             ← Compiled artifacts
├── hardhat.config.ts      ← Hardhat configuration
├── layerzero.config.ts    ← LayerZero configuration
├── package.json           ← Project configuration
└── README.md              ← Documentation
```

### Solana Examples (Rust)
```
example-name/
├── programs/              ← Solana programs
│   ├── src/              ← Program source code
│   │   ├── lib.rs        ← Program entry point
│   │   └── [modules]/    ← Program modules
│   └── tests/            ← Program tests
├── tasks/                ← Hardhat tasks
│   ├── deploy.ts         ← Deployment task
│   ├── verify.ts         ← Verification task
│   └── [other-tasks].ts  ← Additional tasks
├── deploy/               ← Deployment scripts
├── test/                 ← Integration tests
├── target/               ← Compiled artifacts
├── Anchor.toml           ← Anchor configuration
├── package.json          ← Project configuration
└── README.md             ← Documentation
```

### Aptos Examples (Move)
```
example-name/
├── sources/              ← Move source code
│   ├── example.move      ← Main contract file
│   └── [modules]/        ← Additional modules
├── tasks/               ← Hardhat tasks
│   ├── deploy.ts        ← Deployment task
│   ├── verify.ts        ← Verification task
│   └── [other-tasks].ts ← Additional tasks
├── deploy/              ← Deployment scripts
├── test/                ← Integration tests
├── build/               ← Compiled artifacts
├── Move.toml            ← Move configuration
├── package.json         ← Project configuration
└── README.md            ← Documentation
```

## Tasks and HRE Usage

All examples use the Hardhat Runtime Environment (HRE) for TypeScript-based tasks, regardless of the underlying blockchain platform. This provides a consistent interface for:

1. **Task Structure**
   * Tasks are TypeScript files in the `tasks/` directory
   * Each task exports a function that receives the HRE
   * Tasks can be registered in the platform-specific config file

2. **Common Tasks**
   * `deploy.ts`: Contract deployment and initialization
   * `verify.ts`: Contract verification on block explorers
   * Platform-specific tasks for chain operations

3. **HRE Benefits**
   * Consistent TypeScript development experience
   * Shared utilities and helpers
   * Common configuration management
   * Unified task running interface

4. **Platform Integration**
   * EVM: Direct Hardhat integration
   * Solana: Uses HRE for TypeScript tasks, Anchor for Rust
   * Aptos: Uses HRE for TypeScript tasks, Move for contracts

## Guidelines

1. **README.md**
   * Prereqs & proxy setup (reference `$CODEX_PROXY_CERT`)
   * Build & run: `pnpm install && pnpm build`
   * Test: `pnpm test:local`
   * Include:
     * Project overview
     * Setup instructions
     * Usage examples
     * Troubleshooting guide

2. **Dependencies**
   * Agent runs `pnpm install` once in setup
   * No extra installs during code phase
   * Use exact versions in package.json
   * Document all external dependencies

3. **Compilation**
   * EVM: Hardhat/Foundry with `/usr/bin/solc`
   * Solana: Anchor with Rust toolchain
   * Aptos: Move compiler with Move.toml
   * Document any special compilation requirements

4. **Skip Heavy Builds**
   * Long-running scripts stubbed to `echo skipped`
   * Ensure any OOM-risk tasks are stubbed in `package.json`
   * Document skipped functionality
   * Provide alternative lightweight options

5. **Testing**
   * Provide minimal tests in `test/`
   * Agent runs `pnpm test:local`; must pass
   * Include:
     * Unit tests for core functionality
     * Integration tests for key workflows
     * Smoke tests for basic operations

6. **Commits & PRs**
   * Prefix: `example(<name>): …`
   * Validate via `pnpm test:ci` in Docker
   * Include:
     * Clear commit messages
     * PR description with changes
     * Testing instructions

## Project Structure Guidelines

1. **Contract Organization**
   * EVM: Follow Solidity best practices
   * Solana: Follow Anchor program structure
   * Aptos: Follow Move module structure
   * Include proper documentation
   * Maintain consistent code style

2. **Configuration**
   * Use environment variables for sensitive data
   * Document all configuration options
   * Provide example config files
   * Include validation for config values

3. **Documentation**
   * Keep README up to date
   * Document contract interfaces
   * Include deployment examples
   * Provide troubleshooting guides

4. **Security**
   * No hardcoded secrets
   * Use secure defaults
   * Document security considerations
   * Include security best practices
