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

## Table of Contents

- [Prerequisite Knowledge](#prerequisite-knowledge)
- [Requirements](#requirements)
- [Scaffold this example](#scaffold-this-example)
- [Helper Tasks](#helper-tasks)
- [Setup](#setup)
- [Build](#build)
  - [Compiling your contracts](#compiling-your-contracts)
- [Deploy](#deploy)
- [Simple Workers (For Testnets Without Default Workers)](#simple-workers-for-testnets-without-default-workers)
  - [When to Use Simple Workers](#when-to-use-simple-workers)
  - [Deploying Simple Workers](#deploying-simple-workers)
  - [Configuring Simple Workers](#configuring-simple-workers)
  - [Using Simple Workers](#using-simple-workers)
  - [Simple Workers Architecture](#simple-workers-architecture)
  - [Important Limitations](#important-limitations)
  - [Troubleshooting Simple Workers](#troubleshooting-simple-workers)
- [Enable Messaging](#enable-messaging)
- [Sending OFTs](#sending-ofts)
- [Next Steps](#next-steps)
- [Production Deployment Checklist](#production-deployment-checklist)
  - [Profiling `lzReceive` and `lzCompose` Gas Usage](#profiling-lzreceive-and-lzcompose-gas-usage)
  - [Available Commands](#available-commands)
    - [`lzReceive`](#lzreceive)
    - [`lzCompose`](#lzcompose)
  - [Usage Examples](#usage-examples)
  - [Notes](#notes)
- [Appendix](#appendix)
  - [Running Tests](#running-tests)
  - [Adding other chains](#adding-other-chains)
  - [Using Multisigs](#using-multisigs)
  - [LayerZero Hardhat Helper Tasks](#layerzero-hardhat-helper-tasks)
    - [Manual Configuration](#manual-configuration)
    - [Contract Verification](#contract-verification)
    - [Troubleshooting](#troubleshooting)

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

- Fund this deployer address/account with the native tokens of the chains you want to deploy to. This example by default will deploy to the following chains' testnets: **Base** and **Arbitrum**.

## Build

### Compiling your contracts

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

To deploy the OFT contracts to your desired blockchains, run the following command:

```bash
pnpm hardhat lz:deploy --tags MyOFTMock
```

> :information_source: MyOFTMock will be used as it provides a public mint function which we require for testing

Select all the chains you want to deploy the OFT to.

## Simple Workers (For Testnets Without Default Workers)

> :warning: **Development Only**: Simple Workers are mock implementations for testing on testnets that lack DVNs and Executors. They should **NEVER** be used in production as they provide no security or service guarantees.

### When to Use Simple Workers

Some LayerZero testnets have default configurations, but no working DVNs (Decentralized Verifier Networks) or Executors. In these cases, you need to deploy and configure Simple Workers to enable message verification and execution.

Simple Workers consist of:

- **SimpleDVNMock**: A minimal DVN that allows manual message verification
- **SimpleExecutorMock**: A mock executor that charges zero fees and enables manual message execution

### Deploying Simple Workers

Deploy the Simple Workers on **all chains** where you need them:

```bash
# Deploy SimpleDVNMock
pnpm hardhat lz:deploy --tags SimpleDVNMock

# Deploy SimpleExecutorMock
pnpm hardhat lz:deploy --tags SimpleExecutorMock
```

### Configuring Simple Workers

> Note: If you are NOT using simple workers then use `layerzero.config.ts` and you can skip this step

You can now use custom DVNs and Executors with the standard `lz:oapp:wire` command by adding them to your metadata configuration.

1. **Get your deployed addresses** from the deployment files:

   - SimpleDVNMock: `./deployments/<network-name>/SimpleDVNMock.json`
   - SimpleExecutorMock: `./deployments/<network-name>/SimpleExecutorMock.json`

2. **Update your `layerzero.simple-worker.config.ts`** to include your deployed Simple Workers:

   - **SECTION 1**: Add your contract definitions with the correct endpoint IDs
   - **SECTION 4**: Add your Simple Worker addresses:

```typescript
// In layerzero.simple-worker.config.ts, SECTION 4: CUSTOM EXECUTOR AND DVN ADDRESSES
const customExecutorsByEid: Record<number, { address: string }> = {
  [EndpointId.BASESEP_V2_TESTNET]: { address: "0x..." }, // From deployments/base-sepolia/SimpleExecutorMock.json
  [EndpointId.ARBSEP_V2_TESTNET]: { address: "0x..." }, // From deployments/arbitrum-sepolia/SimpleExecutorMock.json
  // Add for each chain where you deployed SimpleExecutorMock
};

const customDVNsByEid: Record<number, { address: string }> = {
  [EndpointId.BASESEP_V2_TESTNET]: { address: "0x..." }, // From deployments/base-sepolia/SimpleDVNMock.json
  [EndpointId.ARBSEP_V2_TESTNET]: { address: "0x..." }, // From deployments/arbitrum-sepolia/SimpleDVNMock.json
  // Add for each chain where you deployed SimpleDVNMock
};
```

3. **Use them in your pathways** (SECTION 5) by their canonical names:

```typescript
// In layerzero.simple-worker.config.ts, SECTION 5: PATHWAY CONFIGURATION
const pathways: TwoWayConfig[] = [
  [
    sourceContract,
    destContract,
    [["SimpleDVNMock"], []], // Use the DVN by name
    [1, 1],
    [EVM_ENFORCED_OPTIONS, EVM_ENFORCED_OPTIONS],
    "SimpleExecutorMock", // Use the executor by name
  ],
];
```

4. **Wire normally** using the custom configuration:

```bash
pnpm hardhat lz:oapp:wire --oapp-config layerzero.simple-worker.config.ts
```

This command will automatically:

- Detect pathways without DVN configurations in your LayerZero config
- Configure SimpleDVNMock and SimpleExecutorMock for those pathways
- Set both send and receive configurations on the appropriate chains
- Skip pathways that already have DVN configurations

> :information_source: The command only configures pathways with empty DVN arrays, preserving any existing configurations.

### Using Simple Workers

When sending OFTs with Simple Workers, add the `--simple-workers` flag to enable the manual verification and execution flow:

```bash
pnpm hardhat lz:oft:send --src-eid 40232 --dst-eid 40231 --amount 1 --to <EVM_ADDRESS> --simple-workers
```

With the `--simple-workers` flag, the task will:

1. Send the OFT transaction as normal
2. Automatically trigger the manual verification process on the destination chain
3. Execute the message delivery through the Simple Workers

### Simple Workers Architecture

The manual verification flow involves three steps on the destination chain:

1. **Verify**: SimpleDVNMock verifies the message payload
2. **Commit**: SimpleDVNMock commits the verification to the ULN
3. **Execute**: SimpleExecutorMock executes the message delivery

Without the `--simple-workers` flag, you would need to manually call these steps using the provided tasks:

- `lz:oapp:wire:simple-workers` - Configure Simple Workers for all pathways without DVN configurations
- `lz:simple-dvn:verify` - Verify the message with SimpleDVNMock
- `lz:simple-dvn:commit` - Commit the verification to ULN
- `lz:simple-workers:commit-and-execute` - Execute the message delivery
- `lz:simple-workers:skip` - Skip a stuck message (permanent action!)

### Important Limitations

- **Zero Fees**: Simple Workers charge no fees, breaking the economic security model
- **No Real Verification**: Messages are manually verified without actual validation
- **Testnet Only**: These mocks provide no security and must never be used on mainnet
- **Manual Process**: Requires manual intervention or the `--simple-workers` flag for automation

### Troubleshooting Simple Workers

#### Ordered Message Delivery

LayerZero enforces ordered message delivery per channel (source → destination). Messages must be processed in the exact order they were sent. If a message fails or is skipped, all subsequent messages on that channel will be blocked.

**Common Error: "InvalidNonce"**

```
warn: Lazy inbound nonce is not equal to inboundNonce + 1. You will run into an InvalidNonce error.
```

This means there are pending messages that must be processed first.

#### Recovery Options

When a message is stuck, you have two options:

**Option 1: Process the Pending Message**

```bash
# Find the pending nonce from the error message, then:
npx hardhat lz:simple-dvn:verify --src-eid <SRC_EID> --dst-eid <DST_EID> --nonce <PENDING_NONCE> --src-oapp <SRC_OAPP> --to-address <RECIPIENT> --amount <AMOUNT>
npx hardhat lz:simple-workers:commit-and-execute --src-eid <SRC_EID> --dst-eid <DST_EID> --nonce <PENDING_NONCE> ...
```

**Option 2: Skip the Message** (Cannot be undone!)

```bash
# Skip a stuck message on the destination chain
npx hardhat lz:simple-workers:skip --src-eid <SRC_EID> --src-oapp <SRC_OAPP> --nonce <NONCE_TO_SKIP> --receiver <RECEIVER_OAPP>
```

> :warning: **Skipping is permanent!** Once skipped, the message cannot be recovered. The tokens/value in that message will be permanently lost.

#### RPC Failures During Processing

If your RPC connection fails during `--simple-workers` processing:

1. The outbound message may already be sent but not verified/executed
2. You'll see detailed recovery information in the error output
3. You must handle this nonce before sending new messages
4. Either wait for RPC limits to reset and complete processing, or skip the message

#### Example: Multiple Pending Messages

If nonce 6 fails because nonce 4 is pending:

1. First process or skip nonce 4
2. Then process or skip nonce 5
3. Finally, you can process nonce 6

Remember: All messages must be handled in order!

## Enable Messaging

The OFT standard builds on top of the OApp standard, which enables generic message-passing between chains. After deploying the OFT on the respective chains, you enable messaging by running the [wiring](https://docs.layerzero.network/v2/concepts/glossary#wire--wiring) task.

> :information_source: This example uses the [Simple Config Generator](https://docs.layerzero.network/v2/tools/simple-config), which is recommended over manual configuration.

This example provides two configuration files:

1. **`layerzero.config.ts`** - The standard configuration using LayerZero's default DVNs and Executors (recommended for most deployments)
2. **`layerzero.simple-worker.config.ts`** - A template for using custom DVNs and Executors (useful for testnets without default workers or advanced custom setups)

### Using the Standard Configuration (Default)

For most deployments, use the standard configuration:

```bash
pnpm hardhat lz:oapp:wire --oapp-config layerzero.config.ts
```

The `layerzero.config.ts` file is organized into clear sections:

- Contract definitions
- Gas options
- Pathway configuration using LayerZero's default workers

### Using Custom Workers Configuration

If you need custom DVNs and Executors (e.g., for testnets without default workers or custom security requirements), use:

```bash
pnpm hardhat lz:oapp:wire --oapp-config layerzero.simple-worker.config.ts
```

The `layerzero.simple-worker.config.ts` file is organized into clear sections:

- **SECTION 1**: Contract definitions (YOU MUST EDIT)
- **SECTION 2**: Gas options (YOU MAY NEED TO EDIT)
- **SECTION 3**: Metadata configuration (MOSTLY BOILERPLATE)
- **SECTION 4**: Custom executor/DVN addresses (YOU MUST EDIT if using custom workers)
- **SECTION 5**: Pathway configuration (YOU MUST EDIT)
- **SECTION 6**: Export configuration

Submit all the transactions to complete wiring. After all transactions confirm, your OApps are wired and can send messages to each other.

### Using Custom Executors and DVNs

> :information_source: For testnets without default workers, see the [Simple Workers section](#simple-workers-for-testnets-without-default-workers) above.

For production deployments or advanced use cases, you can deploy and configure your own custom Executors and DVNs. This is useful when:

- You need specific fee structures or execution logic
- You want full control over message verification and execution
- You're building a custom security stack

To use custom executors and DVNs:

1. **Deploy your custom contracts** on each chain
2. **Use the `layerzero.simple-worker.config.ts` template**:
   - **SECTION 1**: Define your contracts
   - **SECTION 4**: Add your custom executor/DVN addresses
   - **SECTION 5**: Reference them by name in pathways
3. **Wire normally** with `pnpm hardhat lz:oapp:wire --oapp-config layerzero.simple-worker.config.ts`

> :warning: **Important**: Custom executors and DVNs must be deployed on each chain where they're needed. The same canonical name can resolve to different addresses on different chains.

> :book: **For detailed instructions**, see the [Custom Workers Configuration Guide](./CUSTOM_WORKERS_GUIDE.md) which shows exactly what to modify in your configuration.

> :information_source: **Note**: For production, review **SECTION 2** in `layerzero.simple-worker.config.ts` to adjust gas limits based on your contract's actual usage.

## Sending OFTs

With your OFTs wired, you can now send them cross chain.

First, via the mock contract, let's mint on **Base Sepolia**:

```
cast send <OFT_ADDRESS> "mint(address,uint256)" <RECIPIENT_ADDRESS> 1000000000000000000000 --private-key <PRIVATE_KEY> --rpc-url <BASE_SEPOLIA_RPC_URL>

```

> You can get the address of your OFT on Base Sepolia from the file at `./deployments/base-sepolia/MyOFTMock.json`

Send 1 OFT from **Base Sepolia** to **Arbitrum Sepolia**:

```bash
pnpm hardhat lz:oft:send --src-eid 40245 --dst-eid 40231 --amount 1 --to <EVM_ADDRESS>
```

> :information_source: `40245` and `40231` are the Endpoint IDs of Base Sepolia and Arbitrum Sepolia respectively. View the list of chains and their Endpoint IDs on the [Deployed Endpoints](https://docs.layerzero.network/v2/deployments/deployed-contracts) page.

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

- (required) you are not using `MyOFTMock`, which has a public `mint` function
  - In `layerzero.config.ts`, ensure you are not using `MyOFTMock` as the `contractName` for any of the contract objects.
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

#### Notes

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
pnpm hardhat lz:oapp:wire --oapp-config layerzero.config.ts
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
<summary> <a href="https://docs.layerzero.network/v2/developers/evm/create-lz-oapp/deploying"><code>pnpm hardhat lz:deploy</code></a> </summary>

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
pnpm hardhat lz:deploy --help
```

</details>

<details>
<summary> <a href="https://docs.layerzero.network/v2/developers/evm/create-lz-oapp/start"><code>pnpm hardhat lz:oapp:config:init --oapp-config YOUR_OAPP_CONFIG --contract-name CONTRACT_NAME</code></a> </summary>

 <br>

Initializes a `layerzero.config.ts` file for all available pathways between your hardhat networks with the current LayerZero default placeholder settings. This task can be incredibly useful for correctly formatting your config file.

You can run this task by providing the `contract-name` you want to set for the config and `file-name` you want to generate:

```bash
pnpm hardhat lz:oapp:config:init --contract-name CONTRACT_NAME --oapp-config FILE_NAME
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
<summary> <a href="https://docs.layerzero.network/v2/developers/evm/create-lz-oapp/wiring"><code>pnpm hardhat lz:oapp:config:wire --oapp-config YOUR_OAPP_CONFIG</code></a> </summary>

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
pnpm hardhat lz:oapp:wire --oapp-config YOUR_LAYERZERO_CONFIG_FILE
```

Whenever you make changes to the configuration, run `lz:oapp:wire` again. The task will check your current configuration, and only apply NEW changes.

</details>
<details>
<summary> <a href="https://docs.layerzero.network/v2/developers/evm/create-lz-oapp/wiring#checking-pathway-config"><code>pnpm hardhat lz:oapp:config:get --oapp-config YOUR_OAPP_CONFIG</code></a> </summary>

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
<summary> <a href="https://docs.layerzero.network/v2/developers/evm/create-lz-oapp/wiring#checking-pathway-executor"><code>pnpm hardhat lz:oapp:config:get:executor --oapp-config YOUR_OAPP_CONFIG</code></a> </summary>

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
