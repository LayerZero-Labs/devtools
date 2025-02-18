<p align="center">
  <a href="https://layerzero.network">
    <img alt="LayerZero" style="max-width: 500px" src="https://d3a2dpnnrypp5h.cloudfront.net/bridge-app/lz.png"/>
  </a>
</p>

<h1 align="center">@layerzerolabs/ua-devtools-evm-hardhat</h1>

<!-- The badges section -->
<p align="center">
  <!-- Shields.io NPM published package version -->
  <a href="https://www.npmjs.com/package/@layerzerolabs/ua-devtools-evm-hardhat"><img alt="NPM Version" src="https://img.shields.io/npm/v/@layerzerolabs/ua-devtools-evm-hardhat"/></a>
  <!-- Shields.io NPM downloads -->
  <a href="https://www.npmjs.com/package/@layerzerolabs/ua-devtools-evm-hardhat"><img alt="Downloads" src="https://img.shields.io/npm/dm/@layerzerolabs/ua-devtools-evm-hardhat"/></a>
  <!-- Shields.io license badge -->
  <a href="https://www.npmjs.com/package/@layerzerolabs/ua-devtools-evm-hardhat"><img alt="NPM License" src="https://img.shields.io/npm/l/@layerzerolabs/ua-devtools-evm-hardhat"/></a>
</p>

## Installation

```sh
$ npm install @layerzerolabs/ua-devtools-evm-hardhat
```

The plugin depends on [`@nomiclabs/hardhat-ethers`](https://www.npmjs.com/package/@nomiclabs/hardhat-ethers), so you need to import both plugins in your `hardhat.config.js`:

```js
require("@nomiclabs/hardhat-ethers");
require("@layerzerolabs/ua-devtools-evm-hardhat");
```

Or if you are using TypeScript, in your `hardhat.config.ts`:

```ts
import "@nomiclabs/hardhat-ethers";
import "@layerzerolabs/ua-devtools-evm-hardhat";
```

Make sure that network names in your `hardhat.config.js` match the following [naming convention](https://github.com/LayerZero-Labs/sdk/blob/main/packages/lz-sdk/src/enums/ChainKey.ts).

## Tasks

The package adds the following tasks:

- `getDefaultConfig` returns the default configuration for the specified chains.

  Usage:

  ```sh
  pnpm hardhat getDefaultConfig --networks ethereum,bsc,polygon,avalanche
  ```

- `getConfig` returns the configuration of the specified contract.

  Parameters:

  - `address` - the contract address. An optional parameter. Either contract name or contract address must be specified.
  - `name` - the contract name. An optional parameter. It must be specified only if the contract was deployed using [`hardhat-deploy`](https://www.npmjs.com/package/hardhat-deploy) and the deployments information is located in the deployments folder.
  - `network` - the network the contract is deployed to.
  - `remote-networks` - a comma separated list of remote networks the contract is configured with.

  Usage:

  ```sh
  pnpm hardhat getConfig --network ethereum --remote-networks bsc,polygon,avalanche --name OFT
  ```

- `setConfig` sets the configuration of the specified contract.

  Parameters:

  - `config-path` - the relative path to a file containing the configuration.
  - `address` - the address of the deployed contracts. An optional parameter. It should be provided if the contract address is the same on all chains. For contracts with different addresses, specify the address for each chain in the config.
  - `name` - the name of the deployed contracts. An optional parameter. It should be provided only if the same contract deployed on all chains using [`hardhat-deploy`](https://www.npmjs.com/package/hardhat-deploy) and the deployment information is located in the deployments folder. For contracts with different names, specify the name for each chain in the config.
  - `gnosis-config-path` - the relative path to a file containing the gnosis configuration. An optional parameter. If specified, the transactions will be sent to Gnosis.

  Usage:

  ```sh
  pnpm hardhat setConfig --networks ethereum,bsc,avalanche --name OFT --config-path "./appConfig.json" --gnosis-config-path "./gnosisConfig.json"
  ```

   <br/>

  Below is an example of the application configuration

  ```json
  {
    "ethereum": {
      "address": "",
      "name": "ProxyOFT",
      "sendVersion": 2,
      "receiveVersion": 2,
      "remoteConfigs": [
        {
          "remoteChain": "bsc",
          "inboundProofLibraryVersion": 1,
          "inboundBlockConfirmations": 20,
          "relayer": "0x902F09715B6303d4173037652FA7377e5b98089E",
          "outboundProofType": 1,
          "outboundBlockConfirmations": 15,
          "oracle": "0x5a54fe5234E811466D5366846283323c954310B2"
        },
        {
          "remoteChain": "avalanche",
          "inboundProofLibraryVersion": 1,
          "inboundBlockConfirmations": 12,
          "relayer": "0x902F09715B6303d4173037652FA7377e5b98089E",
          "outboundProofType": 1,
          "outboundBlockConfirmations": 15,
          "oracle": "0x5a54fe5234E811466D5366846283323c954310B2"
        }
      ]
    },
    "bsc": {
      "address": "0x0702c7B1b18E5EBf022e17182b52F0AC262A8062",
      "name": "",
      "sendVersion": 2,
      "receiveVersion": 2,
      "remoteConfigs": [
        {
          "remoteChain": "ethereum",
          "inboundProofLibraryVersion": 1,
          "inboundBlockConfirmations": 15,
          "relayer": "0xA27A2cA24DD28Ce14Fb5f5844b59851F03DCf182",
          "outboundProofType": 1,
          "outboundBlockConfirmations": 20,
          "oracle": "0x5a54fe5234E811466D5366846283323c954310B2"
        }
      ]
    }
  }
  ```

  The top level elements represent chains the contracts are deployed to. The configuration section for each chain has the following fields:

  - `address` - the contract address. An optional parameter. It should be provided if no address was specified in the task parameters.
  - `name` - the contract name. An optional parameter. It should be provided only if the contract was deployed using [`hardhat-deploy`](https://www.npmjs.com/package/hardhat-deploy) and the deployment information is located in the deployments folder.
  - `sendVersion` - the version of a messaging library contract used to send messages. If it isn't specified, the default version will be used.
  - `receiveVersion` - the version of a messaging library contract used to receive messages. If it isn't specified, the default version will be used.
  - `remoteConfigs` - an array of configuration settings for remote chains.

   <br>

  The configuration section for each chain has the following fields:

  - `remoteChain` - the remote chain name.
  - `inboundProofLibraryVersion` - the version of proof library for inbound messages.
  - `inboundBlockConfirmations` - the number of block confirmations for inbound messages.
  - `relayer` - the address of Relayer contract.
  - `outboundProofType` - proof type used for outbound messages.
  - `outboundBlockConfirmations` - the number of block confirmations for outbound messages.
  - `oracle` - the address of the Oracle contract.

   <br>

- `checkWireAllConfig` returns the current wired up configurations of the specified contract.

  Parameters:

  - `e` - the environment ie: mainnet, testnet or sandbox.
  - `u` - flag to show use custom adapter params.
  - `t` - flag to show trusted remotes.
  - `m` - flag to show min destination gas.
  - `chains` - comma separated list of networks.
  - `addresses` - comma separated list of contract addresses in same order as chains. An optional parameter, if no deployment folder is available and want to use contract addresses.
  - `contract` - name of contract. An optional parameter. If all contract names are the same.
  - `proxyContract` - name of proxy contract. An optional parameter. If one contract name is different.
  - `proxyChain` - name of proxy chain. An optional parameter. If one chain has different contract name .

  Usage:

  ```sh
  pnpm hardhat checkWireAllConfig --e testnet --u --t --m --chains ethereum-testnet,arbitrum-testnet --contract ExampleOFTV2

  pnpm hardhat checkWireAllConfig --e testnet --u --t --m --chains ethereum-testnet,arbitrum-testnet,optimism-testnet --contract OFTV2 --proxy-contract ProxyOFTV2 --proxy-chain optimism-testnet

  pnpm hardhat checkWireAllConfig --e testnet --u --t --m --chains ethereum-testnet,arbitrum-testnet,optimism-testnet --addresses "0xD90E022dE858DfDFC3C0f66b0D9ACD12CA6eA3Ec,0x137d4e9C2431A3DCBa6e615E9438F2c558353a17,0x27631753FC88e7b45a46679B9Cd2e06378cB43dC"
  ```

    <br>

- `wireAll` sets the wire all configuration of the specified contract.

  Parameters:

  - `e` - the environment ie: mainnet, testnet or sandbox.
  - `noPrompt` - no prompt. An optional parameter defaults to false.
  - `configPath` - config path. An optional parameter. Default: ./constants/wireUpConfig.json.
  - `n` - send to gnosis. An optional parameter defaults to false.
  - `gnosisConfigPath` - gnosis config path. An optional parameter. Default: ./constants/gnosisConfig.json.

  Usage:

  ```sh
  pnpm hardhat --network ethereum-testnet wireAll --e testnet
  ```

  Below is an example of the wire all configuration

  ```json
  {
    "proxyContractConfig": {
      "chain": "avalanche",
      "name": "ProxyOFT"
    },
    "contractConfig": {
      "name": "OFT"
    },
    "chainConfig": {
      "avalanche": {
        "defaultFeeBp": 2,
        "useCustomAdapterParams": true,
        "remoteNetworkConfig": {
          "ethereum": {
            "feeBpConfig": {
              "feeBp": 5,
              "enabled": true
            },
            "minDstGasConfig": {
              "packetType_0": 100000,
              "packetType_1": 200000
            }
          },
          "polygon": {
            "minDstGasConfig": {
              "packetType_0": 100000,
              "packetType_1": 160000
            }
          }
        }
      }
    }
  }
  ```

  The `proxyContractConfig` is an optional setting, that defines the proxy chain and proxy contract name.

  - `chain`: An optional string, defines the proxy chain.
  - `name`: An optional string, defines the proxy contract name.
  - `address`: A optional string, defines the contract address. Used when deployments folder are not available. Uses standard LzApp/Nonblocking/OFT/ONFT abi calls such as:

    - `function setFeeBp(uint16, bool, uint16)`
    - `function setDefaultFeeBp(uint16)`
    - `function setMinDstGas(uint16, uint16, uint)`
    - `function setUseCustomAdapterParams(bool)`
    - `function setTrustedRemote(uint16, bytes)`

  - The `contractConfig` is a conditionally required setting, that defines the contract name.
    - `function setFeeBp(uint16, bool, uint16)`
  - The `chainConfig`: is required and defines the chain settings (default fees, useCustomAdapterParams) and the remote chain configs (minDstGas config based of packetType, and custom feeBP per chain)

    - `name`: A conditionally required string, defines the contract name. Used when contract names differ per chain.
    - `address`: A conditionally required string, defines the contract address. Used when deployments folder are not available. Uses standard LzApp/Nonblocking/OFT/ONFT abi calls.
    - `defaultFeeBp`: An optional number, defines the default fee bp for the chain. (Available in [OFTV2 w/ fee](https://github.com/LayerZero-Labs/solidity-examples/blob/ca7d4f1d482df5e17f8aaf1b34d0e4432020bc4e/contracts/token/oft/v2/fee/Fee.sol#L27).)
    - `useCustomAdapterParams`: An optional bool that defaults to false. Uses default 200k destination gas on all cross chain messages. When false adapter parameters must be empty. When useCustomAdapterParams is true the minDstGasLookup must be set for each packet type and each chain. This requires whoever calls the send function to provide the adapter params with a destination gas >= amount set for that packet type and that destination chain.
    - `remoteNetworkConfig` is a conditionally required setting, that defines the contract name. - `minDstGasConfig`: is an optional object that defines the minDstGas required based off packetType. So for example when the UA on Avalanche sends [packet type 0](https://github.com/LayerZero-Labs/solidity-examples/blob/9134640fe5b618a047f365555e760c8736ebc162/contracts/token/oft/v2/OFTCoreV2.sol#L17) to Ethereum the minDstGas will be 100000. When the UA on Avalanche sends [packet type 1](https://github.com/LayerZero-Labs/solidity-examples/blob/9134640fe5b618a047f365555e760c8736ebc162/contracts/token/oft/v2/OFTCoreV2.sol#L18) to Polygon the minDstGas will be 160000. - The `feeBpConfig` is an optional setting that defines custom feeBP per chain. (Note: setting custom fee per chain with enabled = TRUE, will triumph over defaultFeeBp.) - `feeBp`: is an optional number, defines custom feeBP per chain. - `enabled`: is an optional bool, defines if custom feeBP per chain is enabled

          <br>

      More info and examples can be found here in the [Wire Up Configuration](https://layerzero.gitbook.io/docs/evm-guides/layerzero-tooling/wire-up-configuration) documentation.

     <br>

    Below is an example of the Gnosis configuration

    ```json
    {
      "ethereum": {
        "safeAddress": "0xa36B7e7894aCfaa6c35A8A0EC630B71A6B8A6D22",
        "url": "https://safe-transaction.mainnet.gnosis.io/"
      },
      "bsc": {
        "safeAddress": "0x4755D44c1C196dC524848200B0556A09084D1dFD",
        "url": "https://safe-transaction.bsc.gnosis.io/"
      },
      "avalanche": {
        "safeAddress": "0x4FF2C33FD9042a76eaC920C037383E51659417Ee",
        "url": "https://safe-transaction.avalanche.gnosis.io/"
      }
    }
    ```

    For each chain you need to specify your Gnosis safe address and Gnosis Safe API url. You can find the list of supported chains and API urls in [Gnosis Safe documentation](https://docs.safe.global/learn/safe-core/safe-core-api/available-services).
