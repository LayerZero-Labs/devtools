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

pnpm add @layerzerolabs/toolbox-hardhat

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

### 3. Configure your LayerZero OApp Config

To use the `lz:oapp:wire` task you must first fill out your `layerzero.config` file.

#### LayerZero configuration:

- `contracts`: A conditionally required array of LayerZero Contracts.

  - `contract`: A LayerZero Contract, defines the `eid` along with either the `contractName` or the `address`.
    - `eid`: A number, defines the [LayerZero Endpoint](https://docs.layerzero.network/contracts/endpoint-addresses) Identifier.
    - `contractName`: The contract name. An _optional_ parameter. It should be provided only if the contract was deployed using hardhat-deploy and the deployment information is located in the deployments folder.
    - `address`: The contract address. An _optional_ parameter. It should be provided if the contracts are not located in the deployments folder.<br><br>

- `connections`: A conditionally required array of LayerZero Connections defining the configuration between two LayerZero contracts.
  - `from`: A LayerZero Contract, defines the `from` contract. This sets the peer `from -> to`.
  - `to`: A LayerZero Contract, defines the `to` contract. This sets the peer `from -> to`.
    - _Note: Both `from` and `to` are optional; you are not required to connect all pathways. However, `from` and `to` must be defined to set `config`_.
  - `config`: An _optional_ LayerZero Config, defines a configuration between two contracts.
    - `sendLibrary`: An _optional_ string, defines the Send Library Address.
    - `receiveLibraryConfig`: An _optional_ LayerZero Receive Library Config, defines the receiveLibrary and gracePeriod.
      - `receiveLibrary`: A string, defines the Receive Library Address.
      - `gracePeriod`: A number, defines Grace Period.
    - `receiveLibraryTimeoutConfig`: An _optional_ LayerZero Receive Library Timeout Config, defines the lib and expiry.
      - `lib`: A string, defines the Receive Library Address.
      - `expiry`: A number, defines the block timestamp the Receive Library will expire.
    - `sendConfig`: An _optional_ LayerZero Send Config, defines the executorConfig and ulnConfig.
      - `executorConfig`: A LayerZero Executor Config, defines the maxMessageSize and executor.
        - `maxMessageSize`: A number, defines the maxMessageSize.
        - `executor`: A string, defines the Executor Address.
      - `ulnConfig`: An _optional_ LayerZero ULN Config Object, defines the confirmations, optionalDVNThreshold, requiredDVNs, and optionalDVNs.
        - `confirmations`: A number, defines the Block Confirmations.
        - `optionalDVNThreshold`: A number, defines the Optional DVN Threshold.
        - `requiredDVNs`: An array of strings, defines the Required DVNs.
        - `optionalDVNs`: An array of strings, defines the Optional DVNs.
    - `receiveConfig`: An _optional_ LayerZero Receive Config, defines the ulnConfig.
      - `ulnConfig`: A LayerZero ULN Config Object, defines the confirmations, optionalDVNThreshold, requiredDVNs, and optionalDVNs.
        - `confirmations`: A number, defines the Block Confirmations.
        - `optionalDVNThreshold`: A number, defines the Optional DVN Threshold.
        - `requiredDVNs`: A array of strings, defines the Required DVNs.
        - `optionalDVNs`: A array of strings, defines the Optional DVNs.
    - `enforcedOptions`: An _optional_ array of LayerZero Enforced Options, defines the msgType and optionType.
      - `msgType`: A number, defines a user defined msgType for the OApp
      - `optionType`: A number, defines type of Enforced Option.
        - `LZ_RECEIVE`: Enforced option type 1
          - `gas`: A number, defines gas for Option Type LZ_RECEIVE.
          - `value`: A number, defines value for Option Type LZ_RECEIVE.
        - `NATIVE_DROP`: Enforced option type 2
          - `amount`: A number, defines amount for Option Type NATIVE_DROP.
          - `receiver`: A string, defines the receiver address for Option Type NATIVE_DROP.
        - `COMPOSE`: Enforced option type 3
          - `index`: A number, defines the index of the composable calls for Option Type COMPOSE.
          - `gas`: A number, defines gas for the composable calls for Option Type COMPOSE.
          - `value`: A number, defines value for the composable calls for Option Type COMPOSE.
        - `ORDERED`: Enforced option type 4

#### For example:

#### TypeScript (layerzero.config.ts)

```typescript
import {
  OAppOmniGraphHardhat,
  OmniPointHardhat,
} from "@layerzerolabs/ua-devtools-evm-hardhat";
import { EndpointId } from "@layerzerolabs/lz-definitions";
import { ExecutorOptionType } from "@layerzerolabs/lz-v2-utilities";

const sepoliaContract: OmniPointHardhat = {
  eid: EndpointId.SEPOLIA_V2_TESTNET,
  contractName: "MyOApp",
};

const fujiContract: OmniPointHardhat = {
  eid: EndpointId.AVALANCHE_V2_TESTNET,
  contractName: "MyOApp",
};

const graph: OAppOmniGraphHardhat = {
  contracts: [
    {
      contract: fujiContract,
    },
    {
      contract: sepoliaContract,
    },
  ],
  connections: [
    {
      // Sets the peer `from -> to`. Optional, you do not have to connect all pathways.
      from: fujiContract,
      to: sepoliaContract,
      // Optional Configuration
      config: {
        // Optional Send Library
        sendLibrary: "0x0000000000000000000000000000000000000000",
        // Optional Receive Library Configuration
        receiveLibraryConfig: {
          receiveLibrary: "0x0000000000000000000000000000000000000000",
          gracePeriod: BigInt(0),
        },
        // Optional Receive Library Timeout Configuration
        receiveLibraryTimeoutConfig: {
          lib: "0x0000000000000000000000000000000000000000",
          expiry: BigInt(0),
        },
        // Optional Send Configuration
        sendConfig: {
          executorConfig: {
            maxMessageSize: 99,
            executor: "0x0000000000000000000000000000000000000000",
          },
          ulnConfig: {
            confirmations: BigInt(42),
            requiredDVNs: [],
            optionalDVNs: [
              "0x0000000000000000000000000000000000000000",
              "0x0000000000000000000000000000000000000000",
            ],
            optionalDVNThreshold: 2,
          },
        },
        // Optional Receive Configuration
        receiveConfig: {
          ulnConfig: {
            confirmations: BigInt(42),
            requiredDVNs: [],
            optionalDVNs: [
              "0x0000000000000000000000000000000000000000",
              "0x0000000000000000000000000000000000000000",
            ],
            optionalDVNThreshold: 2,
          },
        },
        // Optional Enforced Options Configuration
        enforcedOptions: [
          {
            msgType: 1,
            optionType: ExecutorOptionType.LZ_RECEIVE,
            gas: 200000,
            value: 1,
          },
          {
            msgType: 1,
            optionType: ExecutorOptionType.NATIVE_DROP,
            amount: 1,
            receiver: "0x0000000000000000000000000000000000000000",
          },
          {
            msgType: 2,
            optionType: ExecutorOptionType.COMPOSE,
            index: 0,
            gas: 200000,
            value: 1,
          },
          {
            msgType: 2,
            optionType: ExecutorOptionType.COMPOSE,
            index: 1,
            gas: 300000,
            value: 1,
          },
        ],
      },
    },
  ],
};
export default graph;
```

## Usage

### Tasks

This package comes with several `hardhat` tasks to speed up your workflow. In order to prevent name collisions, these have been prefixed with `lz:`:

- [`lz:oapp:wire`](#tasks-lz-oapp-wire)

#### `lz:oapp:wire` <a id="tasks-lz-oapp-wire"></a>

Wires the individual `OApp` contracts together, calling `setPeer`.

```bash
pnpm hardhat lz:oapp:wire
```
