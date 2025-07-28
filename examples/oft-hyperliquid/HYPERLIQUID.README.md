# Hyperliquid Composer Readme

This document is an excerpt from the main Hyperliquid internal docs. This document contains 2 sections:

1. Commands the LayerZero Hyperliquid SDK supports
2. Deploy OFT on HyperEVM, deploy a `HIP-1` token, and register it with the OFT

Feel free to checkout our internal docs [here](https://github.com/LayerZero-Labs/devtools/blob/main/packages/hyperliquid-composer/HYPERLIQUID.README.md) to learn more about the `asset bridge address`, `hyperliquid networks`, `accounts`, `token standards`, `multiblock architecture`, and more.

## Using the LayerZero Hyperliquid SDK

The following are just syntax and usage. Explanations are below in the section on "Deploy and Connect your OFT Guide".

To view all commands, run:

```bash
npx @layerzerolabs/hyperliquid-composer -h
```

### Type conversions

#### Get the asset bridge address

```bash
npx @layerzerolabs/hyperliquid-composer to-bridge --token-index <coreIndex>
```

### Reading core spot state

#### List core spot metadata

```bash
npx @layerzerolabs/hyperliquid-composer core-spot \
    --action get \
    --token-index <coreIndex> \
    --network {testnet | mainnet} \
    [--log-level {info | verbose}]
```

#### Get Core Spot balances

```bash
npx @layerzerolabs/hyperliquid-composer get-core-balances \ 
    --user <0x> \
    [--show-zero {false | true}] \ 
    --network {testnet | mainnet} \
    [--log-level {info | verbose}]
```

#### Is account activated?

```bash
npx @layerzerolabs/hyperliquid-composer is-account-activated \
    --user <0x> \
    --network {testnet | mainnet} \
    [--log-level {info | verbose}]
```

#### Create a deployment file

```bash
npx @layerzerolabs/hyperliquid-composer core-spot \
    --action create \
    [--oapp-config <layerzero.config.ts>] \
    --token-index <coreIndex> \
    --network {testnet | mainnet} \
    [--log-level {info | verbose}]
```

#### Get a HIP-1 Token's information

```bash
npx @layerzerolabs/hyperliquid-composer hip-token   \
    --token-index <coreIndex> \
    --network {testnet | mainnet} \
    [--log-level {info | verbose}]
```

#### View a deployment state

```bash
npx @layerzerolabs/hyperliquid-composer spot-deploy-state \
    --token-index <coreIndex> \
    --network {testnet | mainnet} \
    --deployer-address <0x> \
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

#### 1 `userGenesis`

```bash
npx @layerzerolabs/hyperliquid-composer user-genesis \
    --token-index <coreIndex> \
    [--action  {* | userAndWei | existingTokenAndWei | blacklistUsers}]
    --network {testnet | mainnet} \
    --private-key $PRIVATE_KEY_HYPERLIQUID \
    [--log-level {info | verbose}]
```

#### 2 `genesis`

```bash
npx @layerzerolabs/hyperliquid-composer set-genesis \
    --token-index <coreIndex> \
    --network {testnet | mainnet} \
    --private-key $PRIVATE_KEY_HYPERLIQUID \
    [--log-level {info | verbose}]
```

#### 3 `registerSpot`

```bash
npx @layerzerolabs/hyperliquid-composer register-spot \
    --token-index <coreIndex> \
    --network {testnet | mainnet} \
    --private-key $PRIVATE_KEY_HYPERLIQUID \
    [--log-level {info | verbose}]
```

#### 4 `createSpotDeployment`

```bash
npx @layerzerolabs/hyperliquid-composer create-spot-deployment \
    --token-index <coreIndex> \
    --network {testnet | mainnet} \
    --private-key $PRIVATE_KEY_HYPERLIQUID \
    [--log-level {info | verbose}]
```

#### 5 `setDeployerTradingFeeShare`

```bash
npx @layerzerolabs/hyperliquid-composer trading-fee \
    --token-index <coreIndex> \
    --share <[0%,100%]> \
    --network {testnet | mainnet} \
    --private-key $PRIVATE_KEY_HYPERLIQUID \
    [--log-level {info | verbose}]
```

### Linking HyperEVM and HyperCore

#### 1 `requestEvmContract`

```bash
npx @layerzerolabs/hyperliquid-composer request-evm-contract  \
    [--oapp-config <layerzero.config.ts>] \
    --token-index <coreIndex> \
    --network {testnet | mainnet} \
    --log-level verbose \
    --private-key $PRIVATE_KEY_HYPERLIQUID
```

#### 2 `finalizeEvmContract`

```bash
npx @layerzerolabs/hyperliquid-composer finalize-evm-contract  \
    [--oapp-config <layerzero.config.ts>] \
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

> ⚠️ Note: The only case when tokens can be locked in the Composer

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

> ⚠️ REMINDER : HYPERLIQUIDITY IS NOT SUPPORTED

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

### Step 1/6 `Purchase the ticker`

You will have to buy a ticker from the Hyperliquid UI - <https://app.hyperliquid.xyz/deploySpot>

> ⚠️ note: Unless you buy the ticker you will not be able to deploy the Core Spot.

After this we can use the `core-spot create` command to create a new file under `./deployments/hypercore-{testnet | mainnet}` with the name of the Core Spot token index. This is not a Hyperliquid step but rather something to make the deployment process easier. It is crucial to the functioning of the token deployment after which it really is not needed.

```bash
npx @layerzerolabs/hyperliquid-composer core-spot \
    --action create \
    [--oapp-config <layerzero.config.ts>] \
    --token-index <coreIndex> \
    --network {testnet | mainnet} \
    [--log-level {info | verbose}]
```

### Step 2/6 `userGenesis`

This is the part where you set the genesis balances for the deployer and the users. Since `HyperCore` tokens are of uint type `u64` the most tokens possible are `18446744073709551615`.

You will have to edit the deployment created by `core-spot create` command that is under `./deployments/hypercore-{testnet | mainnet}` with the name of the Core Spot token index. It should be populated with the `deployer` and `asset bridge address` with both set to `0 wei`.

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
    --private-key $PRIVATE_KEY_HYPERLIQUID \
    [--log-level {info | verbose}]
```

> ⚠️ Note: There is no limit to the number of time you can re-run this command.

### Step 3/6 `genesis`

This is the step that registers the above genesis balances on `HyperCore`.

> ⚠️ Note: This is irreversible.

```bash
npx @layerzerolabs/hyperliquid-composer set-genesis \
    --token-index <coreIndex> \
    --network {testnet | mainnet} \
    --private-key $PRIVATE_KEY_HYPERLIQUID \
    [--log-level {info | verbose}]
```

### Step 4/6 `registerSpot`

This is the step that registers the Core Spot on `HyperCore` and creates a base-quote pair against `USDC`, which is the only supported quote token as of now.

```bash
npx @layerzerolabs/hyperliquid-composer register-spot \
    --token-index <CoreIndex> \
    --network {testnet | mainnet} \
    --private-key $PRIVATE_KEY_HYPERLIQUID \
    [--log-level {info | verbose}]
```

Your Core Spot (that does not use Hyperliquidity) has now been deployed and registered on `HyperCore`.
The following command will return a json object with your newly deployed Core Spot token details.

```bash
curl -X POST "https://api.hyperliquid.xyz/info" \
     -H "Content-Type: application/json" \
     -d '{ "type": "tokenDetails", "tokenId": "<YOUR_TOKEN_ID>"}'
```

> ⚠️ Note: The next 2 commands can be executed at a later time. It is possible to go directly to the token linking step.

### Step 5/6 `createSpotDeployment`

This is the step that creates a spot deployment without hyperliquidity. This step is meant for tokens deployed with Hyperliquidity but is also required for tokens deployed without Hyperliquidity to be listed on Spot trading, as such the values for `startPx` and `orderSz` are not required as they are set by the market and the value set does not matter. The value for `nOrders` however MUST be 0 as we do not support Hyperliquidity - <https://github.com/hyperliquid-dex/hyperliquid-python-sdk/blob/master/examples/spot_deploy.py#L97-L104>

You will NOT be prompted for the following and instead the values will be set to 0:

- startPx - The starting price. (1)
- orderSz - The size of each order (float, not wei) (0)
- nOrders - The number of orders the deployer wishes to seed with usdc instead of tokens. (0)
- nSeededLevels - The number of levels the deployer wishes to seed with usdc instead of tokens. (0)

> ⚠️ Note: This step can be executed after deployment

```bash
npx @layerzerolabs/hyperliquid-composer create-spot-deployment \
    --token-index <coreIndex> \
    --network {testnet | mainnet} \
    --private-key $PRIVATE_KEY_HYPERLIQUID \
    [--log-level {info | verbose}]
```

> ⚠️ Note: `spot-deploy-state` should fail after completing this step.

### Step 6/6 `setDeployerTradingFeeShare`

This is the step where you set the trading fee share for the deployer. It can be in the range of `[0%,100%]`.

A deployer fee share <https://hyperliquid.gitbook.io/hyperliquid-docs/trading/fees> is claimed per transaction on HyperCore. Half of the base rate (50%) is allocated as the deployer fee share. The deployer can choose to forgo this fee share by setting the share to `0%`. This causes the deployer's fee share part to be burnt. If it were to be set to `100%`, the deployer would receive the full fee share part of the fee.

> ⚠️ Note: The trading fee can be reset as long as the new share is lower than the previous share.
> ⚠️ Note: This step can also be run after the core spot is deployed.

```bash
npx @layerzerolabs/hyperliquid-composer trading-fee \
    --token-index <coreIndex> \
    --share <[0%,100%]> \
    --network {testnet | mainnet} \
    --private-key $PRIVATE_KEY_HYPERLIQUID \
    [--log-level {info | verbose}]
```

## Connect the OFT to the deployed Core Spot

If you have run the above steps then you can use `--oapp-config` in the following commands. If not do not worry! Our SDK will prompt you for the OFT address and the OFT deployed transaction hash (we need the deployment nonce).

In order to enable transfers between the OFT and the Core Spot, we need to connect the OFT to the Core Spot. This is done in two steps:

### Step 1/2 `requestEvmContract`

This step is issued by the Core Spot deployer and populates in `HyperCore` that a request has been made for the mentioned Core Spot to be connected to the ERC20 deployed at the mentioned ERC20 address.

> ⚠️ Note: This step can be issued multiple times until the `finalizeEvmContract` step is issued.

```bash
npx @layerzerolabs/hyperliquid-composer request-evm-contract  \
    [--oapp-config <layerzero.config.ts>] \
    --token-index <coreIndex> \
    --network {testnet | mainnet} \
    --log-level verbose \
    --private-key $PRIVATE_KEY_HYPERLIQUID
```

### Step 2/2 `finalizeEvmContract`

This step completes the connection between the OFT and the Core Spot. It pulls either HyperEVM testnet or mainnet address from the LayerZero config file based on the `eid` and the Core Spot information from the HyperCore deployment.

> ⚠️ Note: This step is the final step and can only be issued once.

```bash
npx @layerzerolabs/hyperliquid-composer finalize-evm-contract  \
    [--oapp-config <layerzero.config.ts>] \
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

> ⚠️ Note: You would need to fund the composer's address with HyperCore with at least $1 in USDC or HYPE so that it can perform L1WriteActions through it's address.
