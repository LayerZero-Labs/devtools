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
- **Testnet funds** on at least 2 chains (see [LayerZero Faucet](https://docs.layerzero.network/v2/developers/evm/tooling/faucets))

## Scaffold this Example

```bash
npx create-lz-oapp@latest --example ovault-evm
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
MNEMONIC="your twelve word mnemonic here"
```

### 2. Network Configuration

Update `hardhat.config.ts` to include your desired networks. Example for 3-chain setup:

```typescript
const config: HardhatUserConfig = {
  networks: {
    // Hub chain (hosts vault + composer)
    "arbitrum-sepolia": {
      eid: EndpointId.ARBSEP_V2_TESTNET,
      url: "https://sepolia-rollup.arbitrum.io/rpc",
      accounts,
    },
    // Spoke chains (asset/share origins)
    "base-sepolia": {
      eid: EndpointId.BASESEP_V2_TESTNET,
      url: "https://sepolia.base.org",
      accounts,
    },
    "optimism-sepolia": {
      eid: EndpointId.OPTSEP_V2_TESTNET,
      url: "https://sepolia.optimism.io",
      accounts,
    },
  },
  // ... rest of config
};
```

## Build

Compile your contracts:

```bash
pnpm compile
```

## Deploy

### 1. Deploy Asset OFTs

Deploy Asset OFTs across all chains (including hub):

```bash
# Deploy MyAssetOFT to all networks
pnpm hardhat lz:deploy --tags asset
```

### 2. Deploy ERC4626 Vault System (Hub Chain Only)

Deploy the vault, composer, and ShareOFT adapter on your hub chain:

```bash
# This creates: MyERC4626 vault + MyOVaultComposer + ShareOFT adapter
pnpm hardhat lz:deploy --network base --tags ovault
```

**Important**: The `deployERC4626` script automatically creates the ShareOFT Adapter using the vault as the inner token (lockbox model).

### 3. Deploy Share OFTs (Spoke Chains Only)

Deploy Share OFTs on non-hub chains:

```bash
# Deploy standard Share OFTs (not adapters)
pnpm hardhat lz:deploy --tags share
```

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
  eid: EndpointId.OPTIMISM_V2_MAINNET.valueOf(),
  contractName: "MyAssetOFT",
};

const arbitrumContract: OmniPointHardhat = {
  eid: EndpointId.ARBITRUM_V2_MAINNET.valueOf(),
  contractName: "MyAssetOFT",
};

const baseContract: OmniPointHardhat = {
  eid: EndpointId.BASE_V2_MAINNET.valueOf(),
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
  eid: EndpointId.OPTIMISM_V2_MAINNET.valueOf(),
  contractName: "MyShareOFT", // Standard OFT (spoke)
};

const arbitrumContract: OmniPointHardhat = {
  eid: EndpointId.BASE_V2_MAINNET.valueOf(), // Note: Base is the hub chain
  contractName: "MyShareOFTAdapter", // Adapter (hub/lockbox)
};

const baseContract: OmniPointHardhat = {
  eid: EndpointId.ARBITRUM_V2_MAINNET.valueOf(),
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
- **Auto-Detection**: The `lz:ovault:send` task automatically detects the hub by finding the contract with "Adapter" in the name

### 3. Wire Asset OFT Network

Configure and wire the Asset OFT connections:

```bash
# Wire Asset OFT network
pnpm hardhat lz:oapp:wire --oapp-config layerzero.asset.config.ts
```

### 4. Wire Share OFT Network

Configure and wire the Share OFT connections:

```bash
# Wire Share OFT network
pnpm hardhat lz:oapp:wire --oapp-config layerzero.share.config.ts
```

### 5. Customizing for Your Networks

To use different chains or network configurations:

**For Testnet Deployment:**

- Replace `EndpointId.OPTIMISM_V2_MAINNET` with `EndpointId.OPTSEP_V2_TESTNET`
- Replace `EndpointId.BASE_V2_MAINNET` with `EndpointId.BASESEP_V2_TESTNET`
- Replace `EndpointId.ARBITRUM_V2_MAINNET` with `EndpointId.ARBSEP_V2_TESTNET`

**For Different Hub Chain:**

- Move the `MyShareOFTAdapter` contract name to your hub chain deployment

**For Additional Chains:**

- Add new contract definitions with appropriate EIDs
- Add pathway configurations between the new chain and existing chains
- Deploy Asset OFTs and Share OFTs to the new chains

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
3. **Security Configuration**: Set up [DVN and Executor configuration](https://docs.layerzero.network/v2/developers/evm/configuration/dvn-executor-config)
4. **Advanced Features**: Explore [custom yield strategies and slippage configuration](./overview.md#advanced-configuration)

## Production Deployment Checklist

- [ ] **Security Stack Configuration**

  - [ ] Configure [DVNs](https://docs.layerzero.network/v2/developers/evm/configuration/dvn-executor-config) for your security requirements
  - [ ] Set appropriate [confirmation blocks](https://docs.layerzero.network/v2/developers/evm/configuration/default-config#confirmation-blocks)
  - [ ] Configure [Executors](https://docs.layerzero.network/v2/developers/evm/configuration/dvn-executor-config#executors) with proper gas settings

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

- [ ] **Error Recovery**

  - [ ] Document error recovery procedures for failed operations
  - [ ] Set up monitoring for failed compose messages
  - [ ] Test refund and retry mechanisms
  - [ ] Configure alerts for stuck transactions

- [ ] **Network Configuration**
  - [ ] Verify all peer configurations are correct
  - [ ] Test message delivery on all supported routes
  - [ ] Confirm rate limiting settings are appropriate
  - [ ] Validate pathway configurations

## Appendix

### Running Tests

Run the test suite to verify your deployment:

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test test/ovault.test.ts

# Run tests with gas reporting
pnpm test:gas
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
pnpm hardhat lz:oapp:config        # Set OApp configuration

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

For additional troubleshooting, see the [LayerZero Troubleshooting Guide](https://docs.layerzero.network/v2/developers/evm/troubleshooting).

---

**Need help?** Reach out in the [LayerZero Discord](https://discord-layerzero.netlify.app/discord) or check the [Developer Docs](https://docs.layerzero.network/).
