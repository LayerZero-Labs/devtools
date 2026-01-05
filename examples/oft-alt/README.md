<p align="center">
  <a href="https://layerzero.network">
    <img alt="LayerZero" style="width: 400px" src="https://docs.layerzero.network/img/LayerZero_Logo_Black.svg"/>
  </a>
</p>

<p align="center">
 <a href="https://docs.layerzero.network/" style="color: #a77dff">LayerZero Docs</a>
</p>

<h1 align="center">Omnichain Fungible Token for Alt Endpoints (OFTAlt) Example</h1>

<p align="center">Template project for deploying cross-chain tokens (<a href="https://docs.layerzero.network/v2/concepts/applications/oft-standard">OFT</a>) powered by the LayerZero protocol, demonstrating how to connect chains with <a href="https://docs.layerzero.network/v2/concepts/protocol/layerzero-endpoint-alt">Alt Endpoints</a> (ERC-20 fee payment) to standard EVM chains (native gas fee payment).</p>

## Table of Contents

- [Primary Use Case](#primary-use-case)
- [What is OFTAlt?](#what-is-oftalt)
- [Key Differences from Standard OFT](#key-differences-from-standard-oft)
- [Requirements](#requirements)
- [Scaffold this example](#scaffold-this-example)
- [Helper Tasks](#helper-tasks)
- [Setup](#setup)
- [Build](#build)
  - [Compiling your contracts](#compiling-your-contracts)
- [Deploy](#deploy)
- [Enable Messaging](#enable-messaging)
- [Sending OFTs](#sending-ofts)
- [Next Steps](#next-steps)
- [Appendix](#appendix)
  - [Running Tests](#running-tests)
  - [Adding other chains](#adding-other-chains)
  - [Using Multisigs](#using-multisigs)
  - [LayerZero Hardhat Helper Tasks](#layerzero-hardhat-helper-tasks)
  - [Manual Configuration](#manual-configuration)
  - [Contract Verification](#contract-verification)
  - [Troubleshooting](#troubleshooting)

## Primary Use Case

This example demonstrates the most common scenario for OFTAlt deployments:

```
┌─────────────────────────────────┐         ┌─────────────────────────────────┐
│           Tempo                 │         │        Arbitrum Sepolia         │
│    (Alt Endpoint Chain)         │◄───────►│   (Standard EVM Chain)          │
│                                 │         │                                 │
│  ┌───────────────────────────┐  │         │  ┌───────────────────────────┐  │
│  │       MyOFTAlt            │  │         │  │        MyOFT              │  │
│  │  (ERC-20 fee payment)     │  │         │  │  (Native gas payment)     │  │
│  └───────────────────────────┘  │         │  └───────────────────────────┘  │
└─────────────────────────────────┘         └─────────────────────────────────┘
```

**This example includes both contracts:**

- **`MyOFT.sol`** - Standard OFT for regular EVM chains with native gas fees (deployed on Arbitrum)
- **`MyOFTAlt.sol`** - OFTAlt for chains with Alt Endpoints using ERC-20 fees (deployed on Tempo)

The `lz:oft:send` task automatically detects which endpoint type is being used and handles fee payment accordingly.

## What is OFTAlt?

The **OFTAlt** (Omnichain Fungible Token Alt) is a variant of the standard OFT designed for blockchains that use [Alt Endpoints](https://docs.layerzero.network/v2/concepts/protocol/layerzero-endpoint-alt). Alt Endpoints are deployed on chains where transaction fees are paid in ERC-20 stablecoins rather than native tokens.

Examples of chains using Alt Endpoints:

- **Tempo**: A payments-focused blockchain where fees are paid in TIP-20 stablecoins

The OFTAlt works identically to standard OFT in terms of token transfer mechanics—burning on the source chain and minting on the destination chain—but handles fee payment differently.

<img alt="OFT Mechanism" src="https://docs.layerzero.network/assets/images/oft_mechanism_light-922b88c364b5156e26edc6def94069f1.jpg"/>

## Key Differences from Standard OFT

| Aspect                | Standard OFT                       | OFTAlt                            |
| --------------------- | ---------------------------------- | --------------------------------- |
| **Fee Payment**       | `msg.value` (native ETH/AVAX/etc.) | ERC-20 `transferFrom`             |
| **Pre-requisite**     | None                               | Approve Endpoint for fee spending |
| **Cross-chain Logic** | Standard                           | Standard (no changes)             |
| **Endpoint Type**     | EndpointV2                         | EndpointV2Alt                     |

### Fee Payment Flow

1. **Discover the fee token**: Query `endpoint.nativeToken()` to get the stablecoin address
2. **Quote fees**: Call `quoteSend()` - returns fees in the fee token denomination
3. **Approve spending**: Before sending, approve the OFTAlt contract to spend fee tokens
4. **Send with value: 0**: Call `send()` with `{value: 0}` - fees are pulled via `transferFrom`

## Requirements

- `Node.js` - `>=18.16.0`
- `pnpm` (recommended) - or another package manager of your choice (npm, yarn)
- `forge` (optional) - `>=0.2.0` for testing, and if not using Hardhat for compilation

## Scaffold this example

Create your local copy of this example:

```bash
LZ_ENABLE_ALT_EXAMPLE=1 pnpm dlx create-lz-oapp@latest --example oft-alt
```

Specify the directory, select `OFT Alt` and proceed with the installation.

Note that `create-lz-oapp` will also automatically run the dependencies install step for you.

## Helper Tasks

Throughout this walkthrough, helper tasks will be used. For the full list of available helper tasks, refer to the [LayerZero Hardhat Helper Tasks section](#layerzero-hardhat-helper-tasks). All commands can be run at the project root.

## Setup

Create a `.env` file in the project root and configure your deployer credentials:

```bash
# Authentication (choose one)
MNEMONIC="test test test test test test test test test test test junk"
# or...
PRIVATE_KEY="0xabc...def"

# RPC URLs
# Standard EVM chains
RPC_URL_ARB_SEPOLIA="https://arbitrum-sepolia.gateway.tenderly.co"

# Alt Endpoint chains (ERC-20 fee payment)
RPC_URL_TEMPO_TESTNET="https://rpc.testnet.tempo.xyz"
```

Fund this deployer address/account with:

- Native tokens for gas on standard EVM chains (e.g., ETH on Arbitrum Sepolia)
- **ERC-20 fee tokens** (stablecoins) on Tempo testnet for LayerZero fees

## Build

### Compiling your contracts

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

Deploy the appropriate contract type to each chain based on its endpoint type:

### Deploy Standard OFT to Arbitrum Sepolia

For chains with standard EndpointV2 (native gas fee payment):

```bash
pnpm hardhat lz:deploy --tags MyOFT
```

Select `arbitrum-sepolia` when prompted.

### Deploy OFTAlt to Tempo Testnet

For chains with EndpointV2Alt (ERC-20 fee payment):

```bash
pnpm hardhat lz:deploy --tags MyOFTAlt
```

Select `tempo-testnet` when prompted.

### Adapter Variants

For chains where you want to adapt an existing ERC-20 token instead of creating a new one:

```bash
# For Tempo (Alt Endpoint)
pnpm hardhat lz:deploy --tags MyOFTAdapterAlt
```

## Enable Messaging

The OFTAlt standard builds on top of the OApp standard, which enables generic message-passing between chains. After deploying the OFTAlt on the respective chains, you enable messaging by running the [wiring](https://docs.layerzero.network/v2/concepts/glossary#wire--wiring) task.

> :information_source: This example uses the [Simple Config Generator](https://docs.layerzero.network/v2/tools/simple-config), which is recommended over manual configuration.

Wire your deployed contracts:

```bash
pnpm hardhat lz:oapp:wire --oapp-config layerzero.config.ts
```

The `layerzero.config.ts` file is organized into clear sections:

- **SECTION 1**: Contract definitions (define your OFTAlt contracts per chain)
- **SECTION 2**: Gas options (enforced options for destination execution)
- **SECTION 3**: Pathway configuration (bidirectional connections between contracts)
- **SECTION 4**: Export configuration

Submit all the transactions to complete wiring. After all transactions confirm, your OApps are wired and can send messages to each other.

## Sending OFTs

With your OFTAlts wired, you can now send them cross-chain.

### Sending from Tempo (Alt Endpoint) to Arbitrum

When sending from Tempo (Alt Endpoint), the task automatically:

1. Detects the Alt Endpoint via `endpoint.nativeToken()`
2. Approves the OFTAlt contract for ERC-20 fee spending
3. Sends with `{value: 0}` (fees pulled via `transferFrom`)

```bash
# Send from Tempo testnet to Arbitrum Sepolia
pnpm hardhat lz:oft:send --src-eid <TEMPO_TESTNET_EID> --dst-eid 40231 --amount 1 --to <EVM_ADDRESS>
```

### Sending from Arbitrum (Standard Endpoint) to Tempo

When sending from a standard EVM chain, the send works normally with native gas:

```bash
# Send from Arbitrum Sepolia to Tempo testnet
pnpm hardhat lz:oft:send --src-eid 40231 --dst-eid <TEMPO_TESTNET_EID> --amount 1 --to <EVM_ADDRESS>
```

> :information_source: View the list of chains and their Endpoint IDs on the [Deployed Endpoints](https://docs.layerzero.network/v2/deployments/deployed-contracts) page.

Upon a successful send, the script will provide you with the link to the message on LayerZero Scan.

Once the message is delivered, you will be able to click on the destination transaction hash to verify that the OFT was sent.

Congratulations, you have now sent an OFTAlt cross-chain!

> If you run into any issues, refer to [Troubleshooting](#troubleshooting).

## Next Steps

Now that you've gone through a simplified walkthrough, here are what you can do next.

- Read the [Alt Endpoint documentation](https://docs.layerzero.network/v2/concepts/protocol/layerzero-endpoint-alt)
- Read on [DVNs / Security Stack](https://docs.layerzero.network/v2/concepts/modular-security/security-stack-dvns)
- Read on [Message Execution Options](https://docs.layerzero.network/v2/concepts/technical-reference/options-reference)

## Appendix

### Running Tests

Similar to the contract compilation, we support both `hardhat` and `forge` tests. By default, the `test` command will execute both:

```bash
pnpm test
```

If you prefer one over the other, you can use the tooling-specific commands:

```bash
pnpm test:forge
pnpm test:hardhat
```

### Adding other chains

If you're adding another EVM chain, first, add it to the `hardhat.config.ts`.

Then, modify `layerzero.config.ts` with the following changes:

- Declare a new contract object (specifying the `eid` and `contractName`)
- Decide whether to use an existing EVM enforced options variable or declare a new one
- Create new entries in the `pathways` variable
- Add the new contract into the `contracts` array in the export

After applying the desired changes, make sure you re-run the wiring task:

```bash
pnpm hardhat lz:oapp:wire --oapp-config layerzero.config.ts
```

### Using Multisigs

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

### LayerZero Hardhat Helper Tasks

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
<summary> <a href="https://docs.layerzero.network/v2/developers/evm/create-lz-oapp/wiring"><code>pnpm hardhat lz:oapp:wire --oapp-config YOUR_OAPP_CONFIG</code></a> </summary>

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

</details>

<details>
<summary> <a href="https://docs.layerzero.network/v2/developers/evm/create-lz-oapp/wiring#checking-pathway-executor"><code>pnpm hardhat lz:oapp:config:get:executor --oapp-config YOUR_OAPP_CONFIG</code></a> </summary>

 <br>

Returns the LayerZero Executor config for each network in your `hardhat.config.ts`. You can use this method to see the max destination gas in wei (`nativeCap`) you can request in your [`execution options`](https://docs.layerzero.network/v2/developers/evm/gas-settings/options).

</details>

### Manual Configuration

This section only applies if you would like to configure manually instead of using the Simple Config Generator.

Define the pathway you want to create from and to each contract:

```typescript
connections: [
  // Chain A <--> Chain B PATHWAY: START
  {
    from: chainAContract,
    to: chainBContract,
  },
  {
    from: chainBContract,
    to: chainAContract,
  },
  // Chain A <--> Chain B PATHWAY: END
];
```

Finally, define the config settings for each direction of the pathway:

```typescript
connections: [
  {
    from: chainAContract,
    to: chainBContract,
    config: {
      sendLibrary: contractsConfig.chainA.sendLib302,
      receiveLibraryConfig: {
        receiveLibrary: contractsConfig.chainA.receiveLib302,
        gracePeriod: BigInt(0),
      },
      sendConfig: {
        executorConfig: {
          maxMessageSize: 10000,
          executor: contractsConfig.chainA.executor,
        },
        ulnConfig: {
          confirmations: BigInt(15),
          requiredDVNs: [contractsConfig.chainA.lzDVN],
          optionalDVNs: [],
          optionalDVNThreshold: 0,
        },
      },
      receiveConfig: {
        ulnConfig: {
          confirmations: BigInt(20),
          requiredDVNs: [contractsConfig.chainA.lzDVN],
          optionalDVNs: [],
          optionalDVNThreshold: 0,
        },
      },
      enforcedOptions: [
        {
          msgType: 1,
          optionType: ExecutorOptionType.LZ_RECEIVE,
          gas: 65000,
          value: 0,
        },
      ],
    },
  },
];
```

### Contract Verification

You can verify EVM chain contracts using the LayerZero helper package:

```bash
pnpm dlx @layerzerolabs/verify-contract -n <NETWORK_NAME> -u <API_URL> -k <API_KEY> --contracts <CONTRACT_NAME>
```

### Troubleshooting

#### LZ_OnlyAltToken Error

**Cause**: Sending `msg.value` to an Alt Endpoint.

```solidity
// ❌ Wrong - Alt endpoints don't accept native value
oft.send{value: fee.nativeFee}(sendParam, fee, refund);

// ✅ Correct - Fees are paid via ERC20 transferFrom
oft.send{value: 0}(sendParam, fee, refund);
```

#### ERC20: insufficient allowance

**Cause**: OFTAlt can't transfer stablecoins for fees.

```solidity
// Approve stablecoin spending before calling send()
IERC20(feeToken).approve(address(oft), fee.nativeFee);
```

#### ERC20: transfer amount exceeds balance

**Cause**: Insufficient stablecoin balance for fees. Acquire fee tokens for the Alt Endpoint chain.

For additional troubleshooting, refer to [Debugging Messages](https://docs.layerzero.network/v2/developers/evm/troubleshooting/debugging-messages) or [Error Codes & Handling](https://docs.layerzero.network/v2/developers/evm/troubleshooting/error-messages).

<p align="center">
  Join our <a href="https://layerzero.network/community" style="color: #a77dff">community</a>! | Follow us on <a href="https://x.com/LayerZero_Labs" style="color: #a77dff">X (formerly Twitter)</a>
</p>
