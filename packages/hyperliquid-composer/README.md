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

### 4. Register Trading Spot

```bash
npx @layerzerolabs/hyperliquid-composer register-spot \
    --token-index <coreIndex> \
    --network {testnet | mainnet} \
    --private-key $PRIVATE_KEY_HYPERLIQUID \
    [--log-level {info | verbose}]
```

### 5. Create Spot Deployment

```bash
npx @layerzerolabs/hyperliquid-composer create-spot-deployment \
    --token-index <coreIndex> \
    --network {testnet | mainnet} \
    --private-key $PRIVATE_KEY_HYPERLIQUID \
    [--log-level {info | verbose}]
```

### 6. Set Trading Fee Share (Optional)

Can be done at any time after deployment. **Note:** If you plan to enable quote token capability, read the [Permissionless Spot Quote Assets](https://hyperliquid.gitbook.io/hyperliquid-docs/hypercore/permissionless-spot-quote-assets) documentation before setting this value.

```bash
npx @layerzerolabs/hyperliquid-composer trading-fee \
    --token-index <coreIndex> \
    --share <[0%,100%]> \
    --network {testnet | mainnet} \
    --private-key $PRIVATE_KEY_HYPERLIQUID \
    [--log-level {info | verbose}]
```

### 7. Enable Quote Token Capability (Optional)

Enables your token to be used as a quote asset for trading pairs.

> ⚠️ **Important**: Review the complete [Quote Assets (Fee Tokens)](./HYPERLIQUID.README.md#quote-assets-fee-tokens) section for:
> - Mainnet requirements (technical and liquidity)
> - Testnet requirements (50 HYPE stake + active order book)
> - Order book maintenance for `HYPE/YOUR_ASSET` pair
> - Composer selection guidance (use `FeeToken` variant for quote assets)

**Dependency:** Requires trading fee share configuration (see Step 6 above).

```bash
npx @layerzerolabs/hyperliquid-composer enable-quote-token \
    --token-index <coreIndex> \
    --network {testnet | mainnet} \
    --private-key $PRIVATE_KEY_HYPERLIQUID \
    [--log-level {info | verbose}]
```

### 8. Enable Aligned Quote Token Capability (Optional)

Enables your token to be used as an aligned quote asset for trading pairs. Aligned quote tokens have special properties and requirements. See: [Aligned Quote Assets](https://hyperliquid.gitbook.io/hyperliquid-docs/hypercore/aligned-quote-assets)

```bash
npx @layerzerolabs/hyperliquid-composer enable-aligned-quote-token \
    --token-index <coreIndex> \
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

**Alternative: Using CoreWriter directly with Foundry**

If you prefer to use Foundry's `cast` command, you can generate the calldata and send the transaction directly:

```bash
npx @layerzerolabs/hyperliquid-composer finalize-evm-contract-corewriter \
    --token-index <coreIndex> \
    --nonce <deployment-nonce> \
    --network {testnet | mainnet}
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

### List Spot Trading Pairs

```bash
npx @layerzerolabs/hyperliquid-composer list-spot-pairs \
    --token-index <coreIndex> \
    --network {testnet | mainnet} \
    [--log-level {info | verbose}]
```

### Check Spot Auction Status

```bash
npx @layerzerolabs/hyperliquid-composer spot-auction-status \
    --network {testnet | mainnet} \
    [--log-level {info | verbose}]
```

### Check if Token is Quote Asset

Check if a specific token is a quote asset, or list all quote assets when no token index is provided.

```bash
# List all quote assets
npx @layerzerolabs/hyperliquid-composer list-quote-asset \
    --network {testnet | mainnet} \
    [--log-level {info | verbose}]

# Check if specific token is a quote asset
npx @layerzerolabs/hyperliquid-composer list-quote-asset \
    --filter-token-index <coreIndex> \
    --network {testnet | mainnet} \
    [--log-level {info | verbose}]
```

The command returns `yes` or `no` when checking a specific token, or lists all quote assets when no token index is provided.

## Utilities

### Convert Token Index to Bridge Address

```bash
npx @layerzerolabs/hyperliquid-composer to-bridge \
    --token-index <coreIndex> \
    [--log-level {info | verbose}]
```

## Advanced: Creating Custom Scripts

You can create your own custom scripts using the `HyperliquidClient` directly. This is useful for actions not covered by the CLI or for building custom automation.

### Example: Custom Action Script

```typescript
import { HyperliquidClient } from '@layerzerolabs/hyperliquid-composer'
import { Wallet } from 'ethers'

async function customAction() {
    // Initialize wallet
    const wallet = new Wallet(process.env.PRIVATE_KEY!)
    
    // Create client (testnet or mainnet)
    const isTestnet = true
    const logLevel = 'info'
    const hyperliquidClient = new HyperliquidClient(isTestnet, logLevel)
    
    // Define your action
    const action = {
        type: 'spotDeploy',
        enableAlignedQuoteToken: {
            token: 1234, // your token index
        },
    }
    
    // Submit the action
    const response = await hyperliquidClient.submitHyperliquidAction(
        '/exchange',
        wallet,
        action
    )
    
    console.log('Response:', response)
}

customAction()
```

### Available Action Types

Refer to the [Hyperliquid API documentation](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api) for all available action types and their parameters. The SDK supports any valid HyperCore action through `submitHyperliquidAction`.


