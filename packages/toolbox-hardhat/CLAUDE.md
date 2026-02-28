# CLAUDE.md - @layerzerolabs/toolbox-hardhat

## Package Purpose

The **main entry point** for Hardhat-based LayerZero development. This package re-exports types and utilities from multiple underlying packages, providing a single import for most use cases.

## Key Exports

```typescript
import {
    // Types
    OmniPointHardhat,
    OAppEnforcedOption,

    // Endpoint IDs (re-exported from lz-definitions)
    EndpointId,

    // Option builders
    ExecutorOptionType,

    // Most commonly used utilities
} from '@layerzerolabs/toolbox-hardhat'
```

## When to Use

- **Always start here** for Hardhat projects
- Import `@layerzerolabs/toolbox-hardhat` in your `hardhat.config.ts`
- Use in `layerzero.config.ts` for type definitions

## What This Package Provides

| Feature | Source Package |
|---------|----------------|
| `OmniPointHardhat` type | `devtools-evm-hardhat` |
| Hardhat tasks (`lz:*`) | `ua-devtools-evm-hardhat`, `devtools-evm-hardhat` |
| Contract factories | `devtools-evm-hardhat` |
| `EndpointId` enum | `lz-definitions` |
| Option builders | `lz-v2-utilities` |

## Common Usage

### In hardhat.config.ts
```typescript
import '@layerzerolabs/toolbox-hardhat'
```

This auto-registers all LayerZero Hardhat tasks.

### In layerzero.config.ts
```typescript
import type { OmniPointHardhat } from '@layerzerolabs/toolbox-hardhat'

const contract: OmniPointHardhat = {
    eid: EndpointId.BASESEP_V2_TESTNET,
    contractName: 'MyOFT',
}
```

## Tasks Registered

When you import this package, these Hardhat tasks become available:

| Task | Purpose |
|------|---------|
| `lz:deploy` | Deploy contracts to all configured networks |
| `lz:oapp:wire` | Configure pathways (setPeer, setConfig) |
| `lz:oapp:config:get` | Display current configuration |
| `lz:oapp:config:get:default` | Show LayerZero default config |
| `lz:oapp:peers:get` | Show peer relationships |

## Dependencies

This package depends on and re-exports from:
- `@layerzerolabs/devtools-evm-hardhat`
- `@layerzerolabs/ua-devtools-evm-hardhat`
- `@layerzerolabs/protocol-devtools-evm`
- `@layerzerolabs/lz-definitions`

## Testing

```bash
pnpm test:local --filter @layerzerolabs/toolbox-hardhat
```
