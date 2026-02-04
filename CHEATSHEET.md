<p align="center">
  <a href="https://layerzero.network">
    <img alt="LayerZero" style="max-width: 500px" src="https://d3a2dpnnrypp5h.cloudfront.net/bridge-app/lz.png"/>
  </a>
</p>

<p align="center">
  <a href="https://layerzero.network" style="color: #a77dff">Homepage</a> | <a href="https://docs.layerzero.network/" style="color: #a77dff">Docs</a> | <a href="https://layerzero.network/developers" style="color: #a77dff">Developers</a>
</p>

<h1 align="center">Developer Cheatsheet</h1>

## Quick Commands

### Project Setup
```bash
# Create new project
npx create-lz-oapp@latest

# Install dependencies
pnpm install

# Build
pnpm compile
```

### Deployment & Wiring
```bash
# Deploy to all configured networks
npx hardhat lz:deploy

# Wire all pathways
npx hardhat lz:oapp:wire --oapp-config layerzero.config.ts

# Check configuration
npx hardhat lz:oapp:config:get --oapp-config layerzero.config.ts

# Check peers
npx hardhat lz:oapp:peers:get --oapp-config layerzero.config.ts
```

### Monorepo Development
```bash
# Build all packages
pnpm build

# Test
pnpm test:local

# Lint
pnpm lint:fix

# Create changeset
pnpm changeset
```

---

## Task Reference

### Core Tasks (devtools-evm-hardhat)

| Task | Description | Usage |
|------|-------------|-------|
| `lz:deploy` | Deploy contracts to all configured networks | `npx hardhat lz:deploy` |
| `lz:healthcheck:validate-rpcs` | Validate RPC endpoint connectivity | `npx hardhat lz:healthcheck:validate-rpcs` |
| `lz:export:deployments:typescript` | Export deployments as TypeScript | `npx hardhat lz:export:deployments:typescript` |

### OApp Tasks (ua-devtools-evm-hardhat)

| Task | Description | Usage |
|------|-------------|-------|
| `lz:oapp:wire` | Wire OApp pathways (setPeer, setConfig, etc.) | `npx hardhat lz:oapp:wire --oapp-config <path>` |
| `lz:oapp:config:get` | Get current on-chain configuration | `npx hardhat lz:oapp:config:get --oapp-config <path>` |
| `lz:oapp:config:get:default` | Get LayerZero default configuration | `npx hardhat lz:oapp:config:get:default --oapp-config <path>` |
| `lz:oapp:config:get:executor` | Get executor configuration | `npx hardhat lz:oapp:config:get:executor --oapp-config <path>` |
| `lz:oapp:config:init` | Initialize a new layerzero.config.ts | `npx hardhat lz:oapp:config:init` |
| `lz:oapp:peers:get` | Get peer relationships | `npx hardhat lz:oapp:peers:get --oapp-config <path>` |
| `lz:oapp:enforced:opts:get` | Get enforced options | `npx hardhat lz:oapp:enforced:opts:get --oapp-config <path>` |

### OApp Read Tasks

| Task | Description | Usage |
|------|-------------|-------|
| `lz:read:wire` | Wire OApp Read channels | `npx hardhat lz:read:wire --oapp-config <path>` |
| `lz:read:config:get` | Get OApp Read configuration | `npx hardhat lz:read:config:get --oapp-config <path>` |
| `lz:read:config:get:channel` | Get read channel configuration | `npx hardhat lz:read:config:get:channel --oapp-config <path>` |

### Utility Tasks

| Task | Description | Usage |
|------|-------------|-------|
| `lz:errors:decode` | Decode LayerZero error messages | `npx hardhat lz:errors:decode --error <hex>` |
| `lz:errors:list` | List all known LayerZero errors | `npx hardhat lz:errors:list` |
| `lz:ownable:transfer:ownership` | Transfer contract ownership | `npx hardhat lz:ownable:transfer:ownership` |

---

## Environment Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `MNEMONIC` | Wallet mnemonic (12 or 24 words) | `word1 word2 ... word12` |
| `PRIVATE_KEY` | Alternative to mnemonic | `0xabc123...` |
| `RPC_URL_<NETWORK>` | RPC URL for specific network | `https://rpc.example.com` |

### Example .env
```bash
# Authentication (choose one)
MNEMONIC="your twelve word mnemonic phrase goes here"
# PRIVATE_KEY=0x...

# RPC URLs
RPC_URL_ETHEREUM_MAINNET=https://eth.llamarpc.com
RPC_URL_BASE_MAINNET=https://mainnet.base.org
RPC_URL_ARB_MAINNET=https://arb1.arbitrum.io/rpc
RPC_URL_BASE_SEPOLIA=https://sepolia.base.org
RPC_URL_ARB_SEPOLIA=https://sepolia-rollup.arbitrum.io/rpc
```

---

## Glossary

| Name               | Package                               | Meaning                                                                                                                                                                                                      |
| ------------------ | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `OmniPoint`        | `@layerzerolabs/devtools`             | Location of a contract/program in omnichain environment. Consists of an `address` and `EndpointId`                                                                                                           |
| `OmniVector`       | `@layerzerolabs/devtools`             | Directional connection between two `OmniPoint`s. Consists of `from` and `to` `OmniPoint`s                                                                                                                    |
| `OmniNode`         | `@layerzerolabs/devtools`             | Combination of an `OmniPoint` and an arbitrary configuration attached to it. Consists of a `point` and `config`                                                                                              |
| `OmniEdge`         | `@layerzerolabs/devtools`             | Combination of an `OmniVector` and an arbitrary configuration attached to it. Consists of a `vector` and `config`                                                                                            |
| `OmniGraph`        | `@layerzerolabs/devtools`             | Collection of `OmniNode`s and `OmniEdge`s that together represent a state of an omnichain application. Consists of `contracts` and `connections`                                                             |
| `OmniError`        | `@layerzerolabs/devtools`             | Wraps an arbitrary `error` object to add information about where that error happened. Consists of `error` and `point`                                                                                        |
| `OmniContract`     | `@layerzerolabs/devtools-evm`         | Wraps an `ethers` `Contract` instance to add information about the endpoint. Consists of `eid` and `contract`                                                                                                |
| `OmniPointHardhat` | `@layerzerolabs/devtools-evm-hardhat` | Hardhat-specific variation of `OmniPoint`. Since in hardhat we can get a contract address by its name (from `deployments`), this version of `OmniPoint` allows us to use `contractName` instead of `address` |
| `EndpointId` (eid) | `@layerzerolabs/lz-definitions`       | Unique identifier for each chain in LayerZero. Used in hardhat.config.ts to map network names to LayerZero endpoints.                                                                                        |
| `DVN`              | N/A                                   | Decentralized Verifier Network - verifies cross-chain messages                                                                                                                                               |
| `Executor`         | N/A                                   | Delivers verified messages to destination chain                                                                                                                                                              |

## Conventions

The packages are laid out according to the [principle of least knowledge](https://en.wikipedia.org/wiki/Law_of_Demeter). Their domain of action is also reflected in their name that follows the convention `[DOMAIN-]<ELEMENT>[-MODIFIER]`, for example:

- `@layerzerolabs/devtools` package is the most generic package and it itself does not know and cannot use any implementation details of any more specific packages, nor is it specific to any domain
- `@layerzerolabs/devtools-evm` package is specific to the `EVM` implementation but it is not specific to any domain
- `@layerzerolabs/ua-devtools-evm` package is specific to the `EVM` implementation and specific to the `ua` (user application) domain
- `@layerzerolabs/ua-devtools-evm-hardhat` package is specific to the `EVM` implementation using `hardhat` and specific to the `ua` (user application) domain

The only exceptions to this rule are packages that need to follow an existing naming convention (`create-lz-oapp`) or packages for which the name needs to appeal or be intuitive/familiar to the user (`toolbox-hardhat`)

---

## Recipes

### `*-hardhat` packages

These packages augment the `hardhat` types and introduce a new property on the `network` configuration: `eid`. This property links the user-defined network names to LayerZero endpoint IDs:

```typescript
// hardhat.config.ts

const config: HardhatUserConfig = {
  networks: {
    "ethereum-mainnet": {
      eid: EndpointId.ETHEREUM_MAINNET,
      // ...
    },
  },
};
```

This property is required for a lot of the tooling to work - the link between network names and endpoints needs to be specified in order to wire OApps successfully.

#### Getting `hre` (`HardhatRuntimeEnvironment`) for a network

```typescript
// By network name (as specified in hardhat config)
import { getHreByNetworkName } from "@layerzerolabs/devtools-evm-hardhat";

const environment = await getHreByNetworkName("avalanche-testnet");

// By endpoint ID (as specified in hardhat config, using the eid property of a network)
import { createGetHreByEid } from "@layerzerolabs/devtools-evm-hardhat";

// In this case we need to instantiate an environment factory
const getEnvironment = createGetHreByEid();

const eid = EndpointId.AVALANCHE_TESTNET;
const environment = await getEnvironment(eid);
```

#### Getting a contract instance

##### Disconnected, without a provider

```typescript
// By OmniPointHardhat
import { createContractFactory } from "@layerzerolabs/devtools-evm-hardhat";

// In this case we need to instantiate a contract factory
const createContract = createContractFactory();

const eid = EndpointId.BST_MAINNET;

// We can ask for the contract by its address and eid
const contract = await createContract({ eid, address: '0x...' })

// Or its name and eid
const contract = await createContract({ eid, contractName: 'MyOApp' })
```

##### Connected, with a provider

```typescript
// By OmniPointHardhat
import { createConnectedContractFactory } from "@layerzerolabs/devtools-evm-hardhat";

// In this case we need to instantiate a contract factory
const createContract = createConnectedContractFactory();

const eid = EndpointId.BST_MAINNET;

// We can ask for the contract by its address and eid
const contract = await createContract({ eid, address: "0x..." });

// Or its name and eid
const contract = await createContract({ eid, contractName: "MyOApp" });
```

---

## Config File Templates

### hardhat.config.ts

```typescript
import 'dotenv/config'
import '@layerzerolabs/toolbox-hardhat'
import { HardhatUserConfig } from 'hardhat/types'
import { EndpointId } from '@layerzerolabs/lz-definitions'

const MNEMONIC = process.env.MNEMONIC
const PRIVATE_KEY = process.env.PRIVATE_KEY

const accounts = MNEMONIC
    ? { mnemonic: MNEMONIC }
    : PRIVATE_KEY
      ? [PRIVATE_KEY]
      : undefined

const config: HardhatUserConfig = {
    solidity: {
        version: '0.8.22',
        settings: { optimizer: { enabled: true, runs: 200 } },
    },
    networks: {
        'base-sepolia': {
            eid: EndpointId.BASESEP_V2_TESTNET,
            url: process.env.RPC_URL_BASE_SEPOLIA || 'https://sepolia.base.org',
            accounts,
        },
        'arbitrum-sepolia': {
            eid: EndpointId.ARBSEP_V2_TESTNET,
            url: process.env.RPC_URL_ARB_SEPOLIA || 'https://sepolia-rollup.arbitrum.io/rpc',
            accounts,
        },
    },
}

export default config
```

### layerzero.config.ts

```typescript
import { EndpointId } from '@layerzerolabs/lz-definitions'
import { ExecutorOptionType } from '@layerzerolabs/lz-v2-utilities'
import { generateConnectionsConfig, TwoWayConfig } from '@layerzerolabs/metadata-tools'
import type { OmniPointHardhat, OAppEnforcedOption } from '@layerzerolabs/toolbox-hardhat'

const baseContract: OmniPointHardhat = {
    eid: EndpointId.BASESEP_V2_TESTNET,
    contractName: 'MyOFT',
}

const arbitrumContract: OmniPointHardhat = {
    eid: EndpointId.ARBSEP_V2_TESTNET,
    contractName: 'MyOFT',
}

const EVM_ENFORCED_OPTIONS: OAppEnforcedOption[] = [
    {
        msgType: 1,
        optionType: ExecutorOptionType.LZ_RECEIVE,
        gas: 80000,
        value: 0,
    },
]

const pathways: TwoWayConfig[] = [
    [
        baseContract,
        arbitrumContract,
        [['LayerZero Labs'], []],
        [1, 1],
        [EVM_ENFORCED_OPTIONS, EVM_ENFORCED_OPTIONS],
    ],
]

export default async function () {
    const connections = await generateConnectionsConfig(pathways)
    return {
        contracts: [{ contract: baseContract }, { contract: arbitrumContract }],
        connections,
    }
}
```

---

## See Also

- [WORKFLOW.md](./WORKFLOW.md) - Complete deployment workflow
- [DEBUGGING.md](./DEBUGGING.md) - Troubleshooting guide
- [Official Documentation](https://docs.layerzero.network/)
