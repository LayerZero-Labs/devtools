<p align="center">
  <a href="https://layerzero.network">
    <img alt="LayerZero" style="max-width: 500px" src="https://d3a2dpnnrypp5h.cloudfront.net/bridge-app/lz.png"/>
  </a>
</p>

<h1 align="center">@layerzerolabs/devtools</h1>

<!-- The badges section -->
<p align="center">
  <!-- Shields.io NPM published package version -->
  <a href="https://www.npmjs.com/package/@layerzerolabs/devtools"><img alt="NPM Version" src="https://img.shields.io/npm/v/@layerzerolabs/devtools"/></a>
  <!-- Shields.io NPM downloads -->
  <a href="https://www.npmjs.com/package/@layerzerolabs/devtools"><img alt="Downloads" src="https://img.shields.io/npm/dm/@layerzerolabs/devtools"/></a>
  <!-- Shields.io license badge -->
  <a href="https://www.npmjs.com/package/@layerzerolabs/devtools"><img alt="NPM License" src="https://img.shields.io/npm/l/@layerzerolabs/devtools"/></a>
</p>

## Installation

```bash
yarn add @layerzerolabs/devtools

pnpm add @layerzerolabs/devtools

npm install @layerzerolabs/devtools
```

## API Documentation

### Omnigraph types

#### OmniPoint

Type that uniquely identifies a contract (a point) in an omnichain universe. It consists of `eid` (`EndpointId`) to which the contract is connected to and the address of the contract.

```typescript
import { EndpointId } from "@layerzerolabs/lz-definitions";
import { OmniPoint } from "@layerzerolabs/devtools";

const omniPoint: OmniPoint = {
  eid: EndpointId.ETHEREUM_MAINNET,
  address: "0xEe6cF2E1Bc7645F8439d241ce37820305F2BB3F8",
};
```

#### OmniVector

Type that uniquely identifies a connection between two `OmniPoint`s, two contracts in an omnichain universe. It consists of two `OmniPoint` instances - `from` and `to`.

```typescript
import { EndpointId } from "@layerzerolabs/lz-definitions";
import { OmniVector } from "@layerzerolabs/devtools";

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

### Common utilities

### isDeepEqual(a, b)

Compares two objects by value, returning `true` if they match, `false` otherwise.

```typescript
isDeepEqual({ a: 1 }, { a: 1 }); // true
isDeepEqual({ a: 1 }, { a: "1" }); // false
```
