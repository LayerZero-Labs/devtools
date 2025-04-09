# Hyperliquid Composer Implementation

We first start this document by talking about Hyperliquid, its quirks and the changes we had to make to achieve an `X-network` -> `Hyperliquid` oft transfer.

## Hyperliquid networks

Hyperliquid has 2 “chains” - an `EVM` named `HyperEVM` and a "`L1`" called `HyperCore`.

The `EVM` has precompiles that let you interact with `HyperCore`. The `HyperCore` is where all the spot and perp trading happens.

You can interact with `HyperEVM` via traditional `eth_` rpc calls - full list [here](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/evm/json-rpc).

`HyperCore` however takes in a domain specific calls named `L1 actions` or `actions` - full list [here](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/exchange-endpoint).

Note: archival nodes are NOT available on `HyperEVM`.

`HyperEVM` and `HyperCore` have their own block explorers. A list of explorers is [here](https://hyperliquid-co.gitbook.io/community-docs/community-and-projects/ecosystem-projects/tools). I personally use hypurrscan for `HyperCore` - <https://testnet.hypurrscan.io/> and for `HyperEVM` I use purrsec - <https://testnet.purrsec.com/>.

## Accounts

You can use the same account on `HyperEVM` and `HyperCore`. You sign transactions (on `HyperEVM`) and actions (on `HyperCore`) with the same private key.

## Dual Block Architecture

HyperEVM has 2 blocks - small blocks that are quicker and with less gas - 2 seconds and 2M gas. (this is the default) and big blocks that are slower and with more gas - 60 seconds and 30M gas. (this is where contract deployments happen) and they occupy the entire block.

They are both EVM blocks and you can toggle between them by sending an L1 action of type `evmUserModify`.

```json
{"type": "evmUserModify", "usingBigBlocks": true}
```

You can also use `bigBlockGasPrice` instead of `gasPrice` in your transactions.

Note: This flags the user as using big blocks and all subsequent actions will be sent to the big block chain. You can also toggle this flag on and off.

`HyperCore` has its own blocks which results in 3 blocks. `Hyperliquid` interleaves the EVM and Core blocks in order of which they are created. As Core and EVM blocks are produced at differing speeds with HyperCore creating more than HyperEVM the blocks created are not `[evm]-[core]-[evm]` but rather something like:

```txt
[core]-[core]-[evm-small]-[core]-[core]-[evm-small]-[core]-[evm-large]-[core]-[evm-small]
```

## Precompiles

Precompiles are what they call "system addresses" and are abundant:
`0x0000000000000000000000000000000000000000` is one of the many `L1Read` precompiles.
`0x2222222222222222222222222222222222222222` is the system contract address for `HYPE`
`0x3333333333333333333333333333333333333333` is to send transaction to HyperCore.
`0x5555555555555555555555555555555555555555` is the wrapped `HYPE` token.
with more found [here](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/hyperevm/interacting-with-hypercore).

`L1Read` reads from the last produced `HyperCore` block at the time of evm-transaction execution. Similarly `L1Write` writes to the first produced `HyperCore` block after the production of the evm-block.

Note: the L1Read and L1Write precompiles are enabled only on  Testnet. We have no timeline from the Hyperliquid team regarding a mainnet launch.

## Tokens Standards

Tokens on the `EVM` are `ERC20` (EVM Spot) and on `HyperCore` are `HIP-1` (Core Spot).

Projects willing to buy a core spot need to undergo a 31 hour dutch auction to get a spot index after which they need to deploy the spot - setting its configuration, genesis balances, token information, etc.

Note: if you use the [Hyperliquid UI](https://app.hyperliquid.xyz/deploySpot) you are forced to use an optional hyperliquid token bootstrap thing called "Hyperliquidity". This is not supported by layerzero because it ends up in a state where the asset bridge address can not be collaterized. More on this later in the document.

You can avoid this by using their API to deploy the spot - we build an SDK <https://github.com/LayerZero-Labs/devtools/pull/1441> which lets you use scripts (mentioned in the PR description) to set trading fee share, trigger user genesis, token genesis, and register a trading spot with USDC.

The core spot then needs to be connected to the EVM Spot (ERC20) - which is an irreversible process - described [here](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/hyperevm/hypercore-less-than-greater-than-hyperevm-transfers#linking-core-and-evm-spot-assets), we also have a sdk that lets you do this <https://github.com/LayerZero-Labs/devtools/pull/1432>

If you do not link them, then you can't use the token on `HyperCore` - which means no spot and perp trading. Since you only have the EVM Spot (ERC20) you can still trade on `HyperEVM` via defi protocols.

In order to connect the two assets and create the asset bridge there are 2 actions that need to be performed:

1. `requestEvmContract` - Populates the intention to link the HIP-1 to the ERC20.
2. `finalizeEvmContract` - usable when an `EOA` sends the transactions to confirm the link.

This creates the asset bridge precompile `0x2000...abcd` (where `abcd` is the `coreIndexId` of the HIP-1 in hex) to send tokens between HyperEVM and HyperCore.

## The Asset Bridge

Transactions can be sent to the asset bridge address `0x2000...abcd` (where `abcd` is the `coreIndexId` of the HIP-1 in hex) to send tokens between HyperEVM and HyperCore.
The asset bridge address is computed by `0x2000000000000000000000000000000000000000` + the `coreIndexId` of the HIP-1 (in hex) - you can checkout `HyperLiquidComposerCodec.into_assetBridgeAddress()` in the `HyperLiquidComposer` contract to see how this is done - code found [here](contracts/library/HyperLiquidComposerCodec.sol).

HyperCore to HyperEVM is done via the action `spotSend` (or the front end which does the same thing) with the destination address being the asset bridge address.

This bridge is crucial to the interop between `HyperEVM` and `HyperCore` and it behaves like a lockbox - unlocking tokens on the other side of the bridge where tokens are unlocked.

Note : There are no checks in the system that checks asset bridge values before trying to transfer between `HyperCore` and `HyperEVM`.

This means that token liquidity must be matched if tokens are to be sent across. For tokens to be sent into `HyperCore` the contract deployer needs to mint the maximum supply (`u64.max-1` via the api which isn't the same as the UI due to `hyperliquidity`) to either the token's asset bridge address or to their deployer account and later transfer it to the asset bridge address. 

The asset bridge address is denoted as `[evm | core]`

This causes a transition in the bridge balances `[0 | 0]` -> `[0 | X]`.
Now users can send across the equivalent tokens that consumes `X` on `hypercore` - let us assume that the decimal difference between evm and core is 5 => 1e5 evm = 1 core

This means that `X*1e5` tokens can be sent into the bridge on the evm side and this would consume all `X` tokens on `HyperCore`

`[0 | X] --evm(X*1e5)-> [X*1e5 | 0]`

It should be nothing that any more tokens sent to the evm bridge will remain in the asset bridge address and not transfer any tokens on `HyperCore` (the same applies for `HyperCore` -> `HyperEVM`) due to Hyperliquid NOT having ANY checks and the tokens will be locked in the asset bridge address FOREVER. The Composer contract has checks in place that refunds the `receivers` address on `HyperEVM` should it encounter a case of bridge consumption.

Homework to the reader - based on the above understanding of the asset bridge address can you figure out why `Hyperliquidity` breaks the bridge? (hint: it messes with collaterization)

## HyperEvm <> L1 Communication

HyperEVM can read state from HyperCore via `precompiles` - such as perps positions.
HyperEVM can send state to HyperCore through `events` at certain `precompile` addresses AND by transferring tokens through the asset bridge address.

## Transfers

Spot assets can be sent from HyperEVM to HyperCore and vice versa. They are called `Core Spot` and `EVM Spot`.
These are done by sending an `ERC20::transfer` with asset bridge address as the recipient.

The event emitted is `Transfer(address from, address to, uint256 value)` => `Transfer(_from, assetBridgeAddress, value);`
And this is picked up by the Hyperliquid team running the backend. (we do not have move information about this as Hyperliquid is extremely closed source)

Note: The transaction MUST be sent to the `assetBridgeAddress`. Transfers to any other address is and address-address transfer within HyperEVM/HyperCore. For a cross-chain transfer you need to to:

1. Send the tokens to the asset bridge address to get the token on the other HyperNetwork.
2. Send an transaction/action to transfer from your address to the receiver address on the other HyperNetwork.

This is what we do in the `HyperLiquidComposer` contract found - [here](contracts/HyperLiquidComposer.sol).

## Hyperliquid Composer

We can't auto convert all tokens to `native spot` in an `lzReceive` function because users might want to hold the token on `HyperEVM` and only move it to `L1` when they want to trade.

The solution is to have an `lzCompose` function for the `evm spot` and `native spot` conversion on the ingress.
Unfortunately this means that `OFT` developers who already have an `lzCompose` function will need to do some plumbing - like chaining this `lzCompose` function to their current composer.

`_composeMsg` which is part of the `OFTComposeMsgCodec` (`SendParam.composeMsg`) should contain the `_receiver` address - and it should be encoded via `abi.encodePacked()` or `abi.encode()` of the `receiver` address.
This is because the `to` address in the transfer is the `Composer` contract address and not the `receiver` address.
The `Composer` contract receives the token during the `lzReceive` mint. It then `transfer`s the token amount to the asset bridge address corresponding to the token the composer is connected with.

That particular `Transfer` event is what Hyperliquid L1 nodes/relayers listen to in order to credit the `receiver` address on the L1.

```solidity
struct SendParam {
    uint32 dstEid;
    bytes32 to; // OFT address (so that the OFT can execute the `compose` call)
    uint256 amountLD;
    uint256 minAmountLD;
    bytes extraOptions;
    bytes composeMsg; // token receiver address (msg.sender if you want your address to receive the token)
    bytes oftCmd;
}
```

Now that the token is with the `Composer` on HyperCore it then performs a `L1WritePrecompile` transaction to `0x33...333` (the `L1WritePrecompile` address) telling it to perform a `spot transfer` of the tokens from it's address to the `receiver`.

It must be noted that due to the token decimal difference between the `EVM::ERC20` and `HyperCore::HIP1` the tokens you see on `HyperCore` would be different. But when converting them back from `HyperCore` to `HyperEVM` the token decimals gets restored.

### HyperliquidComposer

The composer will be a separate contract because we don't want developers to change their OFT contract apart from the import for `HyperLiquidERC20Extended`.

```solidity
contract HyperLiquidComposer is IHyperLiquidComposer {
   constructor(
        address _endpoint,
        address _oft,
        uint64 _coreIndexId,
        uint64 _weiDiff
    ) {...}

    function lzCompose(address _oApp, bytes32 _guid, bytes calldata _message, address _executor, bytes calldata _extraData) external payable override {
        //
    }
}
```

The `LZComposer` will need to be approved by the `owner` of the `HyperLiquidERC20Extended` contract for it to be able to call `_transfer` on the `ERC20Extended` contract and generate the `Transfer` event.

## LZ Transaction

Since this is a compose call - the `toAddress` is the `HyperLiquidComposer` contract address.
The token receiver is encoded as an `abi.encodePacked()` of the `receiver` address into `SendParam.composeMsg`. This is later used in the `lzCompose` phase to transfer the tokens to the L1 spot address on behalf of the `token receiver` address.

```solidity
_credit(toAddress, _toLD(_message.amountSD()), _origin.srcEid)
```

which `mints` the amount in local decimals to the token receiver (`HyperLiquidComposer` contract address).
We now need to send the tokens to the L1 spot address on behalf of the `token receiver` address.

```solidity
_transfer(_receiver, 0x2222222222222222222222222222222222222222, amount);
```

Since the layerzero transaction is not sent by the `token receiver` address, we can't do a `transferFrom()` with `from` as the `token receiver` address.
This is because the `token receiver` can't `approve()` the `OFT` contract address to spend the tokens on a transaction sent by the `executor` of the `lzReceive` function - who isn't the `token receiver`.

We need to do a low level call that changes the token receiver's balance and sends the tokens to the L1 spot address. This emits the `Transfer` event.

This is where `HyperLiquidERC20Extended` comes in.

```solidity
    /// @notice Transfers tokens to the HyperLiquid L1 contract
    /// @dev This function is called by lzCompose()
    /// @dev This function is where tokens are credited to the receiver address
    /// @dev We can always assume that the receiver has the tokens the lzReceive() function will credit them
    function transferToHyperLiquidL1(address _receiver, uint256 _amountLD) external {
        if (!approvedCallers[msg.sender]) {
            revert ERC20Extension_NotApprovedCaller();
        }
        // Transfer the tokens that the composer received during lzReceive() back to the receiver
        _transfer(msg.sender, _receiver, _amountLD);
        // Make the transfer from the receiver to the HyperLiquid L1 contract to credit the receiver on the L1
        _transfer(_receiver, HL_NATIVE_TRANSFER, _amountLD);
        emit HyperLiquidL1Transfer(_receiver, _amountLD);
    }
```

This permissioned function lets us access the internal function `_transfer` to transfer tokens to the L1 spot address with the `from` address as the `token receiver` address.

This emits the `Transfer` event that Hyperliquid L1 nodes/relayers listen to in order to credit the `receiver` address on the L1.

## Hyperliquid L1 Api

```bash
curl -X POST https://api.hyperliquid-testnet.xyz/info \
  -H "Content-Type: application/json" \
  -d '{"type": "spotMeta"}'
```

This will give you the spot meta data for the Hyperliquid L1. (this is an example)

```json
{"universe": [{"name": "ALICE", "szDecimals": 0, "weiDecimals": 6, "index": 1231, "tokenId": "0x503e1e612424896ec6e7a02c7350c963", "isCanonical": false, "evmContract": null, "fullName": null, "deployerTradingFeeShare": "1.0"}]}
```

The `tokenId` is the address of the token on the HyperLiquid L1.
The `evmContract` is the address of the token on the HyperEVM.
The `deployerTradingFeeShare` is the fee share for the deployer of the token.

## Hyperliquid L1 Actions

You need to use ethers-v6 to sign the actions - <https://docs.ethers.org/v6/api/providers/#Signer-signTypedData>

```bash
# add ethers-v6 to your project as an alias for ethers@^6.13.5
pnpm add ethers-v6@npm:ethers@^6.13.5
```

```ts
import { Wallet } from 'ethers' // ethers-v5 wallet
import { Wallet as ethersV6Wallet } from 'ethers-v6' // ethers-v6 wallet

const signerv6 = new ethersV6Wallet(wallet.privateKey) // where wallet is an ethers.Wallet from ethers-v5
const signature = await signerv6.signTypedData(domain, types, message)
```

This is because in ethers-v5 EIP-712 signing is not stable. - <https://docs.ethers.org/v5/api/signer/#Signer-signTypedData>
> Experimental feature (this method name will change)
> This is still an experimental feature. If using it, please specify the exact version of ethers you are using (e.g. spcify "5.0.18", not "^5.0.18") as the method name will be renamed from _signTypedData to signTypedData once it has been used in the field a bit.
