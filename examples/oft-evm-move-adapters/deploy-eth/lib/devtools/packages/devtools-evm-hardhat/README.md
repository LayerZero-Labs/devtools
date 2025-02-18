<p align="center">
  <a href="https://layerzero.network">
    <img alt="LayerZero" style="max-width: 500px" src="https://d3a2dpnnrypp5h.cloudfront.net/bridge-app/lz.png"/>
  </a>
</p>

<h1 align="center">@layerzerolabs/devtools-evm-hardhat</h1>

<!-- The badges section -->
<p align="center">
  <!-- Shields.io NPM published package version -->
  <a href="https://www.npmjs.com/package/@layerzerolabs/devtools-evm-hardhat"><img alt="NPM Version" src="https://img.shields.io/npm/v/@layerzerolabs/devtools-evm-hardhat"/></a>
  <!-- Shields.io NPM downloads -->
  <a href="https://www.npmjs.com/package/@layerzerolabs/devtools-evm-hardhat"><img alt="Downloads" src="https://img.shields.io/npm/dm/@layerzerolabs/devtools-evm-hardhat"/></a>
  <!-- Shields.io license badge -->
  <a href="https://www.npmjs.com/package/@layerzerolabs/devtools-evm-hardhat"><img alt="NPM License" src="https://img.shields.io/npm/l/@layerzerolabs/devtools-evm-hardhat"/></a>
</p>

## Installation

```bash
yarn add @layerzerolabs/devtools-evm-hardhat

pnpm add @layerzerolabs/devtools-evm-hardhat

npm install @layerzerolabs/devtools-evm-hardhat
```

## API Documentation

### Omnigraph types

#### OmniContract

Interface that represents an ethers.js contract connected to a particular endpoint

```typescript
import { EndpointId } from "@layerzerolabs/lz-definitions";
import { OmniContract } from "@layerzerolabs/devtools-evm";

const omniContract: OmniContract = {
  eid: EndpointId.ETHEREUM_MAINNET,
  contract: new Contract(address, abi),
};
```

#### OmniContractFactory

Type that represents a function that can return an `OmniContract` based on an `OmniPoint`

```typescript
import { EndpointId } from "@layerzerolabs/lz-definitions";
import { OmniPoint } from "@layerzerolabs/devtools";
import { OmniContractFactory } from "@layerzerolabs/devtools-evm";

declare const omniContractFactory: OmniContractFactory;

const omniPoint: OmniPoint = {
  eid: EndpointId.ETHEREUM_MAINNET,
  address: "0xEe6cF2E1Bc7645F8439d241ce37820305F2BB3F8",
};

const omniContract = await omniContractFactory(omniPoint);
```
