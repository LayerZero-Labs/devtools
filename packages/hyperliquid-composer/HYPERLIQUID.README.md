# Hyperliquid Composer Implementation

We first start this document by talking about Hyperliquid, its quirks and what we had to do to achieve an `X-network` -> `HyperCore` token transfer.

## Hyperliquid Networks

Hyperliquid consists of an `EVM` named `HyperEVM` and an `exchange` called `HyperCore`. These networks operate under the same `HyperBFT` consensus but have independent block production. They can share state via precompiles on `HyperEVM` that read from and write to `HyperCore`.

`HyperCore`, or `Core`, is a high-performance Layer 1 which manages the Hyperliquid exchange’s on-chain perpetual futures and spot order books with a single-block finality. ​

`HyperEVM`, or `EVM`, is an Ethereum Virtual Machine (EVM)-compatible environment that allows developers to build decentralized applications (dApps).

The `EVM` has precompiles that let you interact with `HyperCore`. `HyperCore` is where spot and perp trading happens (and is probably why you are interested in going to Hyperliquid and reading this doc. If you are not listing on HyperCore then HyperEVM is your _almost_ standard EVM network - you just need to switch block sizes to `big/slow` when deploying your contract and then switch back to `small/fast`).

You can interact with `HyperEVM` via traditional `eth_` rpc calls - [full list](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/evm/json-rpc).

`HyperCore` operates with domain specific calls named `L1 actions` or `actions` (Hyperliquid uses both terms interchangeably) - [full list](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/exchange-endpoint). These are NOT EVM transactions — they are EIP-712 signed typed-data payloads submitted via REST API to HyperCore.

`HyperEVM` and `HyperCore` have their own [block explorers](https://hyperliquid-co.gitbook.io/community-docs/community-and-projects/ecosystem-projects/tools).

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

`tokenId` is the 16-byte identifier of the core spot token.
`szDecimals` is the number of decimal places used for order sizes (display/trading precision).
`weiDecimals` is the number of decimal places for the Core Spot's smallest unit — this is the Core Spot's equivalent of EVM decimals. Referred to as `CORE_SPOT_DECIMALS` in the contracts.
`evmContract` is the address of the `ERC20` token on HyperEVM.
`deployerTradingFeeShare` is the fee share for the deployer of the token.

### HyperCore Actions

An action as defined by Hyperliquid is an EIP-712 signed typed-data payload submitted via REST API to `HyperCore` (not an EVM transaction). Since it updates state on `HyperCore` it needs to be signed by the wallet of the action sender.

You need to use `ethers-v6` to sign actions - <https://docs.ethers.org/v6/api/providers/#Signer-signTypedData> - the in-house sdk `@layerzerolabs/hyperliquid-composer` handles all of this and is usable out of the box

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

You can use the official [`Hyperliquid Python SDK`](https://github.com/hyperliquid-dex/hyperliquid-python-sdk) to interact with HyperCore. We also built an in-house typescript SDK that focuses on switching blocks, deploying the HyperCore token, and connecting the HyperCore token to a HyperEVM ERC20 (oft). This SDK also supports features like checking a deployment state, core spot information, coreAccount active, and core spot balances of a user.

### Signing Methods

The SDK supports three signing methods for HyperCore actions:

1. **Private Key (Ethers)** — default, uses ethers-v6 `signTypedData`
2. **Fordefi** — enterprise custody via Fordefi API. Setup: [FORDEFI_SETUP.md](https://github.com/LayerZero-Labs/devtools/blob/main/packages/hyperliquid-composer/FORDEFI_SETUP.md)
3. **Fireblocks** — enterprise custody via Fireblocks API. Setup: [FIREBLOCKS_SETUP.md](https://github.com/LayerZero-Labs/devtools/blob/main/packages/hyperliquid-composer/FIREBLOCKS_SETUP.md)

## Accounts

You can use the same account on `HyperEVM` and `HyperCore`, this is because `HyperCore` uses signed ethereum transactions to validate payload data.

All EVM addresses exist on HyperCore but not all HyperCore addresses exist on HyperEVM. Ex: `CoreSpots` have a `16-byte` identifier and therefore do not exist on HyperEVM but your EOA, Multisigs, contracts, etc exist on HyperCore once activated (see below).

> ⚠️ Note: If you are using a contract to receive funds on HyperCore, you need to have a way to submit CoreWriter operations from that address in order to send tokens around on HyperCore. The CoreWriter precompile (`0x3333...3333`) uses `msg.sender` as the action sender — so a contract can call `ICoreWriter(0x3333...3333).sendRawAction(payload)` and the action will be executed as if it came from that contract's address on HyperCore.

Accounts are activated on HyperCore by sending any amount of any spot token to an unactivated account. The Hyperliquid protocol automatically deducts a `1 quote asset` activation fee from the **sender's** balance on top of the sent amount. The priority order across different quote assets (USDC, USDT0, etc.) is not documented — if the sender does not hold at least 1 whole quote asset token the transfer will fail. For example, if you send `0.00001 HYPE` to a new user, you also need at least 1 USDC or 1 USDT0 in your HyperCore balance to cover the activation fee.

Hyperliquid calls these [quote assets](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/activation-gas-fee). In our codebase we refer to them as `FeeTokens` — they are the same thing.

> While USDC, USDT0, USDe, etc are not always worth US$1 and can fluctuate around by a thousandth of a cent, HyperCore ALWAYS takes 1 whole human-readable token (i.e. 1 USDC, not 1 wei of USDC).

## Multi Block Architecture

Since `HyperEVM` and `HyperCore` have independent block production, they each have their own blocks. `Hyperliquid` interleaves the EVM and Core blocks in order of which they are created.

`HyperEVM` has 2 block types - "small blocks" that are designed for increased throughput and therefore have a quick block time and have a lower max gas limit - 1 second and 2M gas (this is the default blocktype) - these blocks are meant for transactions that update state and not really for deploying contracts. While you can deploy contracts that consume lower than 2M gas (OFTs are larger than 2M) you would need "big blocks" that allow for a larger gas limit (30M gas) at the tradeoff of there only being 1 block per minute.

Hyperliquid produces both small and big blocks concurrently. Each address is flagged as either a small-block or big-block address, and Hyperliquid includes that address's transactions in the corresponding block type. You toggle your address's block type by sending an L1 action of type `evmUserModify`:

```json
{ "type": "evmUserModify", "usingBigBlocks": true }
```

You can also use this [block toggler UI](https://hyperevm-block-toggle.vercel.app/).

> ⚠️ Note: Once you flag your address as using big blocks, **all** subsequent transactions from that address will be included in big blocks until you send another `evmUserModify` action to switch back to small blocks. Big blocks use a higher gas price (~6x small blocks) — set `bigBlockGasPrice` instead of `gasPrice` in your transactions when using big blocks.

`HyperCore` has its own blocks which results in 3 different blocks. As Core and EVM blocks are produced at differing speeds with HyperCore creating more than HyperEVM the blocks created are not `[EVM]-[Core]-[EVM]` but rather something like:

```txt
[Core]-[Core]-[EVM-small]-[Core]-[Core]-[EVM-small]-[Core]-[EVM-large]-[Core]-[EVM-small]
```

## Precompiles and System Contracts

Hyperliquid uses the terms "precompile" and "system contract" loosely — in this doc we distinguish them as follows:

**System Contracts** — special addresses that hold state or act as bridges/writers:

- `0x2222222222222222222222222222222222222222` is the system contract for the `HYPE` token. Note: this is a special-cased address — it does NOT follow the general `0x2000...0000 + coreIndex` formula that other Core Spot asset bridges use.
- `0x200000000000000000000000000000000000abcd` is the system contract (asset bridge) for a created Core Spot token, where `abcd` is the `coreIndex` in hex (computed as `0x2000000000000000000000000000000000000000 + coreIndex`).
- `0x3333333333333333333333333333333333333333` is the `CoreWriter`, used to submit actions to HyperCore from HyperEVM.

**L1 Precompiles** — read-only addresses that query HyperCore state:

- `0x0000000000000000000000000000000000000801` is one of the many `L1Read` precompiles.

More `L1ActionPrecompiles` found [here](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/hyperevm/interacting-with-hypercore).

`L1Read` reads from the last produced `HyperCore` block at the time of EVM-transaction execution. Similarly `CoreWriter` writes to the first produced `HyperCore` block after the production of the EVM-block.

## Token Standards

Tokens on the `EVM` are `ERC20` (EVM Spot) and on `HyperCore` are `HIP-1` (Core Spot).

> **Terminology note — Hyperliquid has two distinct ID spaces:**
>
> - **`coreIndex`** (aka `coreIndexId`, `--token-index`, "token index", "core spot index"): Identifies a Core Spot token. E.g. HYPE = 150 on mainnet, USDC = 0.
> - **`spot index`** (aka `--spot-index`, `spotId`, `SPOT_PAIR_ID`): Identifies a trading pair, allocated by `register-spot`. E.g. 107 for HYPE/USDC. Used for price queries in the `PreFundedFeeAbstraction` extension.
>
> These are NOT the same — a token's `coreIndex` is different from the `spot index` of a trading pair that includes that token.

Projects willing to buy a Core Spot need to undergo a 31 hour dutch auction to secure a `coreIndex` after which they need to deploy the core spot - setting its configuration, genesis balances, token information, etc.

Note: if you use the [Hyperliquid UI](https://app.hyperliquid.xyz/deploySpot) you are forced to use an optional Hyperliquid token bootstrap thing called "Hyperliquidity". This is not supported by LayerZero because it ends up in a state where the asset bridge (which acts as a lockbox) does not have enough tokens on the HyperCore side to unlock when users bridge from HyperEVM. More on this later in the document.

Hyperliquid UI also forces you to use `weiDecimals` in the range of [0,8], via the API you can go up to 15 decimals.

You can skip hyperliquidity by using their API to deploy the core spot - we built an SDK <https://github.com/LayerZero-Labs/devtools/pull/1441> which lets you use scripts (listed in the PR description) to set trading fee share, trigger user genesis, token genesis, and register a trading spot with USDC.

The Core Spot then needs to be connected to the EVM Spot (ERC20) - which is an irreversible process - described [here](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/hyperevm/hypercore-less-than-greater-than-hyperevm-transfers#linking-Core-and-evm-spot-assets), we also have a SDK that lets you do this <https://github.com/LayerZero-Labs/devtools/pull/1432>

If you do not link the `EVM spot` and `Core spot` then no `asset bridge` is formed and users cannot bridge the tokens between `HyperEVM` and `HyperCore` (bi-directional). See [The Asset Bridge](#the-asset-bridge) section for full details on how the bridge works, including the linking steps (`requestEvmContract` / `finalizeEvmContract`), bridge address computation, and setup guidance.

> ⚠️ **Setup Guidance**: Configure your `weiDecimals` to ensure your HyperCore bridge balance can handle your EVM token's total supply when scaled to EVM decimals. You can reduce your `weiDecimals` if needed to maintain consistent bridging performance across all scenarios.
>
> ⚠️ **Setup Guidance**: `EVMDecimals - weiDecimals` must be within [-2,18] is a requirement for the hyperliquid protocol

## Quote Assets (Fee Tokens)

A **quote asset** (called `FeeToken` in our codebase) is a token that can be used as the quote currency in trading pairs on HyperCore. When a token becomes a quote asset, Hyperliquid automatically creates a `HYPE/QUOTE_ASSET` spot market.

It is permissionless to deploy spot markets for OTHER tokens as well.

### Requirements Overview

**Mainnet:**

- Follow the complete requirements outlined in [Hyperliquid's Permissionless Spot Quote Assets documentation](https://hyperliquid.gitbook.io/hyperliquid-docs/hypercore/permissionless-spot-quote-assets)
- Requires specific trading fee share configuration
- Additional technical and liquidity requirements apply
- Contact the Hyperliquid team for the most up-to-date requirements

**Testnet (lighter requirements):**
The requirements are more relaxed to facilitate testing:

1. **Stake 50 HYPE tokens** (refer to [Hyperliquid's Permissionless Spot Quote Assets documentation](https://hyperliquid.gitbook.io/hyperliquid-docs/hypercore/permissionless-spot-quote-assets) for more details)
2. **Create active limit orders** on both sides of your token's order book:

   - Place at least one BUY limit order
   - Place at least one SELL limit order
   - Orders must be active before executing the `enable-quote-token` command
   - You can place these orders via the [Hyperliquid Explorer](https://app.hyperliquid.xyz/)

   Example order book requirement:

   ```
   Price      Size        Total
   1.0015     1,000.00    1,000.00  <- Active SELL order
   -------- Spread: 0.0025 (0.250%) --------
   0.9990     1,000.00    1,000.00  <- Active BUY order
   ```

3. After executing `enable-quote-token`:
   - A `HYPE/YOUR_ASSET` trading pair is automatically created
   - You must then maintain order book requirements for the `HYPE/YOUR_ASSET` pair (not required for testnet)
   - Follow Hyperliquid's documentation for maintaining the `HYPE/ASSET` order book

### Checking Quote Asset Status

To verify if a token is a quote asset:

```bash
# Check specific token
npx @layerzerolabs/hyperliquid-composer list-quote-asset \
    --filter-token-index <coreIndex> \
    --network {testnet | mainnet}

# List all quote assets
npx @layerzerolabs/hyperliquid-composer list-quote-asset \
    --network {testnet | mainnet}
```

### Composer Requirements for Quote Assets

If you're deploying a quote asset token (or plan to make it one):

- **Use `MyHyperLiquidComposer_FeeToken`** - This composer variant provides automatic user activation using the token itself as the fee token
- Regular composers (`MyHyperliquidComposer`, `FeeAbstraction`, `Recoverable`) will work but require users to have HYPE for gas fees

The deployment scripts automatically check if your token is a quote asset and guide you to use the appropriate composer type.

## The Asset Bridge

Transactions can be sent to the asset bridge address `0x2000...abcd` (where `abcd` is the `coreIndexId` of the HIP-1 in hex) to send tokens between HyperEVM and HyperCore. This bridge is formed after the token linking step — until then the bridge does not exist. The linking requires two actions:

1. `requestEvmContract` - initiated by the HyperCore deployer, populates the intention to link the HIP-1 to the ERC20.
2. `finalizeEvmContract` - initiated by the HyperEVM deployer when an `EOA` sends the transaction to confirm the link.

The asset bridge address is computed by `0x2000000000000000000000000000000000000000` + the `coreIndexId` of the HIP-1 (in hex) - you can checkout `HyperLiquidComposerCodec.into_assetBridgeAddress()` in the `HyperLiquidComposer` contract to see how this is done - code found [here](contracts/library/HyperLiquidComposerCodec.sol).

HyperCore to HyperEVM is done via the action `spotSend`, or via the front end, with the destination address being the asset bridge address.

This bridge is crucial to the interop between `HyperEVM` and `HyperCore` and it behaves like a lockbox - unlocking tokens on the other side of the bridge where tokens are unlocked.

> ⚠️ Note : There are no checks in the system that checks asset bridge values before trying to transfer between `HyperCore` and `HyperEVM`.

Since this bridge behaves like a lockbox, this means that the other side of the bridge must always have enough tokens as defined in the transaction at the other end so that tokens can be passed. For tokens to be sent into `HyperCore` the contract deployer needs to mint the maximum supply (`u64.max` via the API which isn't the same as the UI due to `Hyperliquidity`) to either the token's asset bridge address or to their deployer account and later transfer it to the asset bridge address. The following invariant should hold at all times: `assetBridgeBalance.hypercore >= assetBridgeBalance.hyperevm (when scaled)`. If a transfer would violate this invariant, the composer reverts the HyperCore transfer attempt and refunds the user their tokens on HyperEVM instead.

The notation `[EVM | Core]` is used below to represent the token balance held at the asset bridge address on each respective network. For example, `[0 | X]` means the bridge address holds 0 tokens on HyperEVM and X tokens on HyperCore.

This causes a transition in the bridge balances `[0 | 0]` -> `[0 | X]`.
Now users can send across the equivalent tokens that consumes `X` on `HyperCore` - let us assume that the decimal difference between EVM and Core is 10 => 1e10 EVM = 1 Core

This means that `X*1e10` tokens can be sent into the bridge on the EVM side and this would consume all `X` tokens on `HyperCore`

`[0 | X] --EVM(X*1e10)-> [X*1e10 | 0]`

**Raw bridge behavior (without the Composer):** Any tokens sent to the bridge when the other side has insufficient balance will remain stuck at the asset bridge address forever — Hyperliquid does NOT have any checks to prevent this. The same applies in both directions (`HyperEVM` -> `HyperCore` and `HyperCore` -> `HyperEVM`).

**Composer behavior:** The Composer contract works around this by checking the bridge balance before transferring. If the bridge cannot fulfill the transfer, the Composer reverts the attempt and refunds the tokens to the receiver's address on `HyperEVM` instead.

This is also why you can't "partially fund" the HyperCore system address. If you mint tokens to an address you control and fund HyperCore's asset bridge address with a subset of it `[0 | X.Core]`, these tokens would be consumed by users locking in their HyperEVM tokens to obtain HyperCore tokens, and now lets say that all `X` tokens on HyperCore have been consumed and you end in a state `[X.EVM | 0]`. You then fund it with `X.Core` more tokens hoping to make it `[X.EVM | X.Core]` -- except you can't do this as it will cause a withdraw on the `X.EVM`resulting in `[0 | X.Core]` with `X.Core` more tokens in circulation on HyperCore that can't be withdrawn.

Homework to the reader:

1. Based on the above understanding of the asset bridge address can you figure out why `Hyperliquidity` breaks the bridge?

   <details><summary>Answer</summary>

   Hyperliquidity allows other users to buy Core Spot tokens, putting more tradeable tokens in circulation. The asset bridge address is not controlled by any user and is not considered tradeable. This means users can hold the spot token on HyperCore but cannot bridge it to HyperEVM because the lockbox doesn't have enough tokens on the HyperCore side to back the transfer. The token issuer would need to park the Hyperliquidity amount on the EVM lockbox before executing the EVM-Core connection to avoid this.

   </details>

2. If you engage with partial funding and let's say you start with 100 Core tokens at your deployer address and you have initiated the bridge with:
   a) 30 Core tokens
   b) 70 Core tokens
   And these initial tokens are consumed by the users on HyperEVM. Is there a way you can fund the bridge on HyperCore (i.e. increase the Core lockbox balance) with your remaining tokens?

   <details><summary>Answer</summary>

   Only (a) can be re-funded. Depositing Core tokens at the bridge triggers an unlock of tokens from the EVM side. In case (b), you funded 70 which are fully consumed → `[70_evm | 0]`. You have 30 remaining. Depositing 30 at the Core bridge successfully unlocks 30 from the EVM side → `[40_evm | 0]`. The tokens pass through to EVM instead of staying on Core — you cannot increase the Core lockbox. In case (a), you funded 30 which are fully consumed → `[30_evm | 0]`. You have 70 remaining. Depositing 70 at the Core bridge tries to unlock 70 from EVM which only has 30 — the transaction fails. But the Core tokens still land at the bridge address, effectively re-funding it → `[30_evm | 70]`.

   </details>

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

> **Important — two-address scheme**: `SendParam.to` must be set to the **Composer** contract address (not the final recipient). The actual receiver on HyperCore is encoded inside `SendParam.composeMsg` as `abi.encode(uint256 minMsgValue, address receiver)`.

This is because the OFT mints tokens to `SendParam.to` during `lzReceive`, so the Composer must be the recipient in order to receive the tokens first. The Composer then transfers the tokens to the asset bridge address (triggering the HyperEVM → HyperCore bridge) and uses CoreWriter to send them to the `receiver` on HyperCore.

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

It must be noted that due to the token decimal difference between the `EVM::ERC20` and `HyperCore::HIP1` the tokens you see on `HyperCore` would be different with the decimal difference (`ERC20.decimals()` - `HIP1.weiDecimals()` in range `[-2,18]`). But when converting them back from `HyperCore` to `HyperEVM` the token decimals get restored.

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

### There are 3 extensions for Hyperliquid Composers

#### Recovery Extension

This gives you the ability to pull tokens out of the composer on HyperCore and into the composer's address on HyperEVM.
The privileged address can also send those tokens to itself on HyperEVM, giving you the ability to recover locked tokens.

**Use Case:** Useful for any token deployment where you want the ability to recover tokens that may become stuck in the composer contract.

> Note: Recovery functions accept a `coreAmount` parameter. Passing `0` means "transfer the full available balance" (`FULL_TRANSFER = 0` in the contract). It does NOT mean "transfer nothing".

**Constructor Arguments:**

- `oft`: OFT address
- `coreIndex`: Core spot index
- `weiDiff`: Decimal difference between EVM and Core
- `recoveryAddress`: Address with recovery privileges

#### FeeToken Extension

This extension is for tokens that are a **quote asset** (fee token) - tokens that can be used to activate users on HyperCore.

**How it Works:**
When the composer detects that a user's address has not been activated on HyperCore, it:

1. Sends the full amount of tokens across the bridge to HyperCore
2. Transfers `amt - activationFee` to the user
   The transfer automatically consumes `activationFee` from the composer's address to activate the user

**Example:** User sends `1.5 USDT0` to a new address. The composer sends over `1.5 USDT0` to itself on HyperCore, then makes a core transfer of `0.5 USDT0` to the user. The `1.0 USDT0` activation fee is automatically consumed.

**Requirements:**

- Token **must be a quote asset** (see [Quote Assets section](#quote-assets-fee-tokens))
- Deployment scripts automatically verify this requirement
- If not a quote asset, deployment will fail with guidance to use alternative composers

**Constructor Arguments:**

- `oft`: OFT address
- `coreIndex`: Core spot index
- `weiDiff`: Decimal difference between EVM and Core

On-chain deployments:
USDT0 : [0x80123Ab57c9bc0C452d6c18F92A653a4ee2e7585](https://hyperevmscan.io/address/0x80123Ab57c9bc0C452d6c18F92A653a4ee2e7585)

#### FeeAbstraction Extension

This extension provides automatic user activation using a **different token** for fees, combined with price oracle integration for dynamic fee calculation.

**How it Works:**

1. Checks if a user's address is activated on HyperCore
2. Uses the hyperliquid's spot pair oracle to convert between your token and the fee token value
3. Can charge an overhead fee (set on deployment) in addition to the base activation cost
4. If there is insufficient quote asset balance, the HyperCore transfer attempt reverts internally and the catch block refunds the user their tokens on HyperEVM instead

**Key Features:**

- **Price Oracle Integration**: Queries real-time prices via `spotId` (e.g., 107 for HYPE/USDC)
- **Overhead Fee**: Configurable additional fee in cents (e.g., 100 = $1.00 overhead on top of $1.00 base activation)
- **Recovery Capability**: Includes recovery address functionality for fee management
- **Flexible Fee Token**: Can work with any token, not limited to quote assets

**Example Configuration:**

- SpotId: `107` (HYPE/USDC pair for price queries)
- Activation Overhead Fee: `100` cents (adds $1.00 overhead)
- Total User Fee: $2.00 (Base $1.00 + Overhead $1.00)

**`spotBalance` staleness:** The `spotBalance()` precompile returns data from the previous HyperCore block, not the current one. This means within a single EVM block, the composer's fee balance appears unchanged no matter how many activations it performs. The `maxUsersPerBlock` guard (default 250) exists to cap how many activations can happen per block so the composer does not over-spend its actual balance.

**Use Case:** Ideal for non-quote-asset tokens where you want to provide seamless user activation without requiring users to hold quote assets.

**Constructor Arguments:**

- `oft`: OFT address
- `coreIndex`: Core spot index
- `weiDiff`: Decimal difference between EVM and Core
- `spotId`: Spot pair ID for price queries (e.g., 107 for HYPE/USDC)
- `activationOverheadFee`: Overhead fee in cents
- `recoveryAddress`: Address with recovery privileges for fee management

On-chain deployments:
ENA : [0x5879d9821909A41cd3A382A990A4A5A6Ca77F2f0](https://hyperevmscan.io/address/0x5879d9821909A41cd3A382A990A4A5A6Ca77F2f0)

### Choosing the Right Composer

| Composer Type      | Best For              | Key Feature                                   |
| ------------------ | --------------------- | --------------------------------------------- |
| **Regular**        | Standard tokens       | Basic functionality, no extensions            |
| **Recoverable**    | Any token             | Token recovery capability                     |
| **FeeToken**       | **Quote assets only** | Automatic activation using your token         |
| **FeeAbstraction** | Non-quote assets      | Automatic activation using oracle-priced fees |

> ⚠️ **Important**: The deployment scripts automatically check if your token is a quote asset and guide you to use the appropriate composer type. See [Quote Assets (Fee Tokens)](#quote-assets-fee-tokens) for more details.

## LayerZero Transaction on HyperEVM

Since this is a compose call - the `toAddress` is the `HyperLiquidComposer` contract address.
The composeMsg is an `abi.encode()` of the `minMsgValue` and `receiver` (`abi.encode(minMsgValue, receiver)`) and plugged into `SendParam.composeMsg`. This is later used in the `lzCompose` phase to transfer the tokens to the right HyperCore `receiver` address. Since a compose message is present, the OFT uses the `SEND_AND_CALL` message type (msgType 2) and `combineOptions` merges `enforcedOptions` with `SendParam.extraOptions` for that type. `minMsgValue` is only used when the `SEND_AND_CALL` options encode a non-zero `msg.value` — this triggers a `HYPE` transfer to the composer which then sends the user `HYPE` on Core. All hyperliquid composers have this behavior in them.

Once the tokens are on HyperEVM we need to create a `Transfer` event to send the tokens from HyperEVM to HyperCore, the composer computes the amount receivable on `HyperCore` based on the number of tokens in HyperCore's asset bridge, the max transferable tokens (`u64.max * scale`) and sends the tokens to itself on HyperCore (this scales the tokens based on `HyperAsset.decimalDiff`). It also sends to the `receivers` address on HyperEVM any leftover tokens from the above transformation from HyperEVM amount to HyperCore.

Since the composer also supports sending native token `$HYPE` into `HyperCore` the above function also has a native function variant in the composer that can be triggered by sending `msg.value` along with the compose payload.

## Using the LayerZero Hyperliquid SDK

For full CLI command syntax and usage, see [README.md](./README.md). The guide below explains the deployment process and context behind each step.

## Deploy and Connect your OFT Guide

### Make changes to the underlying OFT (if you want to)

The current architecture has certain error handling AND checks (because Hyperliquid does not have any) to prevent tokens from locking up in the contract or at the asset bridge address, and you can change any of these behaviors.

#### Transfer exceeding u64.max

HyperCore's spot send only allows for a maximum of `u64` tokens to be transferred across. This means (in the unlikely event) that the user sends across greater than `u64` we revert since the bridge can not send that amount.

#### Transfer exceeding HyperCore Bridge Capacity

HyperCore's Core Spots support a maximum of `u64` tokens on the Core Spot, and this is scaled by the decimal difference between the Core Spot and the EVM Spot. It is thus possible that the asset bridge on HyperCore has been consumed to the point where the entire transfer can't be sent over. In this event the composer reverts with `TransferAmtExceedsAssetBridgeBalance` — this revert is caught by the try/catch in `lzCompose` and the full amount is refunded to the receiver on HyperEVM.

> Note: The composer does NOT refund dust to the receiver on HyperEVM because we do not expect any due to truncation of `sharedDecimals` in OFT transfers. If your implementation produces dust you would need to add dust refund logic to `_transferERC20ToHyperCore` and `_transferNativeToHyperCore`.

#### Malformed `composeMsg` - unable to abi.decode(composeMsg) into address

The above cases only occur in the state when the compose payload is valid. In the event that developers write their own front end or try to interact with the composer with their own encoding and aren't careful it is possible that the message contains a `composeMsg` that can not be decoded to an `address`, as such we do not have the `receiver` address. Now the transaction is stored in a `failedMessage` mapping and can be sent back to the sender on the source network via the `refundToSrc` function which re-uses the `msg.value` if any to pay for the LayerZero message. Calling this function is permissionless — any excess gas refund goes to `tx.origin` (the caller), since they are the one paying for the message.

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

Test the OFTs with `quoteSend()` or by sending a test lzTransaction across the networks.

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
> ⚠️ **Setup Guidance**: Configure your `weiDecimals` to ensure your HyperCore bridge balance can handle your EVM token's total supply when scaled to EVM decimals. You can reduce your `weiDecimals` if needed to maintain consistent bridging performance across all scenarios.
>
> ⚠️ **Setup Guidance**: WeiDecimal - EVMDecimals must be within [-2,18] is a requirement for the hyperliquid protocol

After this we can use the `core-spot create` command to create a new file under `./deployments/hypercore-{testnet | mainnet}` with the name of the Core Spot token index. This is not a Hyperliquid step but rather something to make the deployment process easier. This file is important — the subsequent deployment steps read from it.

```bash
npx @layerzerolabs/hyperliquid-composer core-spot \
    --action create \
    --token-index <coreIndex> \
    --network {testnet | mainnet} \
    [--log-level {info | verbose}]
```

### Step 1/8 `enableFreezePrivilege` (Optional)

**Must be done before genesis if you want freeze capability.**

```bash
npx @layerzerolabs/hyperliquid-composer enable-freeze-privilege \
    --token-index <coreIndex> \
    --network {testnet | mainnet} \
    --private-key $PRIVATE_KEY_HYPERLIQUID \
    [--log-level {info | verbose}]
```

### Step 2/8 `userGenesis`

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

> ⚠️ Note: There is no limit to the number of times you can re-run this command.

### Step 3/8 `genesis`

This is the step that registers the above genesis balances on `HyperCore`.

> ⚠️ Note: This is irreversible.

```bash
npx @layerzerolabs/hyperliquid-composer set-genesis \
    --token-index <coreIndex> \
    --network {testnet | mainnet} \
    --private-key $PRIVATE_KEY_HYPERLIQUID \
    [--log-level {info | verbose}]
```

### Step 4/8 `registerSpot`

This is the step that registers the Core Spot on `HyperCore` and creates a base-quote pair. You can now choose between USDC, USDT0, or custom quote tokens.

```bash
npx @layerzerolabs/hyperliquid-composer register-spot \
    --token-index <CoreIndex> \
    --network {testnet | mainnet} \
    --private-key $PRIVATE_KEY_HYPERLIQUID \
    [--log-level {info | verbose}]
```

### Step 5/8 `createSpotDeployment`

This step finalizes a spot deployment by setting hyperliquidity parameters. It is required after `register-spot` to make the trading pair live on HyperCore.

For tokens deployed without Hyperliquidity, the values for `startPx` and `orderSz` are not significant as they are set by the market. The value for `nOrders` MUST be 0 as we do not support Hyperliquidity - <https://github.com/hyperliquid-dex/hyperliquid-python-sdk/blob/master/examples/spot_deploy.py#L97-L104>

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
    [--spot-index <spotIndex>] \
    [--log-level {info | verbose}]
```

**Options:**

- `--spot-index <id>`: Directly specify the spot index to finalize. Use the spot index output from the `register-spot` command. This is the recommended approach as it skips network-wide discovery.

**Example:**

```bash
# Using the spot index from register-spot output
npx @layerzerolabs/hyperliquid-composer create-spot-deployment \
    --token-index 1502 \
    --network testnet \
    --spot-index 1421 \
    --private-key $PRIVATE_KEY
```

> ⚠️ Note: `spot-deploy-state` should fail after completing this step.

Your Core Spot (that does not use Hyperliquidity) has now been deployed and registered on `HyperCore`.
The following command will return a json object with your newly deployed Core Spot token details.

```bash
curl -X POST "https://api.hyperliquid.xyz/info" \
     -H "Content-Type: application/json" \
     -d '{ "type": "tokenDetails", "tokenId": "<YOUR_TOKEN_ID>"}'
```

### Step 6/8: `setDeployerTradingFeeShare` (Optional)

This is the step where you set the trading fee share for the deployer. It can be in the range of `[0%,100%]`.

A deployer fee share <https://hyperliquid.gitbook.io/hyperliquid-docs/trading/fees> is claimed per transaction on HyperCore. Half of the base rate (50%) is allocated as the deployer fee share. The deployer can choose to forgo this fee share by setting the share to `0%`. This causes the deployer's fee share part to be burnt. If it were to be set to `100%`, the deployer would receive the full fee share part of the fee. We recommend setting it to `100%`

> ⚠️ Note: The trading fee can be reset as long as the new share is lower than the previous share.
> ⚠️ Note: This step can also be run after the core spot is deployed.
> ⚠️ **Important**: If you plan to enable quote token capability (Step 7/8), read the [Permissionless Spot Quote Assets](https://hyperliquid.gitbook.io/hyperliquid-docs/hypercore/permissionless-spot-quote-assets) documentation before setting this value as it requires a specific trading fee share.

```bash
npx @layerzerolabs/hyperliquid-composer trading-fee \
    --token-index <coreIndex> \
    --share <[0%,100%]> \
    --network {testnet | mainnet} \
    --private-key $PRIVATE_KEY_HYPERLIQUID \
    [--log-level {info | verbose}]
```

### Step 7/8 `enableQuoteToken` (Optional)

This step enables the token to be used as a quote asset for trading pairs. This allows other tokens to form trading pairs against your token (e.g., TOKEN/YOUR_TOKEN instead of only YOUR_TOKEN/USDC).

> ⚠️ **Important**: Review the complete [Quote Assets (Fee Tokens)](#quote-assets-fee-tokens) section above for detailed requirements, including:
>
> - Mainnet: Complete technical and liquidity requirements
> - Testnet: Simplified requirements (50 HYPE stake + active order book)
> - Order book maintenance for `HYPE/YOUR_ASSET` pair after enablement
>
> 📝 **Note**: This can be executed after the trading fee share is set and even after deployment and linking are complete.

```bash
npx @layerzerolabs/hyperliquid-composer enable-quote-token \
    --token-index <coreIndex> \
    --network {testnet | mainnet} \
    --private-key $PRIVATE_KEY_HYPERLIQUID \
    [--log-level {info | verbose}]
```

**Prerequisites:**

- Trading fee share must be set (see Step 6/8 above)
- **Testnet**: 50 HYPE staked + active BUY and SELL limit orders on your token's order book
- **Mainnet**: All requirements per [Hyperliquid's documentation](https://hyperliquid.gitbook.io/hyperliquid-docs/hypercore/permissionless-spot-quote-assets)

**After Execution:**

- A `HYPE/YOUR_ASSET` trading pair is automatically created
- You must maintain order book requirements for the new `HYPE/ASSET` pair
- Verify quote asset status with the `list-quote-asset` command

### Step 8/8 `enableAlignedQuoteToken` (Optional)

This step enables the token to be used as an aligned quote asset for trading pairs. Aligned quote tokens have special properties and requirements different from regular quote tokens.

> ⚠️ **Requirements**:
>
> - Review requirements at: [Aligned Quote Assets](https://hyperliquid.gitbook.io/hyperliquid-docs/hypercore/aligned-quote-assets)
> - Contact the Hyperliquid team for the most up-to-date information
>
> 📝 **Note**: This can be executed after the trading fee share is set and even after deployment and linking are complete.

```bash
npx @layerzerolabs/hyperliquid-composer enable-aligned-quote-token \
    --token-index <coreIndex> \
    --network {testnet | mainnet} \
    --private-key $PRIVATE_KEY_HYPERLIQUID \
    [--log-level {info | verbose}]
```

## Connect the OFT to the deployed Core Spot

Our SDK will prompt you for the ERC20 address and the ERC20 deployed transaction hash (we need the deployment nonce). In the case of an OFT the ERC20 would the OFT but in an adapter they are different.

In order to enable transfers between the ERC20 and the Core Spot, we need to connect the ERC20 to the Core Spot. This is done in two steps:

### Step 1/2 `requestEvmContract`

This step is issued by the Core Spot deployer and populates in `HyperCore` that a request has been made for the mentioned Core Spot to be connected to the ERC20 deployed at the mentioned ERC20 address.

> ⚠️ Note: This step can be issued multiple times until the `finalizeEvmContract` step is issued.

```bash
npx @layerzerolabs/hyperliquid-composer request-evm-contract  \
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
    --token-index <coreIndex> \
    --network {testnet | mainnet} \
    --log-level verbose \
    --private-key $PRIVATE_KEY_HYPERLIQUID
```

**Alternative: Using CoreWriter directly with Foundry**

If you prefer to use Foundry's `cast` command, you can generate the calldata and send the transaction directly:

```bash
npx @layerzerolabs/hyperliquid-composer finalize-evm-contract-corewriter \
    --token-index <coreIndex> \
    --nonce <deployment-nonce> \
    --network {testnet | mainnet}
```

This will output the calldata and a ready-to-use `cast send` command that you can execute directly.

## Deploy the Composer

While the base composer could have been deployed at any point in time since its constructor only requires immutable values, it is technically the final step of the deployment process. Note that some extensions (e.g. `PreFundedFeeAbstraction`) have mutable state such as `maxUsersPerBlock` and `feeWithdrawalBlockNumber`. The following script automatically handles the block switching for you.

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
