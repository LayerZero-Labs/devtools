# CLAUDE.md - Packages Directory

This directory contains **reusable libraries** for building and deploying LayerZero applications.

## Quick Reference

**Most users should start here:**
```typescript
import { ... } from '@layerzerolabs/toolbox-hardhat'
```

This package re-exports the most commonly used types and utilities.

## Package Hierarchy

```
                    toolbox-hardhat (main entry point)
                           │
           ┌───────────────┼───────────────┐
           │               │               │
           ▼               ▼               ▼
    ua-devtools-    devtools-evm-    protocol-devtools-
    evm-hardhat       hardhat           evm
    (OApp/OFT        (deploy,        (DVN, Executor
     tasks)          HRE utils)        config)
           │               │               │
           └───────┬───────┴───────┬───────┘
                   │               │
                   ▼               ▼
             devtools-evm       devtools
             (EVM types)      (core types)
```

## Package Categories

### User-Facing Packages

| Package | Purpose | When to Use |
|---------|---------|-------------|
| `toolbox-hardhat` | **Main entry point** for Hardhat projects | Always import from here first |
| `toolbox-foundry` | Foundry deployment tools | Foundry-based projects |
| `create-lz-oapp` | Project scaffolding CLI | Starting new projects |

### Contract Packages

| Package | Purpose | Key Exports |
|---------|---------|-------------|
| `oft-evm` | OFT token standard | `OFT.sol`, `OFTAdapter.sol` |
| `oapp-evm` | OApp messaging base | `OApp.sol`, `OAppReceiver.sol` |
| `onft-evm` | ONFT NFT standard | `ONFT721.sol` |
| `oft-evm-upgradeable` | Upgradeable OFT | `OFTUpgradeable.sol` |
| `oapp-evm-upgradeable` | Upgradeable OApp | `OAppUpgradeable.sol` |

### Task Packages (Hardhat)

| Package | Tasks Provided |
|---------|----------------|
| `ua-devtools-evm-hardhat` | `lz:oapp:wire`, `lz:oapp:config:get`, `lz:oapp:peers:get` |
| `devtools-evm-hardhat` | `lz:deploy`, `lz:healthcheck:validate-rpcs` |

### Core Type Packages

| Package | Purpose | Key Types |
|---------|---------|-----------|
| `devtools` | Core omnichain types | `OmniPoint`, `OmniGraph`, `OmniNode`, `OmniEdge` |
| `devtools-evm` | EVM-specific types | `OmniContract` |
| `devtools-evm-hardhat` | Hardhat integration | `OmniPointHardhat` |

### Non-EVM Packages

| Package | Purpose |
|---------|---------|
| `devtools-solana` | Solana integration |
| `devtools-move` | Aptos/Move integration |
| `devtools-ton` | TON integration |
| `oft-move` | Move OFT implementation |

### Utility Packages

| Package | Purpose |
|---------|---------|
| `metadata-tools` | Fetch DVN addresses, default configs |
| `io-devtools` | File I/O, prompts, logging |
| `build-lz-options` | Build LayerZero options bytes |
| `decode-lz-options` | Decode LayerZero options bytes |
| `verify-contract` | Contract verification helpers |

## Package Naming Convention

Format: `[domain-]<element>[-modifier]`

- `devtools` → Core, chain-agnostic
- `devtools-evm` → EVM-specific
- `devtools-evm-hardhat` → EVM + Hardhat framework
- `ua-devtools-evm-hardhat` → User Application domain + EVM + Hardhat
- `protocol-devtools-evm` → Protocol domain + EVM

## Key Types

### OmniPoint
A contract location in the omnichain environment:
```typescript
interface OmniPoint {
    eid: EndpointId    // Chain identifier
    address: string    // Contract address
}
```

### OmniGraph
The full configuration of an omnichain application:
```typescript
interface OmniGraph {
    contracts: OmniNode[]      // Contracts with their configs
    connections: OmniEdge[]    // Pathways between contracts
}
```

### OmniPointHardhat
Hardhat-specific OmniPoint using contract names:
```typescript
interface OmniPointHardhat {
    eid: EndpointId
    contractName: string  // Resolved via hardhat-deploy
}
```

## Development Commands

```bash
# Build a specific package
pnpm build --filter @layerzerolabs/<package-name>

# Test a specific package
pnpm test:local --filter @layerzerolabs/<package-name>

# Lint a specific package
pnpm lint:fix --filter @layerzerolabs/<package-name>
```

## Adding a New Package

1. Create directory under `packages/`
2. Add `package.json` with standard fields:
   ```json
   {
     "name": "@layerzerolabs/<package-name>",
     "main": "dist/index.js",
     "types": "dist/index.d.ts",
     "sideEffects": false
   }
   ```
3. Add `tsconfig.json` extending base config
4. Add `tsup.config.ts` for bundling
5. Create `src/index.ts` as entry point
6. Run `pnpm install` from monorepo root
7. Run `pnpm changeset` after making changes

## Common Patterns

### Importing in Examples

```typescript
// In hardhat.config.ts
import '@layerzerolabs/toolbox-hardhat'

// In layerzero.config.ts
import type { OmniPointHardhat } from '@layerzerolabs/toolbox-hardhat'
```

### Creating Contract Factories

```typescript
import { createConnectedContractFactory } from '@layerzerolabs/devtools-evm-hardhat'

const contractFactory = createConnectedContractFactory()
const contract = await contractFactory({ eid, contractName: 'MyOFT' })
```

### Getting HRE by Network

```typescript
import { getHreByNetworkName } from '@layerzerolabs/devtools-evm-hardhat'

const hre = await getHreByNetworkName('ethereum-mainnet')
```
