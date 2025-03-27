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