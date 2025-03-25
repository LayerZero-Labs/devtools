# Hyperliquid OFT Implementation

## Architecture diff

Hyperliquid has 2 “chains” - an `EVM` named `HyperEVM` and a "`L1`" called `HyperCore`.

The `EVM` has precompiles that let you interact with `HyperCore`. The `HyperCore` is where all the spot and perp trading happens.

## RPC

You interact with the `EVM` via traditional `eth_` rpc calls - full list [here](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/evm/json-rpc).

The `L1` however takes in a domain specific calls named `L1 actions` or `actions` - full list [here](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/exchange-endpoint).

Note: archival nodes are NOT available on `HyperEVM`.

`HyperEVM` and `HyperCore` have their own block explorers. A list of explorers is [here](https://hyperliquid-co.gitbook.io/community-docs/community-and-projects/ecosystem-projects/tools). I personally use the hypurrscan for `HyperCore` - <https://testnet.hypurrscan.io/> and for `HyperEVM` I use purrsec - <https://testnet.purrsec.com/>.

## Accounts

On `HyperEVM` and the `L1` you use the same account. You sign transactions (on `HyperEVM`) and actions (on `L1`) with the same private key.

## Dual Block Architecture

There are small blocks that are quicker and with less gas - 2 seconds and 2M gas. (this is the default)

There are big blocks that are slower and with more gas - 60 seconds and 30M gas. (this is where contract deployments happen)

They are both EVM blocks and you can toggle between them by sending an L1 action of type `evmUserModify`.

```json
{"type": "evmUserModify", "usingBigBlocks": true}
```

You can also use `bigBlockGasPrice` instead of `gasPrice` in your transactions.

Note: This flags the user as using big blocks and all subsequent actions will be sent to the big block chain. You can also toggle this flag on and off.

## Precompiles

Precompiles are what they call "system addresses" and are abundant:
`0x0000000000000000000000000000000000000000` lets you get data about the L1 such as L1 block number.
`0x2222222222222222222222222222222222222222` is the system contract address for `HYPE` - this is a special asset bridge address as it is a precompile to handle `receive()` calls - required for native (gas token) transfers.
`0x3333333333333333333333333333333333333333` is to send transaction from EVM to L1.
`0x5555555555555555555555555555555555555555` is the wrapped `HYPE` token.

## Tokens Standards

Tokens on the `EVM` are `ERC20` (EVM Spot) and on `HyperCore` are `HIP-1` (Core Spot).

Projects willing to buy a core spot need to undergo a 31 hour dutch auction to get a spot index after which they need to deploy the spot - setting its configuration, genesis balances, token information, etc.

Note: if you use the [Hyperliquid UI](https://app.hyperliquid.xyz/deploySpot).
 you are forced to use an optional hyperliquid thing called "Hyperliquidity". You can avoid this by using their API to deploy the spot.

The core spot then needs to be linked to the EVM Spot (ERC20) - which is an irreversible process - described [here](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/hyperevm/hypercore-less-than-greater-than-hyperevm-transfers#linking-core-and-evm-spot-assets).

If you do not link them, then you can't use the token on `HyperCore` - which means no spot and perp trading. Since you only have the EVM Spot (ERC20) you can still trade on `HyperEVM` via defi protocols.

Note : There are no checks to ensure that the balance of the token on the EVM is the same as the balance of the token on L1.

## Linking the ERC20 to the HIP-1

The ERC20 needs to be linked to the HIP-1. Documentation [here](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/hyperevm/hypercore-less-than-greater-than-hyperevm-transfers).

There are 2 actions that need to be performed:

1. `requestEvmContract` - Populates the intention to link the HIP-1 to the ERC20.
2. `finalizeEvmContract` - usable when an `EOA` sends the transactions to confirm the link.

Now transactions can be send to the asset bridge address `0x2000...abcd` (where `abcd` is the `coreIndexId` of the HIP-1 in hex) to send tokens between HyperEVM and HyperCore.
The asset bridge address is computed by `0x2000000000000000000000000000000000000000` + the `coreIndexId` of the HIP-1 (in hex) - you can checkout `HyperLiquidComposerCodec.into_assetBridgeAddress()` in the `HyperLiquidComposer` contract to see how this is done - code found [here](contracts/library/HyperLiquidComposerCodec.sol).

HyperCore to HyperEVM is done via the action `spotSend` (or the front end which does the same thing) with the destination address being the asset bridge address.

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

## HyperLiquid Composer

We can't auto convert all tokens to `native spot` in an `lzReceive` function because users might want to hold the token on `HyperEVM` and only move it to `L1` when they want to trade.

The solution is to have an `lzCompose` function for the `evm spot` and `native spot` conversion on the ingress.
Unfortunately this means that `OFT` developers who already have an `lzCompose` function will need to do some plumbing - like chaining this `lzCompose` function to their existing one.
Also requires some changes to the security model of the `OFT` contract since the `msg.sender` changes.
[UNAUDITED EXAMPLE THAT CAN BE A POINTER](https://github.com/LayerZero-Labs/devtools/tree/experimental/hyperliquid_oft_multi_compose/packages/oft-hyperliquid-evm/contracts)
NEVER USE THE CODE IN THE EXAMPLE ABOVE - IT IS UNAUDITED AND NOT TESTED - PROLLY DOESN'T EVEN COMPILE.

`_composeMsg` which is part of the `OFTComposeMsgCodec` (`SendParam.composeMsg`) should contain the `_receiver` address - and it should be encoded as an `abi.encodePacked()` of the `receiver` address.
This is because the `to` address in the transfer is the `OFT` contract address and not the `receiver` address.
The `OFT` contract receives the token minting and then transfers it to the `receiver` address - after which it calls `transferToHyperLiquidL1` to emit the event `Transfer(receiver, 0x2222222222222222222222222222222222222222, amount);`.

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

### HyperLiquidERC20Extended

The `ERC20Extended` contract is a wrapper around the `ERC20` contract that allows for the transfer of tokens to the HyperLiquid L1 contract.
It is a normal ERC20 contract that has a function to transfer tokens to the HyperLiquid L1 contract (`0x2222222222222222222222222222222222222222`).

This is required to generate the `Transfer` event that Hyperliquid L1 nodes/relayers listen to in order to credit the `receiver` address on the L1.
Since it exposes an internal function `_transfer`, it needs callers to be approved by the `owner` of the contract. The `owner` is by default the `msg.sender` of the constructor (the deployer of the contract).

The `owner` can approve callers by calling `approveCaller` and remove their approval by calling `removeApprovedCaller`.

The deployed `LZComposer` will need to be approved by the `owner` of the `HyperLiquidERC20Extended` contract for it to be able to call `_transfer` on the `ERC20Extended` contract and generate the `Transfer` event.

```solidity
contract HyperLiquidERC20Extended is ERC20 {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {}

    function transferToHyperLiquidL1(address _receiver, uint256 _amountLD) external onlyApprovedCallers {
        _transfer(_receiver, 0x2222222222222222222222222222222222222222, _amountLD);
    }
    // ...
}
```

### LZComposer

The composer will be a separate contract because we don't want developers to change their OFT contract apart from the import for `HyperLiquidERC20Extended`.

```solidity
contract HyperLiquidLZComposer is IHyperLiquidComposer {
    constructor(address _endpoint, address _oApp) {
        endpoint = _endpoint;
        oApp = _oApp;
    }

    function lzCompose(address _oApp, bytes32 _guid, bytes calldata _message, address _executor, bytes calldata _extraData) external payable override {
        //
    }
}
```

The `LZComposer` will need to be approved by the `owner` of the `HyperLiquidERC20Extended` contract for it to be able to call `_transfer` on the `ERC20Extended` contract and generate the `Transfer` event.

## LZ Transaction

Since this is a compose call - the `toAddress` is the `HyperLiquidLZComposer` contract address.
The token receiver is encoded as an `abi.encodePacked()` of the `receiver` address into `SendParam.composeMsg`. This is later used in the `lzCompose` phase to transfer the tokens to the L1 spot address on behalf of the `token receiver` address.

```solidity
_credit(toAddress, _toLD(_message.amountSD()), _origin.srcEid)
```

which `mints` the amount in local decimals to the token receiver (`HyperLiquidLZComposer` contract address).
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
