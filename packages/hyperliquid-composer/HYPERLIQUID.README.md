# Hyperliquid Composer Implementation

We first start this document by talking about Hyperliquid, its quirks and what we had to do to achieve an `X-network` -> `HyperCore` token transfer.

## Hyperliquid Networks

Hyperliquid consists of an `EVM` named `HyperEVM` and a `L1-exchange` called `HyperCore`. These networks function together under the same `HyperBFT` consensus to act as a singular network.

HyperCore, or Core, is a high-performance Layer 1 which manages the Hyperliquid exchange’s on-chain perpetual futures and spot order books with a single-block finality. ​

HyperEVM, or EVM, is an Ethereum Virtual Machine (EVM)-compatible environment that allows developers to build decentralized applications (dApps).

The `EVM` has precompiles that let you interact with `HyperCore`. `HyperCore` is where spot and perp trading happens (and is probably why you are interested in going to Hyperliquid and reading this doc. If you are not listing on HyperCore then HyperEVM is your almost standard EVM network - you just need to switch block sizes to `big/slow` when deploying your contract and then switch back to `small/fast`).

You can interact with `HyperEVM` via traditional `eth_` rpc calls - full list [here](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/evm/json-rpc).

`HyperCore` operates with domain specific calls named `L1 actions` or `actions` - full list [here](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/exchange-endpoint).

`HyperEVM` and `HyperCore` have their own block explorers. A list of explorers is [here](https://hyperliquid-co.gitbook.io/community-docs/community-and-projects/ecosystem-projects/tools). I personally use hypurrscan for `HyperCore` - <https://testnet.hypurrscan.io> and for `HyperEVM` I use purrsec - <https://testnet.purrsec.com>, and `HyperEVMScan` - <https://hyperevmscan.io> for mainnet.

### Hyperliquid API

Hyperliquid supports several API functions that users can use on HyperCore to query information, following is an example.

```bash
curl -X POST https://api.hyperliquid-testnet.xyz/info \
  -H "Content-Type: application/json" \
  -d '{"type": "spotMeta"}'
```

This will give you the spot meta data for HyperCore. (this is an example)

```json
{
  "universe": [
    {
      "name": "ALICE",
      "szDecimals": 0,
      "weiDecimals": 6,
      "index": 1231,
      "tokenId": "0x503e1e612424896ec6e7a02c7350c963",
      "isCanonical": false,
      "evmContract": null,
      "fullName": null,
      "deployerTradingFeeShare": "1.0"
    }
  ]
}
```

`tokenId` is the address of the token on HyperCore.
`evmContract` is the address of the `ERC20` token on HyperEVM.
`deployerTradingFeeShare` is the fee share for the deployer of the token.

### HyperCore Actions

An action as defined by Hyperliquid is a transaction that is sent to the `HyperCore` - as it updates state on the `HyperCore` it needs to be a signed transaction from the wallet of the action sender.

You need to use `ethers-v6` to sign actions - <https://docs.ethers.org/v6/api/providers/#Signer-signTypedData> - the in-house sdk `@layerzerolabs/hyperliquid-composer` handles all of this this and is usable out of the box

```bash
# add ethers-v6 to your project as an alias for ethers@^6.13.5
pnpm add ethers-v6@npm:ethers@^6.13.5
```

```ts
import { Wallet } from "ethers"; // ethers-v5 wallet
import { Wallet as ethersV6Wallet } from "ethers-v6"; // ethers-v6 wallet

const signerv6 = new ethersV6Wallet(wallet.privateKey); // where wallet is an ethers.Wallet from ethers-v5
const signature = await signerv6.signTypedData(domain, types, message);
```

This is because in ethers-v5 EIP-712 signing is not stable. - <https://docs.ethers.org/v5/api/signer/#Signer-signTypedData>

> Experimental feature (this method name will change)
> This is still an experimental feature. If using it, please specify the exact version of ethers you are using (e.g. specify "5.0.18", not "^5.0.18") as the method name will be renamed from \_signTypedData to signTypedData once it has been used in the field a bit.

You can use the official `Hyperliquid Python SDK` linked [here](https://github.com/hyperliquid-dex/hyperliquid-python-sdk) to interact with HyperCore. We also built an in-house minimal typescript SDK that focuses on switching blocks, deploying the HyperCore token, and connecting the HyperCore token to a HyperEVM ERC20 (oft). This SDK also supports features like checking a deployment state, core spot information, coreAccount active, and core spot balances of a user.

## Accounts

You can use the same account on `HyperEVM` and `HyperCore`, this is because `HyperCore` uses signed ethereum transactions to validate payload data.

All EVM addresses exist on HyperCore but all HyperCore addresses do not exist on HyperEVM. Ex: CoreSpots have a 16-byte address and therefore do not exist on HyperEVM but your EOA, Multisigs, contracts, etc exist on hypercore (once activated).]

> ⚠️ Note: If you are using a contract to receive funds on HyperCore, you need to have a way to submit CoreWriter operations from that address in order to send tokens around on hypercore.

Accounts are activated on hypercore by sending any number of tokens to that account AND paying a `1 USD-stable coin fee` - this fee is paid out of the sender's balance ONTOP of the sent amount and is paid in `USDC` and `USDT0`. This means that if you were sending `0.00001 HYPE` on HyperCore to a new user you also NEED to have at least 1 whole token of `USDC` or `USDT0` to pay for the activation.

We call these special tokens `FeeTokens` or [quoteTokens](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/activation-gas-fee).

> While USDC and USDT0 are not always worth $1 USD and can fluctuate around by a millionth of a cent. HyperCore ALWAYS takes 1 full token.

## Multi Block Architecture

Since `HyperEVM` and `HyperCore` are seperate entities they have their own blocks. `Hyperliquid` interleaves the EVM and Core blocks in order of which they are created.

`HyperEVM` has 2 blocks - "small blocks" that are designed for increased throughput and therefore have a quick block time and have a lower max gas limit - 1 second and 2M gas (this is the default blocktype) - these blocks are meant for transactions that update state and not really for deploying contracts. While you can deploy contracts that consume lower than 2M gas (OFTs are larger than 2M) you would need "big blocks" that allow for a larger gas limit (30M gas) at the tradeoff of there only being 1 block per minute.

They are both EVM blocks and you can toggle between them by sending an L1 action of type `evmUserModify` which is what [this block toggler does](https://hyperevm-block-toggle.vercel.app/)

```json
{ "type": "evmUserModify", "usingBigBlocks": true }
```

You can also use `bigBlockGasPrice` instead of `gasPrice` in your transactions.

> ⚠️ Note: This flags the user as using big blocks and all subsequent transactions on HyperEVM will be of type big block. You can toggle this flag on and off.

`HyperCore` has its own blocks which results in 3 different blocks. As Core and EVM blocks are produced at differing speeds with HyperCore creating more than HyperEVM the blocks created are not `[EVM]-[Core]-[EVM]` but rather something like:

```txt
[Core]-[Core]-[EVM-small]-[Core]-[Core]-[EVM-small]-[Core]-[EVM-large]-[Core]-[EVM-small]
```

## Precompiles and System Contracts

There are 2 ways in which Hyperliquid uses precompiles - "System Contracts" and "L1ActionPrecompiles"

The system contracts are:

- `0x2222222222222222222222222222222222222222` is the system contract address for the `HYPE` token
- `0x200000000000000000000000000000000000abcd` is the system contract address for a created Core Spot token
- `0x3333333333333333333333333333333333333333` is the `CoreWriter` and is used to send transactions to HyperCore.

and `L1ActionPrecompiles`

- `0x0000000000000000000000000000000000000801` is one of the many `L1Read` precompiles.

More `L1ActionPrecompiles` found [here](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/hyperevm/interacting-with-hypercore).

`L1Read` reads from the last produced `HyperCore` block at the time of EVM-transaction execution. Similarly `CoreWriter` writes to the first produced `HyperCore` block after the production of the EVM-block.

## Token Standards

Tokens on the `EVM` are `ERC20` (EVM Spot) and on `HyperCore` are `HIP-1` (Core Spot).

Projects willing to buy a Core Spot need to undergo a 31 hour dutch auction to secure a core spot index after which they need to deploy the core spot - setting its configuration, genesis balances, token information, etc.

Note: if you use the [Hyperliquid UI](https://app.hyperliquid.xyz/deploySpot) you are forced to use an optional Hyperliquid token bootstrap thing called "Hyperliquidity". This is not supported by LayerZero because it ends up in a state where the asset bridge address can not be collaterized. More on this later in the document.

Hyperliquid UI also forces you to use a weiDecimal in range of [0,8], via the API you can go till 15 decimals.

You can skip hyperliquidity by using their API to deploy the core spot - we built an SDK <https://github.com/LayerZero-Labs/devtools/pull/1441> which lets you use scripts (listed in the PR description) to set trading fee share, trigger user genesis, token genesis, and register a trading spot with USDC.

The Core Spot then needs to be connected to the EVM Spot (ERC20) - which is an irreversible process - described [here](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/hyperevm/hypercore-less-than-greater-than-hyperevm-transfers#linking-Core-and-evm-spot-assets), we also have a SDK that lets you do this <https://github.com/LayerZero-Labs/devtools/pull/1432>

If you do not link the `EVM spot` and `Core spot` then no `asset bridge` is formed and users cannot bridge the tokens between `HyperEVM` and `HyperCore` (bi-directional).

In order to connect the two assets and create the asset bridge there are 2 actions that need to be performed:

1. `requestEvmContract` - initiated by the HyperCore deployer and populates the intention to link the HIP-1 to the ERC20.
2. `finalizeEvmContract` - intiated by the HyperEVM deployer when an `EOA` sends the transactions to confirm the link.

This creates the asset bridge precompile `0x2000...abcd` (where `abcd` is the `coreIndexId` of the HIP-1 in hex) to send tokens between HyperEVM and HyperCore.

> ⚠️ **Setup Guidance**: Configure your core spot decimals to ensure your HyperCore bridge balance can handle your EVM token's total supply when scaled to EVM decimals. You can reduce your core spot decimals if needed to maintain consistent bridging performance across all scenarios.
>
> ⚠️ **Setup Guidance**: CoreDecimals - EVMDecimals must be within [-2,18] is a requirement for the hyperliquid protocol

## The Asset Bridge

Transactions can be sent to the asset bridge address `0x2000...abcd` (where `abcd` is the `coreIndexId` of the HIP-1 in hex) to send tokens between HyperEVM and HyperCore. This bridge is formed after the token linking step, until then the bridge does not exist.

The asset bridge address is computed by `0x2000000000000000000000000000000000000000` + the `coreIndexId` of the HIP-1 (in hex) - you can checkout `HyperLiquidComposerCodec.into_assetBridgeAddress()` in the `HyperLiquidComposer` contract to see how this is done - code found [here](contracts/library/HyperLiquidComposerCodec.sol).

HyperCore to HyperEVM is done via the action `spotSend`, or via the front end, with the destination address being the asset bridge address.

This bridge is crucial to the interop between `HyperEVM` and `HyperCore` and it behaves like a lockbox - unlocking tokens on the other side of the bridge where tokens are unlocked.

> ⚠️ Note : There are no checks in the system that checks asset bridge values before trying to transfer between `HyperCore` and `HyperEVM`.

Since this bridge behaves like a lockbox, this means that the other side of the bridge must always have enough tokens as defined in the transaction at the other end so that tokens can be passed. For tokens to be sent into `HyperCore` the contract deployer needs to mint the maximum supply (`u64.max` via the API which isn't the same as the UI due to `Hyperliquidity`) to either the token's asset bridge address or to their deployer account and later transfer it to the asset bridge address. The following invariant should hold at all times `(assetBridgeBalance.hypercore >= assetBridgeBalance.hyperevm when scaled`) - the composer handles cases when this might not be held and when encountered gives the user their tokens on hyperevm instead.

The asset bridge address is denoted as `[EVM | Core]`

This causes a transition in the bridge balances `[0 | 0]` -> `[0 | X]`.
Now users can send across the equivalent tokens that consumes `X` on `HyperCore` - let us assume that the decimal difference between EVM and Core is 10 => 1e10 EVM = 1 Core

This means that `X*1e10` tokens can be sent into the bridge on the EVM side and this would consume all `X` tokens on `HyperCore`

`[0 | X] --EVM(X*1e10)-> [X*1e10 | 0]`

It should be noted that any more tokens sent to the EVM bridge will remain in the asset bridge address and not transfer any tokens on `HyperCore` (the same applies for `HyperCore` -> `HyperEVM`) due to Hyperliquid NOT having ANY checks and the tokens will be locked in the asset bridge address FOREVER. The Composer contract has checks in place that refunds the `receivers` address on `HyperEVM` should it encounter a case of bridge consumption.

This is also why you can't "partially fund" the HyperCore system address. If you mint tokens to an address you control and fund HyperCore's asset bridge address with a subset of it `[0 | X.Core]`, these tokens would be consumed by users locking in their HyperEVM tokens to obtain HyperCore tokens, and now lets say that all `X` tokens on HyperCore have been consumed and you end in a state `[X.EVM | 0]`. You then fund it with `X.Core` more tokens hoping to make it `[X.EVM | X.Core]` -- except you can't do this as it will cause a withdraw on the `X.EVM`resulting in `[0 | X.Core]` with `X.Core` more tokens in circulation on HyperCore that can't be withdrawn.

Homework to the reader:

1. Based on the above understanding of the asset bridge address can you figure out why `Hyperliquidity` breaks the bridge? (hint: it messes with collaterization)
2. If you engage with partial funding and let's say you start with 100 Core tokens at your deployer address and you have intiated the bridge with:
   a) 30 Core tokens
   b) 70 Core tokens
   And these initial tokens are consumed by the users on HyperEVM. Is there a way you can fund the bridge on HyperCore with your remaining tokens?
   (hint 1: only one of them can)
   (hint 2: try failing the transaction on purpose)

## HyperEVM <> HyperCore Communication

HyperEVM can read state from HyperCore via `precompiles` - such as perps positions.
HyperEVM can send state to HyperCore through `events` at certain `precompile` addresses AND by transferring tokens through the asset bridge address.

## Transfers

Spot assets can be sent from HyperEVM to HyperCore and vice versa. They are called `Core Spot` and `EVM Spot`.
These are done by sending an `ERC20::transfer` with asset bridge address as the recipient.

The event emitted is `Transfer(address from, address to, uint256 value)` => `Transfer(_from, assetBridgeAddress, value);` which is processed by supporting infrastructure on the Hyperliquid blockchain.

Note: The transaction MUST be sent to the `assetBridgeAddress`. Transfers to any other address is an address-address transfer within HyperEVM/HyperCore. For a cross-chain transfer you need to to:

1. Send the tokens to the asset bridge address to get the token on the other Hyperliquid network.
2. Send an transaction/action to transfer from your address to the receiver address on the other Hyperliquid network.

This is what we do in the `HyperliquidComposer` contract found - [here](contracts/HyperLiquidComposer.sol).

## Hyperliquid Composer

Since Hypercore is non-programmable - we can't have an endpoint and ofts on it and so the path to tokens on HyperCore has to be via HyperEVM. We can't assume that every transfer to HyperEVM is a transfer to HyperCore because users might want to hold the token on `HyperEVM` and only move it to `HyperCore` when they want to trade.

The solution is to use `lzCompose` to create a transfer from the `EVM Spot` to the `Core Spot`.
Unfortunately this means that `OFT` developers who already have an `lzCompose` function will need to do some plumbing - like chaining this `lzCompose` function to their current composer.

`_composeMsg` which is part of the `OFTComposeMsgCodec` (`SendParam.composeMsg`) should contain the `_receiver` address - and it should be encoded via `abi.encode()` of the tuple `(uint256,addres)` where the `uint256` is the `msgValue` sent as `composeOptions` and `address` is the receiver address on HyperCore .
This is because the `to` address in the transfer is the `Composer` contract address and not the `receiver` address.
The `Composer` contract receives the token during the `lzReceive` mint. It then executes `transfer` at the underlying oft's erc20 with the token amount minted in `lzReceive` and the destination address as the asset bridge address corresponding to the token the composer is connected with.

That particular `Transfer` event is what Hyperliquid nodes listen to in order to credit the `receiver` address on HyperCore.

```solidity
struct SendParam {
  uint32 dstEid;
  bytes32 to; // Composer address (so that the OFT can execute the `compose` call)
  uint256 amountLD;
  uint256 minAmountLD;
  bytes extraOptions;
  bytes composeMsg; // abi.encode(uint256 minMsgValue,address receiver)
  bytes oftCmd;
}
```

Now that the token is with the `Composer` on HyperCore it then performs a `CoreWriter` transaction to `0x33...333` (the `CoreWriter` address) telling it to perform a `spot transfer` of the tokens from it's address to the `receiver`.

It must be noted that due to the token decimal difference between the `EVM::ERC20` and `HyperCore::HIP1` the tokens you see on `HyperCore` would be different with the wei decimal different (`HIP1.decimals()` - `ERC20.decimals()` in range `[-2,18]`). But when converting them back from `HyperCore` to `HyperEVM` the token decimals gets restored.

The composer will be a separate contract because we don't want developers to change their OFT contract.

```solidity
contract HyperLiquidComposer is IHyperLiquidComposer {
   constructor(
        address _oft,
        uint64 _coreIndexId,
        uint64 _assetDecimalDiff
    ) {...}

    function lzCompose(address _oApp, bytes32 _guid, bytes calldata _message, address _executor, bytes calldata _extraData) external payable override {
        //
    }
}
```

### There are 2 extensions for Hyperliquid Composers

#### Recovery Extension

This gives you the ability to pull tokens our of the composer on hypercore and into the composer's address on hyperevm.
The priviledged address can also send those tokens to itself on HyperEVM, giving you the ability to recover locked tokens.

#### FeeToken Extension

This extension is for tokens that are a `FeeToken` - can be used to activate users on hypercore. Should a composer deployed with this extension notice that a user's address has not been activated then it would send across bridge across the whole amount of tokens to HyperCore and then send across `amt - activationFee` to the user. This consumes `activationFee` from the composer's address.

Ex: User sends `1.5 USDT0` to an new address. The composer sends over `1.5 USDT0` to itself and then makes a core transfer of `0.5 USDT0`. The `1 USDT0` is consumed as Fee.

## LayerZero Transaction on HyperEVM

Since this is a compose call - the `toAddress` is the `HyperLiquidComposer` contract address.
The composeMsg is an `abi.encode()` of the `minMsgValue` and `receiver` (`abi.encode(minMsgValue, receiver)`) and plugged into `SendParam.composeMsg`. This is later used in the `lzCompose` phase to transfer the tokens to the right HyperCore address `receiver` address. `minMsgValue` is only used when `composeMsgOptions` has some value in it. This would be a `HYPE` transfer to the composer which then sends the user `HYPE` on Core. All hyperliquid composers have this behavior in them.

Once the tokens are on HyperEVM we need to create a `Transfer` event to send the tokens from HyperEVM to HyperCore, the composer computes the amount receivable on `HyerCore` based on the number of tokens in HyperCore's asset bridge, the max transferable tokens (`u64.max * scale`) and sends the tokens to itself on HyperCore (this scales the tokens based on `HyperAsset.decimalDiff`). It also sends to the `receivers` address on HyperEVM any leftover tokens from the above transformation from HyperEVM amount to HyperCore.

Since the composer also supports sending native token `$HYPE` into `HyperCore` the above function also has a native function variant in the composer that can be triggered by sending `msg.value` along with the compose payload.

## Using the LayerZero Hyperliquid SDK

The following are just syntax and usage. Explanations are below in the section on "Deploy and Connect your OFT Guide".

## Setup & Environment

### Set Block Size (`evmUserModify`)

PR : <https://github.com/LayerZero-Labs/devtools/pull/1417>

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
    [--oapp-config <layerzero.config.ts>] \
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

### 6. Enable Quote Token Capability (Optional)

Enables your token to be used as a quote asset for trading pairs. **Requirements must be met** - see: [Hyperliquid API requirements](https://t.me/hyperliquid_api/243)

```bash
npx @layerzerolabs/hyperliquid-composer enable-quote-token \
    --token-index <coreIndex> \
    --network {testnet | mainnet} \
    --private-key $PRIVATE_KEY_HYPERLIQUID \
    [--log-level {info | verbose}]
```

### 7. Set Trading Fee Share (Optional)

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
    [--oapp-config <layerzero.config.ts>] \
    --token-index <coreIndex> \
    --network {testnet | mainnet} \
    --private-key $PRIVATE_KEY_HYPERLIQUID \
    [--log-level {info | verbose}]
```

### 2. Finalize EVM Contract Link

```bash
npx @layerzerolabs/hyperliquid-composer finalize-evm-contract \
    [--oapp-config <layerzero.config.ts>] \
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
    --deployer-address <0x> \
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
    --user <0x> \
    --network {testnet | mainnet} \
    [--log-level {info | verbose}]
```

### Get Core Balances

```bash
npx @layerzerolabs/hyperliquid-composer get-core-balances \ 
    --user <0x> \
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

## Utilities

### Convert Token Index to Bridge Address

```bash
npx @layerzerolabs/hyperliquid-composer to-bridge --token-index <coreIndex>
```

## Deploy and Connect your OFT Guide

### Make changes to the underlying OFT (if you want to)

The current architecture has certain error handling AND checks (because Hyperliquid does not have any) to prevent tokens from locking up in the contract or at the asset bridge address, and you can change any of these behaviors.

#### Transfer exceeding u64.max

HyperCore's spot send only allows for a maximum of `u64` tokens to be transferred across. This means (in the unlikely event) that the user sends across greater than `u64` we revert since the bridge can not send that amount.

#### Transfer exceeding HyperCore Bridge Capactiy

HyperCore's Core Spots support a maximum of `u64` tokens on the Core Spot, and this is scaled by the decimal difference between the Core Spot and the EVM Spot. It is thus possible that the asset bridge on HyperCore has been consumed to the point where the entire transfer can't be sent over. In this event we split the `amount` capping it by `amount * 10.pow(ERC20.decimals() - HyperCore.decimals())` which is the maximum possible Core Spot tokens that can be consumed at the bridge at any given instant and compute the difference between the computed max Core amount converted to EVM amount (unscaling) and removing that from the incoming EVM amount. `dust` usually does not exist since OFT transfers use shareDecimals but in the off-chance that you have dust you would have to implement dust refunds to the receiver.

#### Malformed `composeMsg` - unable to abi.decode(composeMsg) into address

The above cases only occur in the stae when the compose payload is valid. In the event that developers write their own front end or try to interact with the composer with their own encoding and aren't careful it is possible that the message contains a `composeMsg` that can not be decoded to an `address`, as such we do not have the `receiver` address. Now the transaction is stored in a `failedMessage` mapping and can be sent back to the sender on the source network cuz the `refundToSrc` function which re-uses the `msg.value` if any to pay for the lz transaction. Calling this function is permissionless.

#### Malformed `composeMsg` - unable to abi.decode(composeMsg) into address and non-EVM sender

> ⚠️ Note: The only case when tokens can be locked in the Composer

Building on the afore mentioned case, it is possible that the compose transaction comes from a non-evm network that uses a different system of addresses. As such we can't return funds to that address on `HyperEVM` - in an ideal world we can have a composer that returns tokens to the sending network but that would consume more gas (doubling the transaction) and since gas paid is non refundable it would simply be wasted.

### Deploy your OFTs

The [oft deploy script](https://github.com/LayerZero-Labs/devtools/blob/feat/oft-hyperliquid-no-hop/examples/oft-hyperliquid/deploy/MyHyperliquidOFT.ts) is configured with a `hardhat-deploy` tag `MyHyperLiquidOFT`, this is renameable.

Since deploying contracts on HyperEVM needs big blocks, we need to submit an `L1Action`, the deploy script does this when the chainId matches those of HyperEVM testnet (998) or mainnet (999). Since this `action` is sent to `HyperCore` it requires an active `HyperCore` account - which you can do by funding the account with `$1` of `HYPE` or `USDC` on `HyperCore`. If you do not do this you will get an error similar to:

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
(building a SDK wrapper around this is on our roadmap)

### Step 0: Purchase the ticker - prerequisite

You will have to buy a ticker from the Hyperliquid UI - <https://app.hyperliquid.xyz/deploySpot>

> ⚠️ note: Unless you buy the ticker you will not be able to deploy the Core Spot.
>
> ⚠️ **Setup Guidance**: Configure your core spot decimals to ensure your HyperCore bridge balance can handle your EVM token's total supply when scaled to EVM decimals. You can reduce your core spot decimals if needed to maintain consistent bridging performance across all scenarios.
>
> ⚠️ **Setup Guidance**: CoreDecimals - EVMDecimals must be within [-2,18] is a requirement for the hyperliquid protocol

After this we can use the `core-spot create` command to create a new file under `./deployments/hypercore-{testnet | mainnet}` with the name of the Core Spot token index. This is not a Hyperliquid step but rather something to make the deployment process easier. It is crucial to the functioning of the token deployment after which it really is not needed.

```bash
npx @layerzerolabs/hyperliquid-composer core-spot \
    --action create \
    [--oapp-config <layerzero.config.ts>] \
    --token-index <coreIndex> \
    --network {testnet | mainnet} \
    [--log-level {info | verbose}]
```

### Step 1/7 `enableFreezePrivilege` (Optional)

**Must be done before genesis if you want freeze capability.**

```bash
npx @layerzerolabs/hyperliquid-composer enable-freeze-privilege \
    --token-index <coreIndex> \
    --network {testnet | mainnet} \
    --private-key $PRIVATE_KEY_HYPERLIQUID \
    [--log-level {info | verbose}]
```

### Step 2/7 `userGenesis`

This is the part where you set the genesis balances for the deployer and the users. Since `HyperCore` tokens are of uint type `u64` the most tokens possible are `18446744073709551615`.

You will have to edit the deployment created by `core-spot create` command that is under `./deployments/hypercore-{testnet | mainnet}` with the name of the Core Spot token index. It should be populated with the `asset bridge address` and set to the number of tokens that you want to mint (we recommend `u64.max` since it allows for the most tokens that users can send from HyperEVM).

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

### Step 3/7 `genesis`

This is the step that registers the above genesis balances on `HyperCore`.

> ⚠️ Note: This is irreversible.

```bash
npx @layerzerolabs/hyperliquid-composer set-genesis \
    --token-index <coreIndex> \
    --network {testnet | mainnet} \
    --private-key $PRIVATE_KEY_HYPERLIQUID \
    [--log-level {info | verbose}]
```

### Step 4/7 `registerSpot`

This is the step that registers the Core Spot on `HyperCore` and creates a base-quote pair. You can now choose between USDC, USDT0, or custom quote tokens.

```bash
npx @layerzerolabs/hyperliquid-composer register-spot \
    --token-index <CoreIndex> \
    --network {testnet | mainnet} \
    --private-key $PRIVATE_KEY_HYPERLIQUID \
    [--log-level {info | verbose}]
```

### Step 5/7 `createSpotDeployment`

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

Your Core Spot (that does not use Hyperliquidity) has now been deployed and registered on `HyperCore`.
The following command will return a json object with your newly deployed Core Spot token details.

```bash
curl -X POST "https://api.hyperliquid.xyz/info" \
     -H "Content-Type: application/json" \
     -d '{ "type": "tokenDetails", "tokenId": "<YOUR_TOKEN_ID>"}'
```

### Step 6/7 `enableQuoteToken` (Optional)

This step enables the token to be used as a quote asset for trading pairs. This allows other tokens to form trading pairs against your token (e.g., TOKEN/YOUR_TOKEN instead of only YOUR_TOKEN/USDC).

> ⚠️ **Requirements**: There are specific requirements that must be met for this to be successful. Please review the requirements at: [Hyperliquid API requirements](https://hyperliquid.gitbook.io/hyperliquid-docs/hypercore/aligned-quote-assets) and contact the Hyperliquid team for the most upto date information.
>
> 📝 **Note**: This can be executed after the trading fee share is set and even after deployment and linking are complete.

```bash
npx @layerzerolabs/hyperliquid-composer enable-quote-token \
    --token-index <coreIndex> \
    --network {testnet | mainnet} \
    --private-key $PRIVATE_KEY_HYPERLIQUID \
    [--log-level {info | verbose}]
```

### Step 7/7: `setDeployerTradingFeeShare` (Optional)

This is the step where you set the trading fee share for the deployer. It can be in the range of `[0%,100%]`.

A deployer fee share <https://hyperliquid.gitbook.io/hyperliquid-docs/trading/fees> is claimed per transaction on HyperCore. Half of the base rate (50%) is allocated as the deployer fee share. The deployer can choose to forgo this fee share by setting the share to `0%`. This causes the deployer's fee share part to be burnt. If it were to be set to `100%`, the deployer would receive the full fee share part of the fee. We recommend setting it to `100%`

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

If you have run the above steps then you can use `--oapp-config` in the following commands. If not do not worry! Our SDK will prompt you for the ERC20 address and the ERC20 deployed transaction hash (we need the deployment nonce). In the case of an OFT the ERC20 would the OFT but in an adapter they are different.

In order to enable transfers between the ERC20 and the Core Spot, we need to connect the ERC20 to the Core Spot. This is done in two steps:

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

You can either use the default composer or use the recovery one or even make changes!

```bash
npx hardhat lz:deploy --tags MyHyperLiquidComposer
```

> ⚠️ Note: You would need to activate the composer's address on hypercore by transferring any amount of tokens from a wallet that has at least $1 in quote tokens. This $1 will be automatically debited from your account to cover an activation fee.

## Sending tokens from x-network to HyperEVM/Core

After populating your `.env` you can run the following script to send tokens across. Having the second argument `gas > 0` will send the tokens into `HyperCore`. Setting the third argument `value > 0` will also fund the user's address with `HYPE` tokens on `HyperCore`.

```bash
forge script script/SendScript.s.sol --private-key $PRIVATE_KEY --sender $PUBLIC_KEY --rpc-url $RPC_URL_SRC_NETWORK --sig "exec(uint256,uint128,uint128)" <oft-amount> <composer-gas> <composer-value> --broadcast
```
