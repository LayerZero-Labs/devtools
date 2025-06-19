# packages/CODEX.md

```yaml
model: codex-32k
approvalMode: manual
```

## Package Categories

```
packages/
├── devtools/                    ← Core devtools package
├── devtools-evm/               ← EVM-specific tools
├── devtools-evm-hardhat/       ← Hardhat integration
├── devtools-solana/            ← Solana-specific tools
├── devtools-move/              ← Move-specific tools
├── devtools-ton/               ← TON-specific tools
├── devtools-cli/               ← CLI tools
├── devtools-extensible-cli/    ← Extensible CLI framework
├── ua-devtools/                ← User acceptance tools
├── ua-devtools-evm/            ← EVM user acceptance
├── ua-devtools-solana/         ← Solana user acceptance
├── protocol-devtools/          ← Protocol tools
├── protocol-devtools-evm/      ← EVM protocol tools
├── protocol-devtools-solana/   ← Solana protocol tools
├── oft-evm/                    ← EVM OFT implementation
├── oft-solana/                 ← Solana OFT implementation
├── oft-move/                   ← Move OFT implementation
├── onft-evm/                   ← EVM ONFT implementation
└── [other specialized packages]
```

## Package Structure

Each package follows this structure:
```
package-name/
├── src/                    ← TypeScript source
│   ├── index.ts           ← Main entry point
│   ├── types/             ← Type definitions
│   └── utils/             ← Utility functions
├── dist/                  ← Compiled output
├── test/                  ← Test suites
├── tasks/                 ← Hardhat tasks (if applicable)
├── type-extensions/       ← TypeScript extensions
├── package.json          ← Package configuration
├── tsconfig.json         ← TypeScript configuration
├── tsup.config.ts        ← Build configuration
├── jest.config.js        ← Jest configuration
└── README.md             ← Documentation
```

## Naming & API

* Name pattern: `[domain-]<feature>[-modifier]` (e.g. `devtools-evm-hardhat`)
* Single entry-point export; annotate public API with JSDoc
* `package.json` must include:
  * `"types": "dist/index.d.ts"`
  * `"main": "dist/index.js"`
  * `"module": "dist/index.mjs"`
  * `"sideEffects": false`
  * `"exports"` field for subpath exports
  * `"files"` field for published files

## Build & Test

* **Setup**: `pnpm install --filter <pkg-name>...`
* **Build**: `pnpm build --filter <pkg-name>` (Turbo runs `tsc`)
* **Test**:
  * Local: `pnpm test:local --filter <pkg-name>`
  * CI:    `pnpm test:ci --filter <pkg-name>`
* **Lint**: `pnpm lint --filter <pkg-name>`
* **Type Check**: `pnpm typecheck --filter <pkg-name>`

## Hardhat Extensions

For any package ending `-hardhat`:

* `hardhat.config.ts` must include:
  ```ts
  export const eid = { /* network → endpoint mapping */ };
  ```
* Provide:
  * `createContractFactory` (disconnected)
  * `createConnectedContractFactory` (with provider)
* Agent runs `npx hardhat compile` in code phase
* Include:
  * Network configuration
  * Compiler settings
  * Plugin configurations
  * Task definitions

## Versioning

After changes:

```bash
pnpm changeset --filter <pkg-name>
```

## Development Guidelines

1. **Code Organization**
   * Use barrel exports (index.ts)
   * Group related functionality
   * Follow consistent naming
   * Document public APIs

2. **TypeScript Best Practices**
   * Use strict mode
   * Define clear interfaces
   * Avoid `any` types
   * Use proper type guards

3. **Testing Requirements**
   * Unit test coverage > 80%
   * Integration tests for key features
   * Mock external dependencies
   * Test error cases

4. **Documentation**
   * JSDoc for public APIs
   * README with examples
   * Type definitions
   * Usage guidelines

5. **Performance**
   * Optimize bundle size
   * Use proper tree-shaking
   * Minimize dependencies
   * Profile critical paths

6. **Security**
   * Audit dependencies
   * Sanitize inputs
   * Handle errors gracefully
   * Follow security best practices