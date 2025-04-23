# Hyperliquid Composer Readme

This document is an excerpt from the main Hyperliquid internal docs. This document contains 2 sections:

1. Commands the LayerZero Hyperliquid SDK supports
2. Deploy OFT on HyperEVM, deploy a `HIP-1` token, and register it with the OFT

Feel free to checkout our internal docs [here](https://github.com/LayerZero-Labs/devtools/blob/main/packages/hyperliquid-composer/HYPERLIQUID.README.md) to learn more about the `asset bridge address`, `hyperliquid networks`, `accounts`, `token standards`, `multiblock architecture`, and more.

## Using the LayerZero Hyperliquid SDK

### Reading core spot state

#### List core spot metadata

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
    -private-key $PRIVATE_KEY_HYPERLIQUID \ 
    [--log-level {info | verbose}]
```

#### 3 `genesis`

```bash
npx @layerzerolabs/hyperliquid-composer set-genesis \
    --token-index <coreIndex> \
    --network {testnet | mainnet} \
    -private-key $PRIVATE_KEY_HYPERLIQUID \ 
    [--log-level {info | verbose}]
```

#### 4 `registerSpot`

```bash
npx @layerzerolabs/hyperliquid-composer register-spot \
    --token-index <coreIndex> \
    --network {testnet | mainnet} \ 
    -private-key $PRIVATE_KEY_HYPERLIQUID \ 
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

## Deploy and Connect your OFT Guide

### Make changes to the underlying OFT (if you want to)

The current architecture has certain error handling AND checks (because hyperliquid does not have any) to prevent tokens from locking up in the contract or at the asset bridge address, and you can change any of these behaviors.

#### Transfer exceeding u64.max

HyperCore's spot send only allows for a maximum of `u64` tokens to be transferred across. This means (in the unlikely event) that the user sends across greater than `u64` the difference would be returned the the `receiver` address on `HyperEVM`.

#### Transfer exceeding HyperCore Bridge Capactiy

HyperCore's core spots support a maximum of `u64` tokens on the core spot, and this is scaled by the decimal difference between the core spot and the evm spot. It is thus possible that the asset bridge on hypercore has been consumed to the point where the entire transfer can't be sent over. In this event we split the `amount` capping it by `amount * 10.pow(ERC20.decimals() - HyperCore.decimals())` which is the maximum possible core spot tokens that can be consumed at the bridge at any given instant and compute the difference between the computed max core amount converted to evm amount (unscaling) and removing that from the incoming evm amount. We now have `dust` which is the difference between the two and return this to the `receiver` address.

#### Malformed `composeMsg` - unable to abi.decode(composeMsg) into address

The above cases only occur in the stae when the compose payload is valid. In the event that developers write their own front end or try to interact with the composer with their own encoding and aren't careful it is possible that the message contains a `composeMsg` that can not be decoded to an `address`, as such we do not have the `receiver` address. In this event we try returning the tokens to the `sender` on HyperEVM where the sender is the `msg.sender` of the layerzero tx on the source chain.

#### Malformed `composeMsg` - unable to abi.decode(composeMsg) into address and non-evm sender

> Note: The only case when tokens can be locked in the Composer

Building on the afore mentioned case, it is possible that the compose transaction comes from `Solana` or a `move` language network that uses a different system of addresses. As such we can't return funds to that address on `HyperEVM` - in an ideal world we can have a composer that returns tokens to the sending network but that would consume more gas (doubling the transaction) and since gas paid is non refundable it would simply be wasted.

### Deploy your OFTs

The [oft deploy script](https://github.com/LayerZero-Labs/devtools/blob/feat/oft-hyperliquid-no-hop/examples/oft-hyperliquid/deploy/MyHyperliquidOFT.ts) is configured with a `hardhat-deploy` tag `MyHyperLiquidOFT`, this is renameable.

Since deploying contracts on HyperEVM needs big blocks, we need to submit an `L1Action`, the deploy script does this when the chainId matches those of HyperEVM testnet (998) or mainnet (999). Since this `action` is sent to `HyperCore` it requires an active `HyperCore` account - which you can do by funding the account with $1 of `HYPE` or `USDC` on `HyperCore`. If you do not do this you will get an error similar to:

```bash
L1 error: User or API Wallet <public key> does not exist.
```

Now wire your contracts:

`npx hardhat lz:deploy --tags MyHyperLiquidOFT`

## Wire your contracts

Wire the OFTs together with the standard layerzero wire command (or any other way you prefer doing it)

```bash
npx hardhat lz:oapp:wire --oapp-config <layerzero.config.ts>
```

 Test the OFTs qith `quoteSend()` or by sending a test lzTransaction across the networks.

## Deploy the Core Spot

> REMINDER : HYPERLIQUIDITY IS NOT SUPPORTED

Open <https://app.hyperliquid-testnet.xyz/deploySpot> in a tab so that you can monitor the difference in steps. Or you can use:

```bash
curl -X POST "https://api.hyperliquid-testnet.xyz/info" \
     -H "Content-Type: application/json" \
     -d '{
       "type": "spotDeployState",
       "user": "<YOUR_ADDRESS>"
     }'
```

This will return a json object with the current state of the spot deployment.
(building a sdk wrapper around this is on our roadmap)

### Step 0 `core-spot create`

This will create a new file under `./deployments/hypercore-{testnet | mainnet}` with the name of the core spot token index. This is not a hyperliquid step but rather something to make the deployment process easier. It is crucial to the functioning of the token deployment after which it really is not needed.

```bash
npx @layerzerolabs/hyperliquid-composer core-spot \
    --action create \
    --oapp-config <layerzero.config.ts> \
    --token-index <coreIndex> \
    --network {testnet | mainnet} \
    [--log-level {info | verbose}]
```

### Step 1/4 `setDeployerTradingFeeShare`

This is the step where you set the trading fee share for the deployer. It can be in the range of `[0%,100%]`.
> Note: The trading fee can be reset as long as the new share is lower than the previous share.

```bash
npx @layerzerolabs/hyperliquid-composer trading-fee \
    --token-index <coreIndex> \
    --share <[0%,100%]> \
    --network {testnet | mainnet} \
    --private-key $PRIVATE_KEY_HYPERLIQUID \
    [--log-level {info | verbose}]
```

### Step 2/4 `userGenesis`

This is the part where you set the genesis balances for the deployer and the users. Since `HyperCore` tokens are of uint type `u64` the most tokens possible are `18446744073709551615`.

You will have to edit the deployment created by `core-spot create` command that is under `./deployments/hypercore-{testnet | mainnet}` with the name of the core spot token index. It should be populated with the `deployer` and `asset bridge address` with both set to `0 wei`.

You can then use the `user-genesis` command to set the genesis balances for the deployer and the users.

If you aren't using `existingTokenAndWei` or `userAndWei` you will need to remove the contents of it making it:
Example:

```json
"existingTokenAndWei": [
    {
        "token": 0,
        "wei": ""
    }
],
```

into

```json
"existingTokenAndWei": []
```

Otherwise you run into the error:

```bash
Error deploying spot: missing token max_supply
```

```bash
npx @layerzerolabs/hyperliquid-composer user-genesis \
    --token-index <coreIndex> \
    [--action  {* | userAndWei | existingTokenAndWei | blacklistUsers}]
    --network {testnet | mainnet} \ 
    -private-key $PRIVATE_KEY_HYPERLIQUID \ 
    [--log-level {info | verbose}]
```

> Note: There is no limit to the number of time you can re-run this command.

### Step 3/4 `genesis`

This is the step that registers the above genesis balances on `HyperCore`.
> Note: This is irreversible.

```bash
npx @layerzerolabs/hyperliquid-composer set-genesis \
    --token-index <coreIndex> \
    --network {testnet | mainnet} \
    -private-key $PRIVATE_KEY_HYPERLIQUID \ 
    [--log-level {info | verbose}]
```

### Step 4/4 `registerSpot`

This is the step that registers the core spot on `HyperCore` and creates a base-quote pair against `USDC`, which is the only supported quote token as of now.

```bash
npx @layerzerolabs/hyperliquid-composer register-spot \
    --token-index <coreIndex> \
    --network {testnet | mainnet} \ 
    -private-key $PRIVATE_KEY_HYPERLIQUID \ 
```

Your core spot (that does not use hyperliquidity) has now been deployed and registered on `HyperCore`.
The following command will return a json object with your newly deployed core spot token details.

```bash
curl -X POST "https://api.hyperliquid.xyz/info" \
     -H "Content-Type: application/json" \
     -d '{ "type": "tokenDetails", "tokenId": "<YOUR_TOKEN_ID>"}'
```

## Connect the OFT to the deployed Core Spot

In order to enable transfers between the OFT and the core spot, we need to connect the OFT to the core spot. This is done in two steps:

### Step 1/2 `requestEvmContract`

This step is issued by the core spot deployer and populates in `HyperCore` that a request has been made for the mentioned Core Spot to be connected to the ERC20 deployed at the mentioned erc20 address.
> Note: This step can be issued multiple times until the `finalizeEvmContract` step is issued.

```bash
npx @layerzerolabs/hyperliquid-composer request-evm-contract  \
    --oapp-config <layerzero.config.ts> \
    --token-index <coreIndex> \
    --network {testnet | mainnet} \
    --log-level verbose \
    --private-key $PRIVATE_KEY_HYPERLIQUID
```

### Step 2/2 `finalizeEvmContract`

This step completes the connection between the OFT and the core spot. It pulls either hyperevm testnet or mainnet address from the layerzero config file based on the `eid` and the core spot information from the hypercore deployment.
> Note: This step is the final step and can only be issued once.

```bash
npx @layerzerolabs/hyperliquid-composer finalize-evm-contract  \
    --oapp-config <layerzero.config.ts> \
    --token-index <coreIndex> \
    --network {testnet | mainnet} \
    --log-level verbose \
    --private-key $PRIVATE_KEY_HYPERLIQUID
```

## Deploy the Composer

While the composer could have been deployed at any point in time due to its statelessness, it is technically the final step of the deployment process. The following script automatically handles the block switching for you.

```bash
npx hardhat lz:deploy --tags MyHyperLiquidComposer
```

## Sending tokens from x-network to HyperEVM/Core

After populating your `.env` you can run the following script to send tokens across. Having the second argument `gas > 0` will send the tokens into `HyperCore`. Setting the third argument `value > 0` will also fund the user's address with `HYPE` tokens on `HyperCore`.

```bash
forge script script/SendScript.s.sol --private-key $PRIVATE_KEY --rpc-url $RPC_URL_BSC_TESTNET --sig "exec(uint256,uint128,uint128)" <oft-amount> <composer-gas> <composer-value> --broadcast
```
