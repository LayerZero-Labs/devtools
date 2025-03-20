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

Without custom params:

```typescript
import { generateConnectionsConfig } from "@layerzerolabs/metadata-tools";

// [srcContract, dstContract, [requiredDVNs, [optionalDVNs, threshold]], [srcToDstConfirmations, dstToSrcConfirmations]], [enforcedOptionsSrcToDst, enforcedOptionsDstToSrc]
const connections = await generateConnectionsConfig([
  [avalancheContract, polygonContract, [['LayerZero Labs'], []], [1, 1], [EVM_ENFORCED_OPTIONS, EVM_ENFORCED_OPTIONS]],
]);
```

With custom fetchMetadata, to add the custom DVN 'SuperCustomDVN' for Solana Devnet and Fuji:

```typescript
import { generateConnectionsConfig, defaultFetchMetadata, IMetadata, IMetadataDvns } from "@layerzerolabs/metadata-tools";

// create a custom fetchMetadata implementation
const customFetchMetadata = async (): Promise<IMetadata> => {
    // get the default metadata
    const defaultMetadata = await defaultFetchMetadata() 

    // extend the Solana DVNs with custom DVN(s)
    const solanaTestnetDVNsWithCustom: IMetadataDvns = {
      ...metadata['solana-testnet']!.dvns,
      '29EKzmCscUg8mf4f5uskwMqvu2SXM8hKF1gWi1cCBoKT': {
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
        'solana-testnet': {
            ...metadata['solana-testnet']!,
            dvns: solanaTestnetDVNsWithCustom,
        },
        fuji: {
            ...metadata.fuji!,
            dvns: fujiDVNsWithCustom,
        },
    }
}

// We can now pass 'SuperCustomDVN' as a DVN value
// [srcContract, dstContract, [requiredDVNs, [optionalDVNs, threshold]], [srcToDstConfirmations, dstToSrcConfirmations]], [enforcedOptionsSrcToDst, enforcedOptionsDstToSrc]
const connections = await generateConnectionsConfig([
  [avalancheContract, polygonContract, [['SuperCustomDVN'], []], [1, 1], [EVM_ENFORCED_OPTIONS, EVM_ENFORCED_OPTIONS]],
]);
```

