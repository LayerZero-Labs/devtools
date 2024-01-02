<p align="center">
  <a href="https://layerzero.network">
    <img alt="LayerZero" style="max-width: 500px" src="https://d3a2dpnnrypp5h.cloudfront.net/bridge-app/lz.png"/>
  </a>
</p>

<h1 align="center">@layerzerolabs/utils-evm</h1>

<!-- The badges section -->
<p align="center">
  <!-- Shields.io NPM published package version -->
  <a href="https://www.npmjs.com/package/@layerzerolabs/utils-evm"><img alt="NPM Version" src="https://img.shields.io/npm/v/@layerzerolabs/utils-evm"/></a>
  <!-- Shields.io NPM downloads -->
  <a href="https://www.npmjs.com/package/@layerzerolabs/utils-evm"><img alt="Downloads" src="https://img.shields.io/npm/dm/@layerzerolabs/utils-evm"/></a>
  <!-- Shields.io license badge -->
  <a href="https://www.npmjs.com/package/@layerzerolabs/utils-evm"><img alt="NPM License" src="https://img.shields.io/npm/l/@layerzerolabs/utils-evm"/></a>
</p>

Utilities for working with LayerZero EVM contracts.

## Installation

```bash
yarn add @layerzerolabs/utils-evm

pnpm add @layerzerolabs/utils-evm

npm install @layerzerolabs/utils-evm
```

### Address utilities

#### ignoreZero(address: Address | null | undefined)

Turns EVM zero addresses to `undefined`

```typescript
import { ignoreZero } from "@layerzerolabs/utils-evm";

ignoreZero("0xEe6cF2E1Bc7645F8439d241ce37820305F2BB3F8"); // Returns '0xEe6cF2E1Bc7645F8439d241ce37820305F2BB3F8'
ignoreZero("0x0000000000000000000000000000000000000000"); // Returns undefined
ignoreZero(undefined); // Returns undefined
ignoreZero(null); // Returns undefined
```

#### makeZeroAddress(address)

Turns `null` and `undefined` into EVM zero address

```typescript
import { makeZeroAddress } from "@layerzerolabs/utils-evm";

makeZeroAddress("0xEe6cF2E1Bc7645F8439d241ce37820305F2BB3F8"); // Returns '0xEe6cF2E1Bc7645F8439d241ce37820305F2BB3F8'
makeZeroAddress("0x0000000000000000000000000000000000000000"); // Returns '0x0000000000000000000000000000000000000000'
makeZeroAddress(undefined); // Returns '0x0000000000000000000000000000000000000000'
makeZeroAddress(null); // Returns '0x0000000000000000000000000000000000000000'
```
