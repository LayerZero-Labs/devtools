<p align="center">
  <a href="https://layerzero.network">
    <img alt="LayerZero" style="max-width: 500px" src="https://d3a2dpnnrypp5h.cloudfront.net/bridge-app/lz.png"/>
  </a>
</p>

<h1 align="center">@layerzerolabs/hyperliquid-composer</h1>

<!-- The badges section -->
<p align="center">
  <!-- Shields.io NPM published package version -->
  <a href="https://www.npmjs.com/package/@layerzerolabs/hyperliquid-composer"><img alt="NPM Version" src="https://img.shields.io/npm/v/@layerzerolabs/hyperliquid-composer"/></a>
  <!-- Shields.io NPM downloads -->
  <a href="https://www.npmjs.com/package/@layerzerolabs/hyperliquid-composer"><img alt="Downloads" src="https://img.shields.io/npm/dm/@layerzerolabs/hyperliquid-composer"/></a>
  <!-- Shields.io license badge -->
  <a href="https://www.npmjs.com/package/@layerzerolabs/hyperliquid-composer"><img alt="NPM License" src="https://img.shields.io/npm/l/@layerzerolabs/hyperliquid-composer"/></a>
</p>

## Using the LayerZero Hyperliquid SDK

This SDK provides a complete toolkit for deploying and managing HyperLiquid HIP-1 tokens and connecting them to LayerZero OFTs. Commands are organized by workflow to guide you through the deployment process.

To view all commands, run:

```bash
npx @layerzerolabs/hyperliquid-composer -h
```

## Setup & Environment

### Set Block Size

```bash
npx @layerzerolabs/hyperliquid-composer set-block \
    --size {small | big} \
    --network {testnet | mainnet} \ 
    --private-key $PRIVATE_KEY \
    [--log-level {info | verbose}]
```

## Core Spot Management

### Create/Get Core Spot Metadata

```bash
# Create deployment configuration with optional freeze/quote features
npx @layerzerolabs/hyperliquid-composer core-spot \
    --action create \
    --oapp-config <layerzeroConfigFile> \
    --token-index <coreIndex> \
    --network {testnet | mainnet} \
    [--log-level {info | verbose}]

# Get existing metadata
npx @layerzerolabs/hyperliquid-composer core-spot \ 
    --action get \  
    --token-index <coreIndex> \
    --network {testnet | mainnet} \
    [--log-level {info | verbose}]
```

## HIP-1 Deployment Workflow

Complete the following steps in order to deploy your HIP-1 token:

### 1. Enable Freeze Privilege (Optional)

**Must be done before genesis if you want freeze capability.**

```bash
npx @layerzerolabs/hyperliquid-composer enable-freeze-privilege \
    --token-index <coreIndex> \
    --network {testnet | mainnet} \
    --private-key $PRIVATE_KEY_HYPERLIQUID \
    [--log-level {info | verbose}]
```

### 2. Set User Genesis Allocations

```bash
npx @layerzerolabs/hyperliquid-composer user-genesis \
    --token-index <coreIndex> \ 
    [--action {* | userAndWei | existingTokenAndWei | blacklistUsers}] \
    --network {testnet | mainnet} \ 
    --private-key $PRIVATE_KEY_HYPERLIQUID \ 
    [--log-level {info | verbose}]
```

### 3. Deploy Token with Genesis

```bash
npx @layerzerolabs/hyperliquid-composer set-genesis \
    --token-index <coreIndex> \
    --network {testnet | mainnet} \
    --private-key $PRIVATE_KEY_HYPERLIQUID \ 
    [--log-level {info | verbose}]
```

### 4. Create Spot Deployment

```bash
npx @layerzerolabs/hyperliquid-composer create-spot-deployment \
    --token-index <coreIndex> \
    --network {testnet | mainnet} \
    --private-key $PRIVATE_KEY_HYPERLIQUID \ 
    [--log-level {info | verbose}]
```

### 5. Register Trading Spot

```bash
npx @layerzerolabs/hyperliquid-composer register-spot \
    --token-index <coreIndex> \
    --network {testnet | mainnet} \ 
    --private-key $PRIVATE_KEY_HYPERLIQUID \ 
    [--log-level {info | verbose}]
```

### 6. Enable Quote Token Capability (Optional)

Enables your token to be used as a quote asset for trading pairs. **Requirements must be met** - see: [Hyperliquid API requirements](https://t.me/hyperliquid_api/243)

```bash
npx @layerzerolabs/hyperliquid-composer enable-quote-token \
    --token-index <coreIndex> \
    --network {testnet | mainnet} \
    --private-key $PRIVATE_KEY_HYPERLIQUID \
    [--log-level {info | verbose}]
```

### Optional: Set Trading Fee Share

Can be done at any time after deployment:

```bash
npx @layerzerolabs/hyperliquid-composer trading-fee \
    --token-index <coreIndex> \
    --share <[0%,100%]> \
    --network {testnet | mainnet} \
    --private-key $PRIVATE_KEY_HYPERLIQUID \
    [--log-level {info | verbose}]
```

## EVM-HyperCore Linking

After completing HIP-1 deployment, link your token to a LayerZero OFT:

### 1. Request EVM Contract Link

```bash
npx @layerzerolabs/hyperliquid-composer request-evm-contract \
    --oapp-config <layerzero.config.ts> \
    --token-index <coreIndex> \
    --network {testnet | mainnet} \
    --private-key $PRIVATE_KEY_HYPERLIQUID \
    [--log-level {info | verbose}]
```

### 2. Finalize EVM Contract Link

```bash
npx @layerzerolabs/hyperliquid-composer finalize-evm-contract \
    --oapp-config <layerzero.config.ts> \
    --token-index <coreIndex> \
    --network {testnet | mainnet} \
    --private-key $PRIVATE_KEY_HYPERLIQUID \
    [--log-level {info | verbose}]
```

## Post-Launch Management

### Freeze/Unfreeze Users

Only available if freeze privilege was enabled before genesis:

```bash
# Freeze a user
npx @layerzerolabs/hyperliquid-composer freeze-user \
    --token-index <coreIndex> \
    --user-address <0x...> \
    --freeze true \
    --network {testnet | mainnet} \
    --private-key $PRIVATE_KEY_HYPERLIQUID \
    [--log-level {info | verbose}]

# Unfreeze a user
npx @layerzerolabs/hyperliquid-composer freeze-user \
    --token-index <coreIndex> \
    --user-address <0x...> \
    --freeze false \
    --network {testnet | mainnet} \
    --private-key $PRIVATE_KEY_HYPERLIQUID \
    [--log-level {info | verbose}]
```

### Revoke Freeze Privilege

**Permanently removes freeze capability (irreversible):**

```bash
npx @layerzerolabs/hyperliquid-composer revoke-freeze-privilege \
    --token-index <coreIndex> \
    --network {testnet | mainnet} \
    --private-key $PRIVATE_KEY_HYPERLIQUID \
    [--log-level {info | verbose}]
```

## Info & Queries

### Check Deployment State

```bash
npx @layerzerolabs/hyperliquid-composer spot-deploy-state \
    --token-index <coreIndex> \
    --network {testnet | mainnet} \
    [--deployer-address <0x...>] \
    [--log-level {info | verbose}]
```

### Get Token Information

```bash
npx @layerzerolabs/hyperliquid-composer hip-token \
    --token-index <coreIndex> \
    --network {testnet | mainnet} \
    [--log-level {info | verbose}]
```

### Check Account Activation

```bash
npx @layerzerolabs/hyperliquid-composer is-account-activated \
    --user <0x...> \
    --network {testnet | mainnet} \
    [--log-level {info | verbose}]
```

### Get Core Balances

```bash
npx @layerzerolabs/hyperliquid-composer get-core-balances \ 
    --user <0x...> \
    [--show-zero {false | true}] \ 
    --network {testnet | mainnet} \
    [--log-level {info | verbose}]
```

## Utilities

### Convert Token Index to Bridge Address

```bash
npx @layerzerolabs/hyperliquid-composer to-bridge \
    --token-index <coreIndex> \
    [--log-level {info | verbose}]
```
