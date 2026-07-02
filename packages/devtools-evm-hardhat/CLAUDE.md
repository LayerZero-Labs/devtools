# CLAUDE.md - @layerzerolabs/devtools-evm-hardhat

## Package Purpose

Provides **Hardhat integration utilities** for EVM chains - HRE helpers, contract factories, deployment tasks, and network utilities.

## Key Exports

```typescript
import {
    // HRE helpers
    getHreByNetworkName,
    createGetHreByEid,

    // Contract factories
    createContractFactory,
    createConnectedContractFactory,

    // Types
    OmniPointHardhat,
} from '@layerzerolabs/devtools-evm-hardhat'
```

## Tasks Provided

| Task | Description |
|------|-------------|
| `lz:deploy` | Deploy contracts to all configured networks |
| `lz:healthcheck:validate-rpcs` | Validate RPC endpoints |
| `lz:healthcheck:validate-safe-configs` | Validate Safe configurations |
| `lz:export:deployments:typescript` | Export deployments as TypeScript |

## When to Use

- Getting Hardhat Runtime Environment by network name or EID
- Creating contract instances across networks
- Deploying contracts
- Validating network configurations

## Key Utilities

### Getting HRE by Network Name

```typescript
import { getHreByNetworkName } from '@layerzerolabs/devtools-evm-hardhat'

const hre = await getHreByNetworkName('ethereum-mainnet')
```

### Getting HRE by Endpoint ID

```typescript
import { createGetHreByEid } from '@layerzerolabs/devtools-evm-hardhat'

const getHreByEid = createGetHreByEid()
const hre = await getHreByEid(EndpointId.ETHEREUM_MAINNET)
```

### Creating Contract Factories

```typescript
import { createConnectedContractFactory } from '@layerzerolabs/devtools-evm-hardhat'

const factory = createConnectedContractFactory()

// By contract name (uses hardhat-deploy)
const contract = await factory({
    eid: EndpointId.ETHEREUM_MAINNET,
    contractName: 'MyOFT'
})

// By address
const contract = await factory({
    eid: EndpointId.ETHEREUM_MAINNET,
    address: '0x...'
})
```

## Hardhat Config Extension

This package extends the Hardhat network config with `eid`:

```typescript
// hardhat.config.ts
const config: HardhatUserConfig = {
    networks: {
        'ethereum-mainnet': {
            eid: EndpointId.ETHEREUM_MAINNET,  // LayerZero Endpoint ID
            url: '...',
            accounts: [...],
        },
    },
}
```

## File Structure

```
src/
├── tasks/
│   ├── deploy.ts           # lz:deploy task
│   ├── healthcheck/        # Validation tasks
│   └── simulation/         # Simulation utilities
├── runtime.ts              # HRE utilities
├── contracts.ts            # Contract factories
└── index.ts                # Main exports
```

## Dependencies

- `@layerzerolabs/devtools-evm` - EVM-specific types
- `hardhat` - Hardhat core
- `hardhat-deploy` - Deployment plugin

## Testing

```bash
pnpm test:local --filter @layerzerolabs/devtools-evm-hardhat
```
