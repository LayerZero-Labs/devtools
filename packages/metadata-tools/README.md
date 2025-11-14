<p align="center">
  <a href="https://layerzero.network">
    <img alt="LayerZero" style="max-width: 500px" src="https://d3a2dpnnrypp5h.cloudfront.net/bridge-app/lz.png"/>
  </a>
</p>

<h1 align="center">@layerzerolabs/metadata-tools</h1>

<!-- The badges section -->
<p align="center">
  <!-- Shields.io NPM published package version -->
  <a href="https://www.npmjs.com/package/@layerzerolabs/metadata-tools"><img alt="NPM Version" src="https://img.shields.io/npm/v/@layerzerolabs/metadata-tools"/></a>
  <!-- Shields.io NPM downloads -->
  <a href="https://www.npmjs.com/package/@layerzerolabs/metadata-tools"><img alt="Downloads" src="https://img.shields.io/npm/dm/@layerzerolabs/metadata-tools"/></a>
  <!-- Shields.io license badge -->
  <a href="https://www.npmjs.com/package/@layerzerolabs/metadata-tools"><img alt="NPM License" src="https://img.shields.io/npm/l/@layerzerolabs/metadata-tools"/></a>
</p>

## Installation

```bash
yarn add @layerzerolabs/metadata-tools

pnpm add @layerzerolabs/metadata-tools

npm install @layerzerolabs/metadata-tools
```

## Usage

### Without custom params:

```typescript
import { generateConnectionsConfig } from "@layerzerolabs/metadata-tools";

const EVM_ENFORCED_OPTIONS: OAppEnforcedOption[] = [
    {
        msgType: 1,
        optionType: ExecutorOptionType.LZ_RECEIVE,
        gas: 80000,
        value: 0,
    },
]

// [srcContract, dstContract, [requiredDVNs, [optionalDVNs, threshold]], [srcToDstConfirmations, dstToSrcConfirmations]], [enforcedOptionsSrcToDst, enforcedOptionsDstToSrc]
const pathways = [
  [avalancheContract, polygonContract, [['LayerZero Labs'], []], [1, 1], [EVM_ENFORCED_OPTIONS, EVM_ENFORCED_OPTIONS]],
]

const connections = await generateConnectionsConfig(pathways)
```

### With custom params

#### With custom fetchMetadata

To add a custom DVN with the name 'SuperCustomDVN' for Amoy Testnet (Polygon Testnet) and Fuji (Avalanche Testnet), do the following:

```typescript
import { generateConnectionsConfig, defaultFetchMetadata, IMetadata, IMetadataDvns } from "@layerzerolabs/metadata-tools";

// create a custom fetchMetadata implementation
const customFetchMetadata = async (): Promise<IMetadata> => {
    // get the default metadata
    const defaultMetadata = await defaultFetchMetadata() 

    // extend the Amoy DVNs with custom DVN(s)
    const amoyTestnetDVNsWithCustom: IMetadataDvns = {
      ...metadata['amoy-testnet']!.dvns,
      '0x9f0e79aeb198750f963b6f30b99d87c6ee5a0467': {
          version: 2,
          canonicalName: 'SuperCustomDVN',
          id: 'super-custom-dvn',
      },
    }
    // extend the Fuji DVNs with custom DVN(s)
    const fujiDVNsWithCustom: IMetadataDvns = {
        ...metadata.fuji!.dvns,
        '0x9f0e79aeb198750f963b6f30b99d87c6ee5a0467': {
            version: 2,
            canonicalName: 'SuperCustomDVN',
            id: 'super-custom-dvn',
        },
    }

    return {
        ...metadata,
        'amoy-testnet': {
            ...metadata['amoy-testnet']!,
            dvns: amoyTestnetDVNsWithCustom,
        },
        fuji: {
            ...metadata.fuji!,
            dvns: fujiDVNsWithCustom,
        },
    }
}

// declare enforced options like in the example without custom fetchMetadata

  // We can now pass 'SuperCustomDVN' as a DVN value in our pathway(s)
const pathways = [
  [avalancheContract, polygonContract, [['SuperCustomDVN'], []], [1, 1], [EVM_ENFORCED_OPTIONS, EVM_ENFORCED_OPTIONS]],
]

const connections = await generateConnectionsConfig(pathways, { fetchMetadata: customFetchMetadata })
```

In the above example, we extended the result of the default `fetchMetadata` with our own DVN entries - under the respective chains. We added a DVN with the `canonicalName` of `SuperCustomDVN` and id `super-custom-dvn`. The `canonicalName` and `id` can be arbitrary, but they must be consistent for all pathways that require that DVN. In our case, since we have a pathway between Fuji and Amoy, we extended the DVNs entry in both Fuji and Amoy.

### Specifying only Optional DVNs

Specifying only Optional DVNs and no Required DVNs is supported in Simple Config. For example this is how you can declare a config with no Required DVNs and only 2 (threshold) out of 3 Optional DVNs:

```typescript
const connections = await generateConnectionsConfig([
    [
      ethereumContract, // Chain A contract
      bscContract, // Chain B contract
      [[], [['LayerZero Labs', 'Horizen', 'P2P'], 2]], // [ requiredDVN[], [ optionalDVN[], threshold ] ]
      [15, 20], // [A to B confirmations, B to A confirmations]
      [EVM_ENFORCED_OPTIONS, EVM_ENFORCED_OPTIONS], // Chain B enforcedOptions, Chain A enforcedOptions
    ],
]);
```

Using such configuration will mean that your OApp doesn't require any DVN to always verify - instead it's enough if 2 out of 3 DVNs will verify the message.

### Using Blocked Message Library

Blocked Messaged Library is a library that can be used both on block messages on certain pathway. It might be useful for some scenarios eg. migration, or when you no longer need specific pathway to be operational.

Simple Config supports setting Blocked Message Library using three options:
```typescript
export const MSG_LIB_BLOCK_SEND_AND_RECEIVE = 'BLOCK_SEND_AND_RECEIVE'
export const MSG_LIB_BLOCK_SEND_ONLY = 'BLOCK_SEND_ONLY'
export const MSG_LIB_BLOCK_RECEIVE_ONLY = 'BLOCK_RECEIVE_ONLY'
```

Example of blocking both send and receive for pathway A to B:

```typescript
import { generateConnectionsConfig, MSG_LIB_BLOCK_SEND_AND_RECEIVE } from '@layerzerolabs/metadata-tools';

// ...

const pathways: TwoWayConfig[] = [
    [
        ethereumContract,
        bscContract,
        [['LayerZero Labs'], []],
        [[15, MSG_LIB_BLOCK_SEND_AND_RECEIVE], 20],
        [undefined, undefined],
    ],
]
```

Using above configuration will set Blocked Message Library as Send Library on pathway from Chain A to B and as Receive Library for messages coming to chain B from A. This means that both Sending Messages from A to B will be blocked as well as receiving messages on B from A will be blocked.

Blocked configuration in the above example has been set only for A to B, so it means that pathway B to A will operate normally. You can however also use remaining: `MSG_LIB_BLOCK_SEND_ONLY` and `MSG_LIB_BLOCK_RECEIVE_ONLY` which will block messages only in respective direction.

#### With custom Executor

To add a custom Executor with the name 'CustomExecutor' for your chains, you can extend the metadata similarly to DVNs:

```typescript
import { generateConnectionsConfig, defaultFetchMetadata, IMetadata, IMetadataExecutors } from "@layerzerolabs/metadata-tools";

// create a custom fetchMetadata implementation with custom executor
const customFetchMetadata = async (): Promise<IMetadata> => {
    // get the default metadata
    const defaultMetadata = await defaultFetchMetadata() 

    // extend the Amoy metadata with custom executor
    const amoyExecutors: IMetadataExecutors = {
        '0x1234567890abcdef1234567890abcdef12345678': {
            version: 2,
            canonicalName: 'CustomExecutor',
            id: 'custom-executor',
        },
    }
    
    // extend the Fuji metadata with custom executor (can be different address)
    const fujiExecutors: IMetadataExecutors = {
        '0xabcdef1234567890abcdef1234567890abcdef12': {
            version: 2,
            canonicalName: 'CustomExecutor',  // Same name, different address
            id: 'custom-executor-fuji',
        },
    }

    return {
        ...defaultMetadata,
        'amoy-testnet': {
            ...defaultMetadata['amoy-testnet']!,
            executors: amoyExecutors,
        },
        fuji: {
            ...defaultMetadata.fuji!,
            executors: fujiExecutors,
        },
    }
}

// declare enforced options like before
const EVM_ENFORCED_OPTIONS: OAppEnforcedOption[] = [
    {
        msgType: 1,
        optionType: ExecutorOptionType.LZ_RECEIVE,
        gas: 80000,
        value: 0,
    },
]

// Use custom executor in pathway configuration
const pathways = [
    [
        avalancheContract, 
        polygonContract, 
        [['LayerZero Labs'], []], // DVN configuration
        [1, 1], // confirmations
        [EVM_ENFORCED_OPTIONS, EVM_ENFORCED_OPTIONS], // enforced options
        'CustomExecutor' // Optional: custom executor name
    ],
]

const connections = await generateConnectionsConfig(pathways, { fetchMetadata: customFetchMetadata })
```

In this example:
- We extended the metadata with custom executors for each chain
- The same executor name ('CustomExecutor') can resolve to different addresses on different chains
- The executor is only used for send configurations (not receive)
- If no custom executor is specified in the pathway, the default executor from the deployment will be used
- If an executor name cannot be resolved on a chain, it will be passed through as-is
