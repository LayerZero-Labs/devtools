<p align="center">
  <a href="https://layerzero.network">
    <img alt="LayerZero" style="width: 400px" src="https://docs.layerzero.network/img/LayerZero_Logo_Black.svg"/>
  </a>
</p>

<p align="center">
 <a href="https://docs.layerzero.network/" style="color: #a77dff">LayerZero Docs</a>
</p>

<h1 align="center">EVM-to-EVM Omnichain Fungible Token (OFT) Example</h1>

<p align="center">Template project for a cross-chain token (<a href="https://docs.layerzero.network/v2/concepts/applications/oft-standard">OFT</a>) powered by the LayerZero protocol. This example's config involves EVM chains, but the same OFT can be extended to involve other VM chains such as Solana, Aptos and Hyperliquid.</p>

## Prerequisite Knowledge

- [What is an OFT (Omnichain Fungible Token) ?](https://docs.layerzero.network/v2/concepts/applications/oft-standard)
- [What is an OApp (Omnichain Application) ?](https://docs.layerzero.network/v2/concepts/applications/oapp-standard)

## Requirements

- `Node.js` - ` >=18.16.0`
- `pnpm` (recommended) - or another package manager of your choice (npm, yarn)
- `forge` (optional) - `>=0.2.0` for testing, and if not using Hardhat for compilation

## Scaffold this example

Create your local copy of this example:

```bash
pnpm dlx create-lz-oapp@latest --example oft
```

Specify the directory, select `OFT` and proceed with the installation.

Note that `create-lz-oapp` will also automatically run the dependencies install step for you.

## Helper Tasks

Throughout this walkthrough, helper tasks will be used. For the full list of available helper tasks, refer to the [LayerZero Hardhat Helper Tasks section](#layerzero-hardhat-helper-tasks). All commands can be run at the project root.

## Setup

- Copy `.env.example` into a new `.env`
- Set up your deployer address/account via the `.env`

  - You can specify either `MNEMONIC` or `PRIVATE_KEY`:

    ```
    MNEMONIC="test test test test test test test test test test test junk"
    or...
    PRIVATE_KEY="0xabc...def"
    ```

- Fund this deployer address/account with the native tokens of the chains you want to deploy to. This example by default will deploy to the following chains' testnets: **Optimism** and **Arbitrum**.

## Build

#### Compiling your contracts

<!-- TODO: consider moving this section to Appendix, since for Hardhat, the deploy task wil auto-run compile -->

This project supports both `hardhat` and `forge` compilation. By default, the `compile` command will execute both:

```bash
pnpm compile
```

If you prefer one over the other, you can use the tooling-specific commands:

```bash
pnpm compile:forge
pnpm compile:hardhat
```

## Deploy

To deploy your contracts to your desired blockchains, run the following command:

```bash
pnpm hardhat lz:deploy --tags MyOFTMock
```

> :information_source: MyOFTMock will be used as it provides a public mint function which we require for testing

Select all the chains you want to deploy the OFT to.

## Enable Messaging

The OFT standard builds on top of the OApp standard, which enables generic message-passing between chains. After deploying the OFT on the respective chains, you enable messaging by running the [wiring](https://docs.layerzero.network/v2/concepts/glossary#wire--wiring) task.

> :information_source: This example uses the [Simple Config Generator](https://docs.layerzero.network/v2/developers/evm/technical-reference/simple-config), which is recommended over manual configuration.

Run the wiring task:

```bash
pnpm hardhat lz:oapp:wire --oapp-config layerzero.config.ts
```

Submit all the transactions to complete wiring. After all transactions confirm, your OApps are wired and can send messages to each other.

## Sending OFTs

With your OFTs wired, you can now send them cross chain.

First, via the mock contract, let's mint on **Optimism Sepolia**:

```
cast send <OFT_ADDRESS> "mint(address,uint256)" <RECIPIENT_ADDRESS> <AMOUNT> --private-key <PRIVATE_KEY> --rpc-url <OPTIMISM_SEPOLIA_RPC_URL>

```

Send 1 OFT from **Optimism Sepolia** to **Arbitrum Sepolia**:

```bash
npx hardhat lz:oft:send --src-eid 40232 --dst-eid 40231 --amount 1 --to <EVM_ADDRESS>
```

> :information_source: `40232` and `40106` are the Endpoint IDs of Optimism Sepolia and Arbitrum Sepolia respectively. View the list of chains and their Endpoint IDs on the [Deployed Endpoints](https://docs.layerzero.network/v2/deployments/deployed-contracts) page.

Upon a successful send, the script will provide you with the link to the message on LayerZero Scan.

Once the message is delivered, you will be able to click on the destination transaction hash to verify that the OFT was sent.

Congratulations, you have now sent an OFT cross-chain!

> If you run into any issues, refer to [Troubleshooting](#troubleshooting).

## Next Steps

Now that you've gone through a simplified walkthrough, here are what you can do next.

- If you are planning to deploy to production, go through the [Production Deployment Checklist](#production-deployment-checklist).
- Read on [DVNs / Security Stack](https://docs.layerzero.network/v2/concepts/modular-security/security-stack-dvns)
- Read on [Message Execution Options](https://docs.layerzero.network/v2/concepts/technical-reference/options-reference)

## Production Deployment Checklist

<!-- TODO: move to docs page, then just link -->

Before deploying, ensure the following:

- (required) you are not using `MyOFTMock`, which has a public `_mint` function
- (recommended) you have profiled the gas usage of `lzReceive` on your destination chains
<!-- TODO: mention https://docs.layerzero.network/v2/developers/evm/technical-reference/integration-checklist#set-security-and-executor-configurations after it has been updated to reference the CLI -->

### Profiling `lzReceive` and `lzCompose` Gas Usage

The optimal values you should specify for the `gas` parameter in the LZ Config depends on the destination chain, and requires profiling. This section walks through how to estimate the optimal `gas` value.

This guide explains how to use the `pnpm` commands to estimate gas usage for LayerZero's `lzReceive` and `lzCompose` functions. These commands wrap Foundry scripts for easier invocation and allow you to pass the required arguments dynamically.

### Available Commands

1. **`gas:lzReceive`**

   This command profiles the `lzReceive` function for estimating gas usage across multiple runs.

   ```json
   "gas:lzReceive": "forge script scripts/GasProfiler.s.sol:GasProfilerScript --via-ir --sig 'run_lzReceive(string,address,uint32,address,uint32,address,bytes,uint256,uint256)'"
   ```

2. **`gas:lzCompose`**

   This command profiles the `lzCompose` function for estimating gas usage across multiple runs.

   ```json
   "gas:lzCompose": "forge script scripts/GasProfiler.s.sol:GasProfilerScript --via-ir --sig 'run_lzCompose(string,address,uint32,address,uint32,address,address,bytes,uint256,uint256)'"
   ```

### Usage Examples

#### `lzReceive`

To estimate the gas for the `lzReceive` function:

```bash
pnpm gas:lzReceive
  <rpcUrl> \
  <endpointAddress> \
  <srcEid> \
  <sender> \
  <dstEid> \
  <receiver> \
  <message> \
  <msg.value> \
  <numOfRuns>
```

Where:

- `rpcUrl`: The RPC URL for the target blockchain (e.g., Optimism, Arbitrum, etc.).
- `endpointAddress`: The deployed LayerZero EndpointV2 contract address.
- `srcEid`: The source endpoint ID (uint32).
- `sender`: The sender's address (OApp).
- `dstEid`: The destination endpoint ID (uint32).
- `receiver`: The address intended to receive the message (OApp).
- `message`: The message payload as a `bytes` array.
- `msg.value`: The amount of Ether sent with the message (in wei).
- `numOfRuns`: The number of test runs to execute.

#### `lzCompose`

To estimate the gas for the `lzCompose` function:

```bash
pnpm gas:lzCompose
  <rpcUrl> \
  <endpointAddress> \
  <srcEid> \
  <sender> \
  <dstEid> \
  <receiver> \
  <composer> \
  <composeMsg> \
  <msg.value> \
  <numOfRuns>
```

Where:

- `rpcUrl`: The RPC URL for the target blockchain (e.g., Optimism, Arbitrum, etc.).
- `endpointAddress`: The deployed LayerZero EndpointV2 contract address.
- `srcEid`: The source endpoint ID (uint32).
- `sender`: The originating OApp address.
- `dstEid`: The destination endpoint ID (uint32).
- `receiver`: The address intended to receive the message (OApp).
- `composer`: The LayerZero Composer contract address.
- `composeMsg`: The compose message payload as a `bytes` array.
- `msgValue`: The amount of Ether sent with the message (in wei).
- `numOfRuns`: The number of test runs to execute.

### Notes

- Modify `numOfRuns` based on the level of accuracy or performance you require for gas profiling.
- Log outputs will provide metrics such as the **average**, **median**, **minimum**, and **maximum** gas usage across all successful runs.

This approach simplifies repetitive tasks and ensures consistent testing across various configurations.

<p align="center">
  Join our <a href="https://layerzero.network/community" style="color: #a77dff">community</a>! | Follow us on <a href="https://x.com/LayerZero_Labs" style="color: #a77dff">X (formerly Twitter)</a>
</p>

# Appendix

## Running Tests

Similar to the contract compilation, we support both `hardhat` and `forge` tests. By default, the `test` command will execute both:

```bash
pnpm test
```

If you prefer one over the other, you can use the tooling-specific commands:

```bash
pnpm test:forge
pnpm test:hardhat
```

## Adding other chains

<!-- TODO: host this section in docs and just link. Potentially under the Simple Config Generator section -->

If you're adding another EVM chain, first, add it to the `hardhat.config.ts`. Adding non-EVM chains do not require modifying the `hardhat.config.ts`.

<!-- TODO: mention how to add Solana -->

Then, modify `layerzero.config.ts` with the following changes:

- declare a new contract object (specifying the `eid` and `contractName`)
- decide whether to use an existing EVM enforced options variable or declare a new one
- create a new entry in the `pathways` variable
- add the new contract into the `contracts` key of the `return` of the `export default` function

After applying the desired changes, make sure you re-run the wiring task:

```bash
npx hardhat lz:oapp:wire --oapp-config layerzero.config.ts
```

## Using Multisigs

The wiring task supports the usage of Safe Multisigs.

To use a Safe multisig as the signer for these transactions, add the following to each network in your `hardhat.config.ts` and add the `--safe` flag to `lz:oapp:wire --safe`:

```typescript
// hardhat.config.ts

networks: {
  // Include configurations for other networks as needed
  fuji: {
    /* ... */
    // Network-specific settings
    safeConfig: {
      safeUrl: 'http://something', // URL of the Safe API, not the Safe itself
      safeAddress: 'address'
    }
  }
}
```

## LayerZero Hardhat Helper Tasks

LayerZero Devtools provides several helper hardhat tasks to easily deploy, verify, configure, connect, and send OFTs cross-chain.

<details>
<summary> <a href="https://docs.layerzero.network/v2/developers/evm/create-lz-oapp/deploying"><code>npx hardhat lz:deploy</code></a> </summary>

 <br>

Deploys your contract to any of the available networks in your [`hardhat.config.ts`](./hardhat.config.ts) when given a deploy tag (by default contract name) and returns a list of available networks to select for the deployment. For specifics around all deployment options, please refer to the [Deploying Contracts](https://docs.layerzero.network/v2/developers/evm/create-lz-oapp/deploying) section of the documentation. LayerZero's `lz:deploy` utilizes `hardhat-deploy`.

```typescript
'arbitrum-sepolia': {
    eid: EndpointId.ARBSEP_V2_TESTNET,
    url: process.env.RPC_URL_ARBSEP_TESTNET,
    accounts,
},
'base-sepolia': {
    eid: EndpointId.BASESEP_V2_TESTNET,
    url: process.env.RPC_URL_BASE_TESTNET,
    accounts,
},
```

More information about available CLI arguments can be found using the `--help` flag:

```bash
npx hardhat lz:deploy --help
```

</details>

<details>
<summary> <a href="https://docs.layerzero.network/v2/developers/evm/create-lz-oapp/start"><code>npx hardhat lz:oapp:config:init --oapp-config YOUR_OAPP_CONFIG --contract-name CONTRACT_NAME</code></a> </summary>

 <br>

Initializes a `layerzero.config.ts` file for all available pathways between your hardhat networks with the current LayerZero default placeholder settings. This task can be incredibly useful for correctly formatting your config file.

You can run this task by providing the `contract-name` you want to set for the config and `file-name` you want to generate:

```bash
npx hardhat lz:oapp:config:init --contract-name CONTRACT_NAME --oapp-config FILE_NAME
```

This will create a `layerzero.config.ts` in your working directory populated with your contract name and connections for every pathway possible between your hardhat networks:

```typescript
import { EndpointId } from "@layerzerolabs/lz-definitions";

const arbsepContract = {
  eid: EndpointId.ARBSEP_V2_TESTNET,
  contractName: "MyOFT",
};
const sepoliaContract = {
  eid: EndpointId.SEPOLIA_V2_TESTNET,
  contractName: "MyOFT",
};

export default {
  contracts: [{ contract: arbsepContract }, { contract: sepoliaContract }],
  connections: [
    {
      from: arbsepContract,
      to: sepoliaContract,
      config: {
        sendLibrary: "0x4f7cd4DA19ABB31b0eC98b9066B9e857B1bf9C0E",
        receiveLibraryConfig: {
          receiveLibrary: "0x75Db67CDab2824970131D5aa9CECfC9F69c69636",
          gracePeriod: 0,
        },
        sendConfig: {
          executorConfig: {
            maxMessageSize: 10000,
            executor: "0x5Df3a1cEbBD9c8BA7F8dF51Fd632A9aef8308897",
          },
          ulnConfig: {
            confirmations: 1,
            requiredDVNs: ["0x53f488E93b4f1b60E8E83aa374dBe1780A1EE8a8"],
            optionalDVNs: [],
            optionalDVNThreshold: 0,
          },
        },
        // receiveConfig: {
        //     ulnConfig: {
        //         confirmations: 2,
        //         requiredDVNs: ['0x53f488E93b4f1b60E8E83aa374dBe1780A1EE8a8'],
        //         optionalDVNs: [],
        //         optionalDVNThreshold: 0,
        //     },
        // },
      },
    },
    {
      from: sepoliaContract,
      to: arbsepContract,
      config: {
        sendLibrary: "0xcc1ae8Cf5D3904Cef3360A9532B477529b177cCE",
        receiveLibraryConfig: {
          receiveLibrary: "0xdAf00F5eE2158dD58E0d3857851c432E34A3A851",
          gracePeriod: 0,
        },
        // sendConfig: {
        //     executorConfig: { maxMessageSize: 10000, executor: '0x718B92b5CB0a5552039B593faF724D182A881eDA' },
        //     ulnConfig: {
        //         confirmations: 2,
        //         requiredDVNs: ['0x8eebf8b423B73bFCa51a1Db4B7354AA0bFCA9193'],
        //         optionalDVNs: [],
        //         optionalDVNThreshold: 0,
        //     },
        // },
        receiveConfig: {
          ulnConfig: {
            confirmations: 1,
            requiredDVNs: ["0x8eebf8b423B73bFCa51a1Db4B7354AA0bFCA9193"],
            optionalDVNs: [],
            optionalDVNThreshold: 0,
          },
        },
      },
    },
  ],
};
```

</details>

<details>
<summary> <a href="https://docs.layerzero.network/v2/developers/evm/create-lz-oapp/wiring"><code>npx hardhat lz:oapp:config:wire --oapp-config YOUR_OAPP_CONFIG</code></a> </summary>

 <br>

Calls the configuration functions between your deployed OApp contracts on every chain based on the provided `layerzero.config.ts`.

Running `lz:oapp:wire` will make the following function calls per pathway connection for a fully defined config file using your specified settings and your environment variables (Private Keys and RPCs):

- <a href="https://github.com/LayerZero-Labs/LayerZero-v2/blob/main/packages/layerzero-v2/evm/oapp/contracts/oapp/OAppCore.sol#L33-L46"><code>function setPeer(uint32 \_eid, bytes32 \_peer) public virtual onlyOwner {}</code></a>

- <a href="https://github.com/LayerZero-Labs/LayerZero-v2/blob/main/packages/layerzero-v2/evm/protocol/contracts/MessageLibManager.sol#L304-L311"><code>function setConfig(address \_oapp, address \_lib, SetConfigParam[] calldata \_params) external onlyRegistered(\_lib) {}</code></a>

- <a href="https://github.com/LayerZero-Labs/LayerZero-v2/blob/main/packages/layerzero-v2/evm/oapp/contracts/oapp/libs/OAppOptionsType3.sol#L18-L36"><code>function setEnforcedOptions(EnforcedOptionParam[] calldata \_enforcedOptions) public virtual onlyOwner {}</code></a>

- <a href="https://github.com/LayerZero-Labs/LayerZero-v2/blob/main/packages/layerzero-v2/evm/protocol/contracts/MessageLibManager.sol#L223-L238"><code>function setSendLibrary(address \_oapp, uint32 \_eid, address \_newLib) external onlyRegisteredOrDefault(\_newLib) isSendLib(\_newLib) onlySupportedEid(\_newLib, \_eid) {}</code></a>

- <a href="https://github.com/LayerZero-Labs/LayerZero-v2/blob/main/packages/layerzero-v2/evm/protocol/contracts/MessageLibManager.sol#L223-L273"><code>function setReceiveLibrary(address \_oapp, uint32 \_eid, address \_newLib, uint256 \_gracePeriod) external onlyRegisteredOrDefault(\_newLib) isReceiveLib(\_newLib) onlySupportedEid(\_newLib, \_eid) {}</code></a>

To use this task, run:

```bash
npx hardhat lz:oapp:wire --oapp-config YOUR_LAYERZERO_CONFIG_FILE
```

Whenever you make changes to the configuration, run `lz:oapp:wire` again. The task will check your current configuration, and only apply NEW changes.

</details>
<details>
<summary> <a href="https://docs.layerzero.network/v2/developers/evm/create-lz-oapp/wiring#checking-pathway-config"><code>npx hardhat lz:oapp:config:get --oapp-config YOUR_OAPP_CONFIG</code></a> </summary>

 <br>

Returns your current OApp's configuration for each chain and pathway in 3 columns:

- **Custom Configuration**: the changes that your `layerzero.config.ts` currently has set

- **Default Configuration**: the default placeholder configuration that LayerZero provides

- **Active Configuration**: the active configuration that applies to the message pathway (Defaults + Custom Values)

If you do NOT explicitly set each configuration parameter, your OApp will fallback to the placeholder parameters in the default config.

```bash
┌────────────────────┬───────────────────────────────────────────────────────────────────────────────┬───────────────────────────────────────────────────────────────────────────────┬───────────────────────────────────────────────────────────────────────────────┐
│                    │ Custom OApp Config                                                            │ Default OApp Config                                                           │ Active OApp Config                                                            │
├────────────────────┼───────────────────────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────┤
│ localNetworkName   │ arbsep                                                                        │ arbsep                                                                        │ arbsep                                                                        │
├────────────────────┼───────────────────────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────┤
│ remoteNetworkName  │ sepolia                                                                       │ sepolia                                                                       │ sepolia                                                                       │
├────────────────────┼───────────────────────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────┤
│ sendLibrary        │ 0x4f7cd4DA19ABB31b0eC98b9066B9e857B1bf9C0E                                    │ 0x4f7cd4DA19ABB31b0eC98b9066B9e857B1bf9C0E                                    │ 0x4f7cd4DA19ABB31b0eC98b9066B9e857B1bf9C0E                                    │
├────────────────────┼───────────────────────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────┤
│ receiveLibrary     │ 0x75Db67CDab2824970131D5aa9CECfC9F69c69636                                    │ 0x75Db67CDab2824970131D5aa9CECfC9F69c69636                                    │ 0x75Db67CDab2824970131D5aa9CECfC9F69c69636                                    │
├────────────────────┼───────────────────────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────┤
│ sendUlnConfig      │ ┌──────────────────────┬────────────────────────────────────────────────────┐ │ ┌──────────────────────┬────────────────────────────────────────────────────┐ │ ┌──────────────────────┬────────────────────────────────────────────────────┐ │
│                    │ │ confirmations        │ 1                                                  │ │ │ confirmations        │ 1                                                  │ │ │ confirmations        │ 1                                                  │ │
│                    │ ├──────────────────────┼────────────────────────────────────────────────────┤ │ ├──────────────────────┼────────────────────────────────────────────────────┤ │ ├──────────────────────┼────────────────────────────────────────────────────┤ │
│                    │ │ requiredDVNs         │ ┌───┬────────────────────────────────────────────┐ │ │ │ requiredDVNs         │ ┌───┬────────────────────────────────────────────┐ │ │ │ requiredDVNs         │ ┌───┬────────────────────────────────────────────┐ │ │
│                    │ │                      │ │ 0 │ 0x53f488E93b4f1b60E8E83aa374dBe1780A1EE8a8 │ │ │ │                      │ │ 0 │ 0x53f488E93b4f1b60E8E83aa374dBe1780A1EE8a8 │ │ │ │                      │ │ 0 │ 0x53f488E93b4f1b60E8E83aa374dBe1780A1EE8a8 │ │ │
│                    │ │                      │ └───┴────────────────────────────────────────────┘ │ │ │                      │ └───┴────────────────────────────────────────────┘ │ │ │                      │ └───┴────────────────────────────────────────────┘ │ │
│                    │ │                      │                                                    │ │ │                      │                                                    │ │ │                      │                                                    │ │
│                    │ ├──────────────────────┼────────────────────────────────────────────────────┤ │ ├──────────────────────┼────────────────────────────────────────────────────┤ │ ├──────────────────────┼────────────────────────────────────────────────────┤ │
│                    │ │ optionalDVNs         │                                                    │ │ │ optionalDVNs         │                                                    │ │ │ optionalDVNs         │                                                    │ │
│                    │ ├──────────────────────┼────────────────────────────────────────────────────┤ │ ├──────────────────────┼────────────────────────────────────────────────────┤ │ ├──────────────────────┼────────────────────────────────────────────────────┤ │
│                    │ │ optionalDVNThreshold │ 0                                                  │ │ │ optionalDVNThreshold │ 0                                                  │ │ │ optionalDVNThreshold │ 0                                                  │ │
│                    │ └──────────────────────┴────────────────────────────────────────────────────┘ │ └──────────────────────┴────────────────────────────────────────────────────┘ │ └──────────────────────┴────────────────────────────────────────────────────┘ │
│                    │                                                                               │                                                                               │                                                                               │
├────────────────────┼───────────────────────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────┤
│ sendExecutorConfig │ ┌────────────────┬────────────────────────────────────────────┐               │ ┌────────────────┬────────────────────────────────────────────┐               │ ┌────────────────┬────────────────────────────────────────────┐               │
│                    │ │ executor       │ 0x5Df3a1cEbBD9c8BA7F8dF51Fd632A9aef8308897 │               │ │ executor       │ 0x5Df3a1cEbBD9c8BA7F8dF51Fd632A9aef8308897 │               │ │ executor       │ 0x5Df3a1cEbBD9c8BA7F8dF51Fd632A9aef8308897 │               │
│                    │ ├────────────────┼────────────────────────────────────────────┤               │ ├────────────────┼────────────────────────────────────────────┤               │ ├────────────────┼────────────────────────────────────────────┤               │
│                    │ │ maxMessageSize │ 10000                                      │               │ │ maxMessageSize │ 10000                                      │               │ │ maxMessageSize │ 10000                                      │               │
│                    │ └────────────────┴────────────────────────────────────────────┘               │ └────────────────┴────────────────────────────────────────────┘               │ └────────────────┴────────────────────────────────────────────┘               │
│                    │                                                                               │                                                                               │                                                                               │
├────────────────────┼───────────────────────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────┤
│ receiveUlnConfig   │ ┌──────────────────────┬────────────────────────────────────────────────────┐ │ ┌──────────────────────┬────────────────────────────────────────────────────┐ │ ┌──────────────────────┬────────────────────────────────────────────────────┐ │
│                    │ │ confirmations        │ 2                                                  │ │ │ confirmations        │ 2                                                  │ │ │ confirmations        │ 2                                                  │ │
│                    │ ├──────────────────────┼────────────────────────────────────────────────────┤ │ ├──────────────────────┼────────────────────────────────────────────────────┤ │ ├──────────────────────┼────────────────────────────────────────────────────┤ │
│                    │ │ requiredDVNs         │ ┌───┬────────────────────────────────────────────┐ │ │ │ requiredDVNs         │ ┌───┬────────────────────────────────────────────┐ │ │ │ requiredDVNs         │ ┌───┬────────────────────────────────────────────┐ │ │
│                    │ │                      │ │ 0 │ 0x53f488E93b4f1b60E8E83aa374dBe1780A1EE8a8 │ │ │ │                      │ │ 0 │ 0x53f488E93b4f1b60E8E83aa374dBe1780A1EE8a8 │ │ │ │                      │ │ 0 │ 0x53f488E93b4f1b60E8E83aa374dBe1780A1EE8a8 │ │ │
│                    │ │                      │ └───┴────────────────────────────────────────────┘ │ │ │                      │ └───┴────────────────────────────────────────────┘ │ │ │                      │ └───┴────────────────────────────────────────────┘ │ │
│                    │ │                      │                                                    │ │ │                      │                                                    │ │ │                      │                                                    │ │
│                    │ ├──────────────────────┼────────────────────────────────────────────────────┤ │ ├──────────────────────┼────────────────────────────────────────────────────┤ │ ├──────────────────────┼────────────────────────────────────────────────────┤ │
│                    │ │ optionalDVNs         │                                                    │ │ │ optionalDVNs         │                                                    │ │ │ optionalDVNs         │                                                    │ │
│                    │ ├──────────────────────┼────────────────────────────────────────────────────┤ │ ├──────────────────────┼────────────────────────────────────────────────────┤ │ ├──────────────────────┼────────────────────────────────────────────────────┤ │
│                    │ │ optionalDVNThreshold │ 0                                                  │ │ │ optionalDVNThreshold │ 0                                                  │ │ │ optionalDVNThreshold │ 0                                                  │ │
│                    │ └──────────────────────┴────────────────────────────────────────────────────┘ │ └──────────────────────┴────────────────────────────────────────────────────┘ │ └──────────────────────┴────────────────────────────────────────────────────┘ │
│                    │                                                                               │                                                                               │                                                                               │
└────────────────────┴───────────────────────────────────────────────────────────────────────────────┴───────────────────────────────────────────────────────────────────────────────┴───────────────────────────────────────────────────────────────────────────────┘
```

</details>
<details>
<summary> <a href="https://docs.layerzero.network/v2/developers/evm/create-lz-oapp/wiring#checking-pathway-executor"><code>npx hardhat lz:oapp:config:get:executor --oapp-config YOUR_OAPP_CONFIG</code></a> </summary>

 <br>

Returns the LayerZero Executor config for each network in your `hardhat.config.ts`. You can use this method to see the max destination gas in wei (`nativeCap`) you can request in your [`execution options`](https://docs.layerzero.network/v2/developers/evm/gas-settings/options).

```bash
┌───────────────────┬────────────────────────────────────────────┐
│ localNetworkName  │ mantle                                     │
├───────────────────┼────────────────────────────────────────────┤
│ remoteNetworkName │ polygon                                    │
├───────────────────┼────────────────────────────────────────────┤
│ executorDstConfig │ ┌────────────────┬───────────────────────┐ │
│                   │ │ baseGas        │ 85000                 │ │
│                   │ ├────────────────┼───────────────────────┤ │
│                   │ │ multiplierBps  │ 12000                 │ │
│                   │ ├────────────────┼───────────────────────┤ │
│                   │ │ floorMarginUSD │ 5000000000000000000   │ │
│                   │ ├────────────────┼───────────────────────┤ │
│                   │ │ nativeCap      │ 681000000000000000000 │ │
│                   │ └────────────────┴───────────────────────┘ │
│                   │                                            │
└───────────────────┴────────────────────────────────────────────┘
```

</details>

### Manual Configuration

<!-- TODO: link to docs, remove from here -->

This section only applies if you would like to configure manually instead of using the Simple Config Generator.

Define the pathway you want to create from and to each contract:

```typescript
connections: [
  // ETH <--> ARB PATHWAY: START
  {
    from: ethereumContract,
    to: arbitrumContract,
  },
  {
    from: arbitrumContract,
    to: ethereumContract,
  },
  // ETH <--> ARB PATHWAY: END
];
```

Finally, define the config settings for each direction of the pathway:

```typescript
connections: [
  // ETH <--> ARB PATHWAY: START
  {
    from: ethereumContract,
    to: arbitrumContract,
    config: {
      sendLibrary: contractsConfig.ethereum.sendLib302,
      receiveLibraryConfig: {
        receiveLibrary: contractsConfig.ethereum.receiveLib302,
        gracePeriod: BigInt(0),
      },
      // Optional Receive Library Timeout for when the Old Receive Library Address will no longer be valid
      receiveLibraryTimeoutConfig: {
        lib: "0x0000000000000000000000000000000000000000",
        expiry: BigInt(0),
      },
      // Optional Send Configuration
      // @dev Controls how the `from` chain sends messages to the `to` chain.
      sendConfig: {
        executorConfig: {
          maxMessageSize: 10000,
          // The configured Executor address
          executor: contractsConfig.ethereum.executor,
        },
        ulnConfig: {
          // The number of block confirmations to wait on Ethereum before emitting the message from the source chain.
          confirmations: BigInt(15),
          // The address of the DVNs you will pay to verify a sent message on the source chain ).
          // The destination tx will wait until ALL `requiredDVNs` verify the message.
          requiredDVNs: [
            contractsConfig.ethereum.horizenDVN, // Horizen
            contractsConfig.ethereum.polyhedraDVN, // Polyhedra
            contractsConfig.ethereum.animocaBlockdaemonDVN, // Animoca-Blockdaemon (only available on ETH <-> Arbitrum One)
            contractsConfig.ethereum.lzDVN, // LayerZero Labs
          ],
          // The address of the DVNs you will pay to verify a sent message on the source chain ).
          // The destination tx will wait until the configured threshold of `optionalDVNs` verify a message.
          optionalDVNs: [],
          // The number of `optionalDVNs` that need to successfully verify the message for it to be considered Verified.
          optionalDVNThreshold: 0,
        },
      },
      // Optional Receive Configuration
      // @dev Controls how the `from` chain receives messages from the `to` chain.
      receiveConfig: {
        ulnConfig: {
          // The number of block confirmations to expect from the `to` chain.
          confirmations: BigInt(20),
          // The address of the DVNs your `receiveConfig` expects to receive verifications from on the `from` chain ).
          // The `from` chain's OApp will wait until the configured threshold of `requiredDVNs` verify the message.
          requiredDVNs: [
            contractsConfig.ethereum.lzDVN, // LayerZero Labs DVN
            contractsConfig.ethereum.animocaBlockdaemonDVN, // Blockdaemon-Animoca
            contractsConfig.ethereum.horizenDVN, // Horizen Labs
            contractsConfig.ethereum.polyhedraDVN, // Polyhedra
          ],
          // The address of the `optionalDVNs` you expect to receive verifications from on the `from` chain ).
          // The destination tx will wait until the configured threshold of `optionalDVNs` verify the message.
          optionalDVNs: [],
          // The number of `optionalDVNs` that need to successfully verify the message for it to be considered Verified.
          optionalDVNThreshold: 0,
        },
      },
      // Optional Enforced Options Configuration
      // @dev Controls how much gas to use on the `to` chain, which the user pays for on the source `from` chain.
      enforcedOptions: [
        {
          msgType: 1,
          optionType: ExecutorOptionType.LZ_RECEIVE,
          gas: 65000,
          value: 0,
        },
        {
          msgType: 2,
          optionType: ExecutorOptionType.LZ_RECEIVE,
          gas: 65000,
          value: 0,
        },
        {
          msgType: 2,
          optionType: ExecutorOptionType.COMPOSE,
          index: 0,
          gas: 50000,
          value: 0,
        },
      ],
    },
  },
  {
    from: arbitrumContract,
    to: ethereumContract,
  },
  // ETH <--> ARB PATHWAY: END
];
```

### Contract Verification

You can verify EVM chain contracts using the LayerZero helper package:

```bash
pnpm dlx @layerzerolabs/verify-contract -n <NETWORK_NAME> -u <API_URL> -k <API_KEY> --contracts <CONTRACT_NAME>
```

### Troubleshooting

Refer to [Debugging Messages](https://docs.layerzero.network/v2/developers/evm/troubleshooting/debugging-messages) or [Error Codes & Handling](https://docs.layerzero.network/v2/developers/evm/troubleshooting/error-messages).
