<p align="center">
  <a href="https://layerzero.network">
    <img alt="LayerZero" style="max-width: 500px" src="https://d3a2dpnnrypp5h.cloudfront.net/bridge-app/lz.png"/>
  </a>
</p>

<h1 align="center">@layerzerolabs/utils-evm-hardhat</h1>

<!-- The badges section -->
<p align="center">
  <!-- Shields.io NPM published package version -->
  <a href="https://www.npmjs.com/package/@layerzerolabs/utils-evm-hardhat"><img alt="NPM Version" src="https://img.shields.io/npm/v/@layerzerolabs/utils-evm-hardhat"/></a>
  <!-- Shields.io NPM downloads -->
  <a href="https://www.npmjs.com/package/@layerzerolabs/utils-evm-hardhat"><img alt="Downloads" src="https://img.shields.io/npm/dm/@layerzerolabs/utils-evm-hardhat"/></a>
  <!-- Shields.io license badge -->
  <a href="https://www.npmjs.com/package/@layerzerolabs/utils-evm-hardhat"><img alt="NPM License" src="https://img.shields.io/npm/l/@layerzerolabs/utils-evm-hardhat"/></a>
</p>

## Installation

```bash
yarn add @layerzerolabs/utils-evm-hardhat

pnpm add @layerzerolabs/utils-evm-hardhat

npm install @layerzerolabs/utils-evm-hardhat
```

## API Documentation

### Omnigraph types

#### OmniContract

Interface that represents an ethers.js contract connected to a particular endpoint

```typescript
import { EndpointId } from "@layerzerolabs/lz-definitions";
import { OmniContract } from "@layerzerolabs/utils-evm";

const omniContract: OmniContract = {
  eid: EndpointId.ETHEREUM_MAINNET,
  contract: new Contract(address, abi),
};
```

#### OmniContractFactory

Type that represents a function that can return an `OmniContract` based on an `OmniPoint`

```typescript
import { EndpointId } from "@layerzerolabs/lz-definitions";
import { OmniPoint } from "@layerzerolabs/utils";
import { OmniContractFactory } from "@layerzerolabs/utils-evm";

declare const omniContractFactory: OmniContractFactory;

const omniPoint: OmniPoint = {
  eid: EndpointId.ETHEREUM_MAINNET,
  address: "0xEe6cF2E1Bc7645F8439d241ce37820305F2BB3F8",
};

const omniContract = await omniContractFactory(omniPoint);
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

#### makeZero(address)

Turns `null` and `undefined` into EVM zero address

```typescript
import { makeZero } from "@layerzerolabs/utils-evm";

makeZero("0xEe6cF2E1Bc7645F8439d241ce37820305F2BB3F8"); // Returns '0xEe6cF2E1Bc7645F8439d241ce37820305F2BB3F8'
makeZero("0x0000000000000000000000000000000000000000"); // Returns '0x0000000000000000000000000000000000000000'
makeZero(undefined); // Returns '0x0000000000000000000000000000000000000000'
makeZero(null); // Returns '0x0000000000000000000000000000000000000000'
```
