<p align="center">
  <a href="https://layerzero.network">
    <img alt="LayerZero" style="max-width: 500px" src="https://d3a2dpnnrypp5h.cloudfront.net/bridge-app/lz.png"/>
  </a>
</p>

<h1 align="center">@layerzerolabs/utils</h1>

<!-- The badges section -->
<p align="center">
  <!-- Shields.io NPM published package version -->
  <a href="https://www.npmjs.com/package/@layerzerolabs/utils"><img alt="NPM Version" src="https://img.shields.io/npm/v/@layerzerolabs/utils"/></a>
  <!-- Shields.io NPM downloads -->
  <a href="https://www.npmjs.com/package/@layerzerolabs/utils"><img alt="Downloads" src="https://img.shields.io/npm/dm/@layerzerolabs/utils"/></a>
  <!-- Shields.io license badge -->
  <a href="https://www.npmjs.com/package/@layerzerolabs/utils"><img alt="NPM License" src="https://img.shields.io/npm/l/@layerzerolabs/utils"/></a>
</p>

## Installation

```bash
yarn add @layerzerolabs/utils

pnpm add @layerzerolabs/utils

npm install @layerzerolabs/utils
```

## API Documentation

### Omnigraph types

#### OmniPoint

Type that uniquely identifies a contract (a point) in an omnichain universe. It consists of `eid` (`EndpointId`) to which the contract is connected to and the address of the contract.

```typescript
import { EndpointId } from "@layerzerolabs/lz-definitions";
import { OmniPoint } from "@layerzerolabs/utils";

const omniPoint: OmniPoint = {
  eid: EndpointId.ETHEREUM_MAINNET,
  address: "0xEe6cF2E1Bc7645F8439d241ce37820305F2BB3F8",
};
```

#### OmniVector

Type that uniquely identifies a connection between two `OmniPoint`s, two contracts in an omnichain universe. It consists of two `OmniPoint` instances - `from` and `to`.

```typescript
import { EndpointId } from "@layerzerolabs/lz-definitions";
import { OmniVector } from "@layerzerolabs/utils";

const from: OmniPoint = {
  eid: EndpointId.ETHEREUM_MAINNET,
  address: "0xEe6cF2E1Bc7645F8439d241ce37820305F2BB3F8",
};

const to: OmniPoint = {
  eid: EndpointId.AVALANCHE_MAINNET,
  address: "0xEe6cF2E1Bc7645F8439d241ce37820305F2BB3F8",
};

const omniVector: OmniVector = { from, to };
```
