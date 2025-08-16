<p align="center">
  <a href="https://layerzero.network">
    <img alt="LayerZero" style="width: 400px" src="https://docs.layerzero.network/img/LayerZero_Logo_White.svg"/>
  </a>
</p>

<p align="center">
  <a href="https://layerzero.network" style="color: #a77dff">Homepage</a> | <a href="https://docs.layerzero.network/" style="color: #a77dff">Docs</a> | <a href="https://layerzero.network/developers" style="color: #a77dff">Developers</a>
</p>

<h1 align="center">Omnichain Vault Example (with Composer)</h1>

Deploy **omnichain ERC-4626 vaults** that enable users to deposit assets from any chain and receive shares on their preferred network through a single transaction.

## Table of Contents

- [Prerequisite Knowledge](#prerequisite-knowledge)
- [Introduction](#introduction)
- [Requirements](#requirements)
- [Scaffold this Example](#scaffold-this-example)
- [Helper Tasks](#helper-tasks)
- [Setup](#setup)
- [Build](#build)
- [Deploy](#deploy)
- [Enable Messaging](#enable-messaging)
- [Cross-Chain Operations](#cross-chain-operations)
- [Next Steps](#next-steps)
- [Production Deployment Checklist](#production-deployment-checklist)
- [Appendix](#appendix)

## Prerequisite Knowledge

Before using this example, you should understand:

- [**OFT Standard**](https://docs.layerzero.network/v2/developers/evm/oft/quickstart): How to deploy and configure Omnichain Fungible Tokens
- [**Composer Pattern**](https://docs.layerzero.network/v2/developers/evm/composer/overview): How to implement cross-chain composer messages
- [**ERC-4626 Vaults**](https://eips.ethereum.org/EIPS/eip-4626): How the tokenized vault standard interface works for `deposit`/`redeem` operations

## Introduction

OVault extends the ERC-4626 tokenized vault standard with LayerZero's omnichain messaging. The architecture uses a **hub-and-spoke model** where:

- **Hub Chain**: Hosts the ERC-4626 vault, OVault Composer, and Share OFT Adapter (lockbox model)
- **Spoke Chains**: Host Asset OFTs and Share OFTs that connect to the hub

OVault makes it extremely easy to move assets and shares between any supported chains, while also enabling cross-chain vault operations. Users can deposit assets from any chain to receive shares on any destination chain, redeem shares from any chain to receive assets on any destination chain, or simply transfer these tokens between chains - all through a unified interface.

## Requirements

- **git**
- **Node.js** ≥ 18.18
- **pnpm** ≥ 8.0 (with `corepack` enabled)
- **Testnet funds** on at least 2 chains

## Scaffold this Example

```bash
LZ_ENABLE_OVAULT_EXAMPLE=1 npx create-lz-oapp@latest --example ovault-evm
```

## Helper Tasks

This example includes LayerZero Hardhat helper tasks. [See all available tasks](#layerzero-hardhat-helper-tasks-detailed).

## Setup

### 1. Environment Configuration

Copy and configure your environment:

```bash
cp .env.example .env
```

Fill in your `.env`:

```bash
PRIVATE_KEY="YOUR_PRIVATE_KEY_HERE"
```

### 2. Network Configuration

Update `hardhat.config.ts` to include your desired networks:

```typescript
const config: HardhatUserConfig = {
  networks: {
    base: {
      eid: EndpointId.BASESEP_V2_TESTNET,
      url:
        process.env.RPC_URL_BASESEP_TESTNET ||
        "https://base-sepolia.gateway.tenderly.co",
      accounts,
    },
    arbitrum: {
      eid: EndpointId.ARBSEP_V2_TESTNET,
      url:
        process.env.RPC_URL_ARBSEP_TESTNET ||
        "https://arbitrum-sepolia.gateway.tenderly.co",
      accounts,
    },
    optimism: {
      eid: EndpointId.OPTSEP_V2_TESTNET,
      url:
        process.env.RPC_URL_OPTSEP_TESTNET ||
        "https://optimism-sepolia.gateway.tenderly.co",
      accounts,
    },
  },
  // ... rest of config
};
```

### 3. Deployment Configuration

Configure your vault deployment in `devtools/deployConfig.ts`. This file controls which chains get which contracts and their deployment settings:

> **Note**: If your asset is already an OFT, you do not need to deploy a separate mesh. The only requirement is that the asset OFT supports the hub chain you are deploying to.

Asset and share token networks don't need to perfectly overlap. Configure based on your requirements:

```typescript
import { EndpointId } from "@layerzerolabs/lz-definitions";

export const DEPLOYMENT_CONFIG = {
  // Vault chain configuration (where the ERC4626 vault lives)
  vault: {
    eid: EndpointId.ARBSEP_V2_TESTNET, // Your hub chain
    contracts: {
      vault: "MyERC4626",
      shareAdapter: "MyShareOFTAdapter",
      composer: "MyOVaultComposer",
    },
    // IF YOU HAVE A PRE-DEPLOYED ASSET, SET THE ADDRESS HERE
    assetAddress: undefined, // Set to '0x...' to use existing asset
  },

  // Asset OFT configuration (deployed on all chains)
  asset: {
    contract: "MyAssetOFT",
    metadata: {
      name: "MyAssetOFT",
      symbol: "ASSET",
    },
    chains: [
      EndpointId.OPTSEP_V2_TESTNET,
      EndpointId.BASESEP_V2_TESTNET,
      EndpointId.ARBSEP_V2_TESTNET, // Include hub chain
    ],
  },

  // Share OFT configuration (only on spoke chains)
  share: {
    contract: "MyShareOFT",
    metadata: {
      name: "MyShareOFT",
      symbol: "SHARE",
    },
    chains: [
      EndpointId.OPTSEP_V2_TESTNET,
      EndpointId.BASESEP_V2_TESTNET,
      // Do NOT include hub chain (it uses ShareOFTAdapter)
    ],
  },
};
```

**Key Configuration Points:**

- **Hub Chain**: Set `vault.eid` to your chosen hub chain's endpoint ID
- **Asset Chains**: Include all chains where you want asset OFTs (including the hub chain)
- **Share Chains**: Include only spoke chains (exclude hub, which uses the ShareOFTAdapter)
- **Pre-deployed Asset**: Set `vault.assetAddress` if using an existing asset token

The deployment scripts automatically determine what to deploy based on:

- Vault contracts (ERC4626, ShareOFTAdapter, Composer) deploy only on the hub chain
- Asset OFTs deploy on chains listed in `asset.chains` (unless using pre-deployed asset)
- Share OFTs deploy on chains listed in `share.chains`

## Build

Compile your contracts:

```bash
pnpm compile`
```

> **Testing Note**: If you're deploying the asset OFT from scratch for testing purposes, you'll need to mint an initial supply. Uncomment the `_mint` line in the `MyAssetOFT` constructor to provide initial liquidity. This ensures you have tokens to test deposit and cross-chain transfer functionality.
>
> **⚠️ Warning**: Do NOT mint share tokens directly in `MyShareOFT`. Share tokens must only be minted by the vault contract during deposits to maintain the correct share-to-asset ratio. Manually minting share tokens breaks the vault's accounting and can lead to incorrect redemption values. The mint line in `MyShareOFT` should only be uncommented for UI/integration testing, never in production.

## Deploy

Deploy all vault contracts across all configured chains:

```bash
pnpm hardhat lz:deploy --tags ovault
```

This single command will:

- Deploy `AssetOFTs` to all chains in `deployConfig.asset.chains`
- Deploy the vault system (`ERC4626`, `ShareOFTAdapter`, `Composer`) on the hub chain
- Deploy `ShareOFTs` to all spoke chains in `deployConfig.share.chains`

The deployment scripts automatically skip existing deployments, so you can safely run this command when expanding to new chains. Simply add the new chain endpoints to your `deployConfig.ts` and run the deploy command again.

> **Tip**: To deploy to specific networks only, use the `--networks` flag:
>
> ```bash
> pnpm hardhat lz:deploy --tags ovault --networks arbitrum,optimism
> ```

## Enable Messaging

### 1. Configure Asset OFT Network

Set up your Asset OFT configuration in `layerzero.asset.config.ts`. The example uses the `TwoWayConfig` pattern for simplified bidirectional connections:

```typescript
import { EndpointId } from "@layerzerolabs/lz-definitions";
import { ExecutorOptionType } from "@layerzerolabs/lz-v2-utilities";
import {
  TwoWayConfig,
  generateConnectionsConfig,
} from "@layerzerolabs/metadata-tools";
import { OAppEnforcedOption } from "@layerzerolabs/toolbox-hardhat";

const optimismContract: OmniPointHardhat = {
  eid: EndpointId.OPTSEP_V2_TESTNET.valueOf(),
  contractName: "MyAssetOFT",
};

const arbitrumContract: OmniPointHardhat = {
  eid: EndpointId.ARBSEP_V2_TESTNET.valueOf(),
  contractName: "MyAssetOFT",
};

const baseContract: OmniPointHardhat = {
  eid: EndpointId.BASESEP_V2_TESTNET.valueOf(),
  contractName: "MyAssetOFT",
};

// Configure gas limits for message execution
const EVM_ENFORCED_OPTIONS: OAppEnforcedOption[] = [
  {
    msgType: 1,
    optionType: ExecutorOptionType.LZ_RECEIVE,
    gas: 100_000,
    value: 0,
  },
  {
    msgType: 2,
    optionType: ExecutorOptionType.LZ_RECEIVE,
    gas: 100_000,
    value: 0,
  },
];

// Pathway configuration (automatically bidirectional)
const pathways: TwoWayConfig[] = [
  [
    optimismContract, // Chain A
    arbitrumContract, // Chain B
    [["LayerZero Labs"], []], // DVN configuration
    [1, 1], // Confirmations [A→B, B→A]
    [EVM_ENFORCED_OPTIONS, EVM_ENFORCED_OPTIONS], // Gas options
  ],
  [
    optimismContract,
    baseContract,
    [["LayerZero Labs"], []],
    [1, 1],
    [EVM_ENFORCED_OPTIONS, EVM_ENFORCED_OPTIONS],
  ],
  [
    arbitrumContract,
    baseContract,
    [["LayerZero Labs"], []],
    [1, 1],
    [EVM_ENFORCED_OPTIONS, EVM_ENFORCED_OPTIONS],
  ],
];

export default async function () {
  const connections = await generateConnectionsConfig(pathways);
  return {
    contracts: [
      { contract: optimismContract },
      { contract: arbitrumContract },
      { contract: baseContract },
    ],
    connections,
  };
}
```

**To modify for your networks:**

1. Update the contract definitions with your target chain EIDs
2. Adjust gas limits in `EVM_ENFORCED_OPTIONS` based on your contract requirements
3. Configure DVN settings in pathways (currently using LayerZero Labs DVN)
4. Update confirmations based on your security requirements

### 2. Configure Share OFT Network

Set up your Share OFT configuration in `layerzero.share.config.ts`. **Critical**: The hub chain must use `MyShareOFTAdapter` (lockbox model):

```typescript
import { EndpointId } from "@layerzerolabs/lz-definitions";
import { ExecutorOptionType } from "@layerzerolabs/lz-v2-utilities";
import {
  TwoWayConfig,
  generateConnectionsConfig,
} from "@layerzerolabs/metadata-tools";
import { OAppEnforcedOption } from "@layerzerolabs/toolbox-hardhat";

const optimismContract: OmniPointHardhat = {
  eid: EndpointId.OPTSEP_V2_TESTNET.valueOf(),
  contractName: "MyShareOFT", // Standard OFT (spoke)
};

const arbitrumContract: OmniPointHardhat = {
  eid: EndpointId.BASESEP_V2_TESTNET.valueOf(), // Note: Base is the hub chain
  contractName: "MyShareOFTAdapter", // Adapter (hub/lockbox)
};

const baseContract: OmniPointHardhat = {
  eid: EndpointId.ARBSEP_V2_TESTNET.valueOf(),
  contractName: "MyShareOFT", // Standard OFT (spoke)
};

// Same enforced options as asset config
const EVM_ENFORCED_OPTIONS: OAppEnforcedOption[] = [
  {
    msgType: 1,
    optionType: ExecutorOptionType.LZ_RECEIVE,
    gas: 100_000,
    value: 0,
  },
  {
    msgType: 2,
    optionType: ExecutorOptionType.LZ_RECEIVE,
    gas: 100_000,
    value: 0,
  },
];

// Same pathway structure as asset config
const pathways: TwoWayConfig[] = [
  [
    optimismContract, // Spoke
    arbitrumContract, // Hub (Base chain with adapter)
    [["LayerZero Labs"], []],
    [1, 1],
    [EVM_ENFORCED_OPTIONS, EVM_ENFORCED_OPTIONS],
  ],
  [
    optimismContract, // Spoke
    baseContract, // Spoke (Arbitrum)
    [["LayerZero Labs"], []],
    [1, 1],
    [EVM_ENFORCED_OPTIONS, EVM_ENFORCED_OPTIONS],
  ],
  [
    arbitrumContract, // Hub (Base)
    baseContract, // Spoke (Arbitrum)
    [["LayerZero Labs"], []],
    [1, 1],
    [EVM_ENFORCED_OPTIONS, EVM_ENFORCED_OPTIONS],
  ],
];

export default async function () {
  const connections = await generateConnectionsConfig(pathways);
  return {
    contracts: [
      { contract: optimismContract },
      { contract: arbitrumContract },
      { contract: baseContract },
    ],
    connections,
  };
}
```

**Important Notes:**

- **Hub Chain**: In this example, Base is the hub (uses `MyShareOFTAdapter`)
- **Contract Types**: Only the hub chain uses `MyShareOFTAdapter`; all other chains use `MyShareOFT`

### 3. Customizing for Your Networks

To use different chains or network configurations:

**For Testnet Deployment:**

- Replace `EndpointId.OPTSEP_V2_TESTNET` with `EndpointId.OPTSEP_V2_TESTNET`
- Replace `EndpointId.BASESEP_V2_TESTNET` with `EndpointId.BASESEP_V2_TESTNET`
- Replace `EndpointId.ARBSEP_V2_TESTNET` with `EndpointId.ARBSEP_V2_TESTNET`

**For Different Hub Chain:**

- Move the `MyShareOFTAdapter` contract name to your hub chain deployment

**For Additional Chains:**

- Add new contract definitions with appropriate EIDs
- Add pathway configurations between the new chain and existing chains
- Deploy Asset OFTs and Share OFTs to the new chains

### 4. Wire Asset OFT Network

Configure and wire the Asset OFT connections:

```bash
# Wire Asset OFT network
pnpm hardhat lz:oapp:wire --oapp-config layerzero.asset.config.ts
```

### 5. Wire Share OFT Network

Configure and wire the Share OFT connections:

```bash
# Wire Share OFT network
pnpm hardhat lz:oapp:wire --oapp-config layerzero.share.config.ts
```

## Cross-Chain Operations

The `lz:ovault:send` task handles four different operation types automatically based on source and destination chains. Here's how to use each:

### 1. Cross-Chain Vault Operations (Different Chains)

**Asset Deposit (Any Chain → Any Other Chain)**

Send assets from any spoke chain to receive vault shares on any other chain:

```bash
# Send 1.0 asset from Arbitrum to get shares on Optimism
npx hardhat lz:ovault:send \
  --src-eid 30110 \
  --dst-eid 30111 \
  --amount 1.0 \
  --to 0xYourRecipientAddress \
  --token-type asset
```

**Flow**: Arbitrum (asset) → Base Hub (vault deposit) → Optimism (shares)

**Share Redemption (Any Chain → Any Other Chain)**

Send shares from any spoke chain to receive underlying assets on any other chain:

```bash
# Send 0.9 shares from Optimism to get assets on Arbitrum
npx hardhat lz:ovault:send \
  --src-eid 30111 \
  --dst-eid 30110 \
  --amount 0.9 \
  --to 0xYourRecipientAddress \
  --token-type share
```

**Flow**: Optimism (shares) → Base Hub (vault redeem) → Arbitrum (assets)

### 2. Hub Chain Vault Operations (Same Chain)

**Direct Vault Deposit (Hub → Hub)**

Deposit assets directly into the vault on the hub chain:

```bash
# Deposit 2.0 assets into vault on hub chain (Base)
npx hardhat lz:ovault:send \
  --src-eid 30184 \
  --dst-eid 30184 \
  --amount 2.0 \
  --to 0xYourRecipientAddress \
  --token-type asset
```

**Flow**: Direct vault interaction (no LayerZero messaging)

- Automatically handles ERC20 approval
- Calls `vault.deposit()` directly
- Most gas-efficient option

**Direct Vault Redemption (Hub → Hub)**

Redeem shares directly from the vault on the hub chain:

```bash
# Redeem 1.5 shares from vault on hub chain (Base)
npx hardhat lz:ovault:send \
  --src-eid 30184 \
  --dst-eid 30184 \
  --amount 1.5 \
  --to 0xYourRecipientAddress \
  --token-type share
```

**Flow**: Direct vault interaction (no LayerZero messaging)

- Calls `vault.redeem()` directly
- Most gas-efficient option

### 3. Hub-to-Spoke Operations (Send from Hub)

**Send Assets from Hub to Spoke Chain**

Send asset tokens from the hub chain to any spoke chain:

```bash
# Send 1.0 asset tokens from hub (Base) to Arbitrum
npx hardhat lz:ovault:send \
  --src-eid 30184 \
  --dst-eid 30110 \
  --amount 1.0 \
  --to 0xYourRecipientAddress \
  --token-type asset
```

**Flow**: Direct OFT transfer (no composer needed)

- More efficient than composer pattern
- Standard LayerZero OFT send

**Send Shares from Hub to Spoke Chain**

Send share tokens from the hub chain to any spoke chain:

```bash
# Send 0.8 share tokens from hub (Base) to Optimism
npx hardhat lz:ovault:send \
  --src-eid 30184 \
  --dst-eid 30111 \
  --amount 0.8 \
  --to 0xYourRecipientAddress \
  --token-type share
```

**Flow**: Direct OFT transfer (no composer needed)

### 4. Spoke-to-Hub Operations (With Vault Interaction)

**Send Assets to Hub for Vault Deposit**

Send assets from any spoke chain to the hub for vault deposit:

```bash
# Send 1.5 assets from Arbitrum to hub for vault deposit
npx hardhat lz:ovault:send \
  --src-eid 30110 \
  --dst-eid 30184 \
  --amount 1.5 \
  --to 0xYourRecipientAddress \
  --token-type asset
```

**Flow**: Arbitrum (asset) → Base Hub (vault deposit → shares to recipient)

- Uses composer for vault interaction
- Optimized gas limits for hub-only operations

**Send Shares to Hub for Vault Redemption**

Send shares from any spoke chain to the hub for vault redemption:

```bash
# Send 1.2 shares from Optimism to hub for vault redemption
npx hardhat lz:ovault:send \
  --src-eid 30111 \
  --dst-eid 30184 \
  --amount 1.2 \
  --to 0xYourRecipientAddress \
  --token-type share
```

**Flow**: Optimism (shares) → Base Hub (vault redeem → assets to recipient)

- Uses composer for vault interaction
- Optimized gas limits for hub-only operations

### Advanced Parameters

**Basic Parameters:**

- `--src-eid`: Source chain [Endpoint ID](https://docs.layerzero.network/v2/developers/evm/technical-reference/deployed-contracts)
- `--dst-eid`: Destination chain Endpoint ID
- `--amount`: Amount to send (human readable, e.g., "1.5")
- `--to`: Recipient address (20-byte hex for EVM)
- `--token-type`: Either `asset` or `share`

**Optional Parameters:**

- `--min-amount`: Minimum amount to receive (slippage protection)
- `--lz-receive-gas`: Gas for lzReceive operation
- `--lz-receive-value`: Value for lzReceive operation (in wei)
- `--lz-compose-gas`: Gas for lzCompose operation (auto-optimized by default)
- `--lz-compose-value`: Value for lzCompose operation (in wei)
- `--oft-address`: Override source OFT address

**Gas Optimization:**

The task automatically optimizes gas limits based on operation type:

- **Hub-only operations**: 175,000 gas (local transfers)
- **Cross-chain operations**: 395,000 gas (LayerZero messaging)
- **No compose needed**: 0 gas (direct OFT sends)

### Example Workflows

**Complete Deposit Cycle:**

```bash
# 1. Deposit assets cross-chain (Arbitrum → Hub → Optimism)
npx hardhat lz:ovault:send --src-eid 30110 --dst-eid 30111 --amount 10.0 --to 0xRecipient --token-type asset

# 2. Later redeem shares back (Optimism → Hub → Arbitrum)
npx hardhat lz:ovault:send --src-eid 30111 --dst-eid 30110 --amount 9.5 --to 0xRecipient --token-type share
```

**Hub Chain Management:**

```bash
# 1. Deposit directly on hub (most efficient)
npx hardhat lz:ovault:send --src-eid 30184 --dst-eid 30184 --amount 5.0 --to 0xRecipient --token-type asset

# 2. Send shares to other chains as needed
npx hardhat lz:ovault:send --src-eid 30184 --dst-eid 30110 --amount 2.0 --to 0xRecipient --token-type share
```

## Next Steps

After completing your deployment:

1. **Monitor Transactions**: Use [LayerZero Scan](https://testnet.layerzeroscan.com) to track cross-chain operations
2. **Production Checklist**: Review the [Production Deployment Checklist](#production-deployment-checklist)
3. **Security Configuration**: Set up [DVN and Executor configuration](https://docs.layerzero.network/v2/developers/evm/oft/quickstart#2-wire-messaging-libraries-and-configurations)

## Production Deployment Checklist

- [ ] **Security Stack Configuration**

  - [ ] Configure [DVNs](https://docs.layerzero.network/v2/developers/evm/oft/quickstart#2-wire-messaging-libraries-and-configurations) for your security requirements
  - [ ] Set appropriate [confirmation blocks](https://docs.layerzero.network/v2/developers/evm/oft/quickstart#2-wire-messaging-libraries-and-configurations)
  - [ ] Configure [Executors](https://docs.layerzero.network/v2/developers/evm/oft/quickstart#2-wire-messaging-libraries-and-configurations) with proper gas settings

- [ ] **Gas & Options Configuration**

  - [ ] Profile gas usage with [Message Options](https://docs.layerzero.network/v2/developers/evm/configuration/options)
  - [ ] Set proper `lzReceive` gas limits for vault operations
  - [ ] Configure `lzCompose` gas limits for second hop transfers
  - [ ] Test gas estimation across all supported routes

- [ ] **Vault Configuration**

  - [ ] Ensure Share OFT on hub uses OFTAdapter (lockbox model)
  - [ ] Configure appropriate slippage tolerances for vault volatility
  - [ ] Set up vault access controls and admin functions
  - [ ] Test vault preview functions (`previewDeposit`/`previewRedeem`)

## Appendix

### Running Tests

Run the test suite to verify your deployment:

```bash
# Run all tests
pnpm test
```

### Adding Other Chains

To add additional chains to your OVault:

1. **Update Hardhat Config**: Add new network to `hardhat.config.ts`
2. **Deploy Contracts**: Deploy Asset OFT and Share OFT to new chain
3. **Update Configs**: Add new chain to both `layerzero.asset.config.ts` and `layerzero.share.config.ts`
4. **Add Connections**: Define peer connections from/to new chain
5. **Wire Networks**: Re-run wiring commands with updated configs

### LayerZero Hardhat Helper Tasks (Detailed)

This example includes several built-in tasks. View all available tasks:

```bash
# List all tasks
pnpm hardhat

# OFT-specific tasks
pnpm hardhat lz:oft:send           # Send OFT tokens cross-chain
pnpm hardhat lz:ovault:send        # Send through OVault composer

# OApp configuration tasks
pnpm hardhat lz:oapp:wire          # Wire OApp connections

# General LayerZero tasks
pnpm hardhat lz:deploy             # Deploy contracts
```

### Troubleshooting

**Common Issues:**

1. **"Share adapter must be lockbox" Error**

   - **Cause**: Share OFT on hub chain is not configured as OFTAdapter
   - **Solution**: Ensure `MyShareOFTAdapter` is deployed on hub, not `MyShareOFT`

2. **Cross-chain vault operation fails**

   - **Diagnostic**: Check [LayerZero Scan](https://testnet.layerzeroscan.com) for message status
   - **Solutions**: Verify composer gas allowances, check vault liquidity, increase slippage tolerance

3. **"Slippage exceeded during vault operation"**

   - **Cause**: Share price changed during cross-chain operation
   - **Solution**: Increase slippage tolerance with `--min-amount` parameter

4. **Gas estimation errors**
   - **Cause**: Insufficient gas limits for complex operations
   - **Solution**: Increase `lzReceive` and `lzCompose` gas limits in configuration

---

**Need help?** Reach out in the [LayerZero Discord](https://discord-layerzero.netlify.app/discord) or check the [Developer Docs](https://docs.layerzero.network/).
