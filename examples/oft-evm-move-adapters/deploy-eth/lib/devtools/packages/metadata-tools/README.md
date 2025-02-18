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

```typescript
import { generateConnectionsConfig } from "@layerzerolabs/metadata-tools";

// [srcContract, dstContract, [requiredDVNs, [optionalDVNs, threshold]], [srcToDstConfirmations, dstToSrcConfirmations]], [enforcedOptionsSrcToDst, enforcedOptionsDstToSrc]
const connections = await generateConnectionsConfig([
  [avalancheContract, polygonContract, [['LayerZero'], []], [1, 1], [EVM_ENFORCED_OPTIONS, EVM_ENFORCED_OPTIONS]],
]);
```
