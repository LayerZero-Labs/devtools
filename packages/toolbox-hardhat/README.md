<p align="center">
  <a href="https://layerzero.network">
    <img alt="LayerZero" style="max-width: 500px" src="https://d3a2dpnnrypp5h.cloudfront.net/bridge-app/lz.png"/>
  </a>
</p>

<h1 align="center">@layerzerolabs/toolbox-hardhat</h1>

<p align="center">One-stop-shop for developing LayerZero applications with <code>hardhat</code></p>

## Installation

```bash
yarn add @layerzerolabs/toolbox-hardhat
```

```bash
pnpm add @layerzerolabs/toolbox-hardhat
```

```bash
npm install @layerzerolabs/toolbox-hardhat
```

## Configuration

### 1. Add `@layerzerolabs/toolbox-hardhat` to your config

To use `@layerzerolabs/toolbox-hardhat` you will need to import it in your `hardhat` config file.

#### TypeScript (hardhat.config.ts)

```typescript
import "@layerzerolabs/toolbox-hardhat";
```

#### JavaScript (hardhat.config.js)

```javascript
require("@layerzerolabs/toolbox-hardhat");
```

### 2. Connect your networks

LayerZero deploys `EndpointV2` contracts on all supported chains. These contracts are identified by their _endpoint ID_ (`eid` for short).

In order to wire your contracts, `@layerzerolabs/toolbox-hardhat` needs to know the mapping between the networks defined in your `hardhat` config and the endpoint ID.

> Previously we required your network names to exactly match the names we use. In order to be more flexible, we decided to switch this more explicit, albeit more verbose configuration.

Head to your `hardhat` config to set the `eid` ↔︎ `network` mapping.

#### TypeScript (hardhat.config.ts)

```typescript
import { HardhatUserConfig } from "hardhat/types";
import { EndpointId } from "@layerzerolabs/lz-definitions";

const config: HardhatUserConfig = {
  // ...
  networks: {
    fuji: {
      eid: EndpointId.AVALANCHE_V2_TESTNET,
      url: "https://api.avax-test.network/ext/bc/C/rpc",
      // ...
    },
    mainnet: {
      eid: EndpointId.ETHEREUM_V2_MAINNET,
      url: "https://eth.llamarpc.com",
    },
  },
};

export default config;
```

#### JavaScript (hardhat.config.js)

```javascript
const { EndpointId } = require("@layerzerolabs/lz-definitions");

const config = {
  // ...
  networks: {
    fuji: {
      eid: EndpointId.AVALANCHE_V2_TESTNET,
      url: "https://api.avax-test.network/ext/bc/C/rpc",
      // ...
    },
    mainnet: {
      eid: EndpointId.ETHEREUM_V2_MAINNET,
      url: "https://eth.llamarpc.com",
    },
  },
};

module.exports = config;
```

## Usage

### Tasks

This package comes with several `hardhat` tasks to speed up your workflow. In order to prevent name collisions, these have been prefixed with `lz:`:

- [`lz:oapp:wire`](#tasks-lz-oapp-wire)

#### `lz:oapp:wire` <a id="tasks-lz-oapp-wire"></a>

Wires the individual `OApp` contracts together, calling `setPeer`.

```bash
npx hardhat lz:oapp:wire
```
