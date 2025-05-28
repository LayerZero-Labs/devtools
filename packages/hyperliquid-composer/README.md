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

The following are just syntax and usage. Explanations are below in the section on "Deploy and Connect your OFT Guide".

To view all commands, run:
```bash
npx @layerzerolabs/hyperliquid-composer -h
```

### Reading Core Spot state

#### List Core Spot metadata

```bash
npx @layerzerolabs/hyperliquid-composer core-spot \ 
    --action get \  
    --token-index <coreIndex> \
    --network {testnet | mainnet} \
    [--log-level {info | verbose}]
```

#### Create a deployment file

```bash
npx @layerzerolabs/hyperliquid-composer core-spot \
    --action create \
    --oapp-config <layerzeroConfigFile> \
    --token-index <coreIndex> \
    --network {testnet | mainnet} \
    [--log-level {info | verbose}]
```

### Switching Blocks (`evmUserModify`)

PR : <https://github.com/LayerZero-Labs/devtools/pull/1417>

```bash
npx @layerzerolabs/hyperliquid-composer set-block \
    --size {small | big} \
    --network {testnet | mainnet} \ 
    --private-key $PRIVATE_KEY \
    [--log-level {info | verbose}]
```

### Deploying a CoreSpot (`spotDeploy`)

PR : <https://github.com/LayerZero-Labs/devtools/pull/1441>

#### 1 `setDeployerTradingFeeShare`

```bash
npx @layerzerolabs/hyperliquid-composer trading-fee \
    --token-index <coreIndex> \
    --share <[0%,100%]> \
    --network {testnet | mainnet} \
    --private-key $PRIVATE_KEY_HYPERLIQUID \
    [--log-level {info | verbose}]
```

#### 2 `userGenesis`

```bash
npx @layerzerolabs/hyperliquid-composer user-genesis \
    --token-index <coreIndex> \ 
    [--action  {* | userAndWei | existingTokenAndWei | blacklistUsers}]
    --network {testnet | mainnet} \ 
    --private-key $PRIVATE_KEY_HYPERLIQUID \ 
    [--log-level {info | verbose}]
```

#### 3 `genesis`

```bash
npx @layerzerolabs/hyperliquid-composer set-genesis \
    --token-index <coreIndex> \
    --network {testnet | mainnet} \
    --private-key $PRIVATE_KEY_HYPERLIQUID \ 
    [--log-level {info | verbose}]
```

#### 4 `registerSpot`

```bash
npx @layerzerolabs/hyperliquid-composer register-spot \
    --token-index <coreIndex> \
    --network {testnet | mainnet} \ 
    --private-key $PRIVATE_KEY_HYPERLIQUID \ 
    [--log-level {info | verbose}]
```

### Linking HyperEVM and HyperCore

#### 1 `requestEvmContract`

```bash
npx @layerzerolabs/hyperliquid-composer request-evm-contract  \
    --oapp-config <layerzero.config.ts> \
    --token-index <coreIndex> \
    --network {testnet | mainnet} \
    --log-level verbose \
    --private-key $PRIVATE_KEY_HYPERLIQUID
```

#### 2 `finalizeEvmContract`

```bash
npx @layerzerolabs/hyperliquid-composer finalize-evm-contract  \
    --oapp-config <layerzero.config.ts> \
    --token-index <coreIndex> \
    --network {testnet | mainnet} \
    --log-level verbose \
    --private-key $PRIVATE_KEY_HYPERLIQUID
```
