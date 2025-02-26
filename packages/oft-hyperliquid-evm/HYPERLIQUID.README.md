# Hyperliquid OFT Implementation

## Architecture diff

Hyperliquid has 2 “chains” - an EVM named HypeEVM and a server called Hyperliquid which is the L1.

The EVM has precompiles that let you interact with the server. The server is where all the trading occurs.

## RPC

You interact with the EVM via traditional `eth_` rpc calls - full list [here](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/evm/json-rpc).
The server however takes in a domain specific calls named `L1 actions` or `actions` - full list [here](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/exchange-endpoint).

## Accounts

On HyperEVM and the L1 you use the same account. You sign transactions (on HyperEVM) and actions (on L1) with the same private key.

## Dual Block Architecture

There are small blocks that are quicker and with less gas - 2 seconds and 2M gas. (this is the default)

There are big blocks that are slower and with more gas - 60 seconds and 30M gas. (this is where deployments occur)

They are both EVM blocks and you can toggle between them by sending an L1 action of type `evmUserModify`.

```json
{"type": "evmUserModify", "usingBigBlocks": true}
```

You can also use `bigBlockGasPrice` instead of `gasPrice` in your transactions.

Note: This flags the user as using big blocks and all subsequent actions will be sent to the big block chain. You can also toggle this flag on and off.

## Precompiles

Precompiles are what they call "system addresses" and are abundant:
`0x0000000000000000000000000000000000000000` lets you get data about the L1 such as L1 block number.
`0x2222222222222222222222222222222222222222` is like a treasury/gateway and should have `non-system EVM spot supply = max native spot supply`.
`0x3333333333333333333333333333333333333333` is to send transaction from EVM to L1.
`0x5555555555555555555555555555555555555555` is the wrapped `HYPE` token.

## Tokens Standards

Tokens on the `EVM` are `ERC20` (EVM Spot) and on L1 are `HIP-1` (Native Spot).
They need to be linked together, which is an irreversible process - described [here](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/deploying-hip-1-and-hip-2-assets).
If you do not link them, then you can't use the token on L1 - which means no trading and spot. In this case it would be like a normal ERC20.

`ERC20`:`HIP-1` = 1:1

You can also use Hyperliquid's explorer to deploy the token on L1 - [here](https://app.hyperliquid.xyz/deploySpot).

Note : There are no checks to ensure that the balance of the token on the EVM is the same as the balance of the token on L1.

## Linking the ERC20 to the HIP-1

The ERC20 needs to be linked to the HIP-1. Documentation [here](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/evm/native-transfers).

There are 2 actions that need to be performed:

1. `requestEvmContract` - Populates the intention to link the HIP-1 to the ERC20.
2. `finalizeEvmContract` - usable when an `EOA` sends the transactions to confirm the link.

Now transactions can be send to the `0x2222222222222222222222222222222222222222` address to send tokens from the EVM to L1.
L1 to EVM is done via the actions `spotSend` (or the front end)

[This](https://2356094849-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FyUdp569E6w18GdfqlGvJ%2Fuploads%2F4k3MpHVOdp1EBQ7jaUW2%2Ferc20_example.py?alt=media&token=eb96dabe-3de0-425f-a998-5a78bb1f94b9) is an example on how to deploy and link.

## HyperEvm <> L1 Communication

HyperEVM can read state from the L1 via `precompiles` - such as perps positions.
HyperEVM can send state to the L1 through `events` at certain `precompile` addresses.

## Transfers

Spot assets can be sent from EVM to L1 and vice versa. They are called `Native Spot` and `EVM Spot`.
These are done by sending an `ERC20::transfer` with `0x2222222222222222222222222222222222222222` as the recipient.

The event emitted is `Transfer(address from, address to, uint256 value)` => `Transfer(_from, 0x2222222222222222222222222222222222222222, value);`
And this is picked up by the Hyperliquid team running the backend.

Note: The transaction MUST be sent to the `0x2222222222222222222222222222222222222222` address.

## OFT level differences

We need an `lzCompose` function for the `evm spot` and `native spot` conversion.
However this is an `lzCompose` that happens on every single ingress transaction.
Our `OFT standard` by default performs a single `lzCompose` transaction and so if a partner wants to use our `OFT` they need to implement add this "composer" call at the end of their `lzCompose` function.

```solidity
function lzCompose(
    partnersLzCompose();
    spotLzCompose();
}
```

`_composeMsg` which is part of the `OFTComposeMsgCodec` should contain the `_receiver` address.

```solidity
    function encode(
        uint64 _nonce,
        uint32 _srcEid,
        uint256 _amountLD,
        bytes memory _composeMsg // should be the receiver address
    ) internal pure returns (bytes memory _msg) {
        _msg = abi.encodePacked(_nonce, _srcEid, _amountLD, _composeMsg);
    }
```

The LZ transaction's `to` address should be the `token receiver` address.

```solidity
struct SendParam {
    uint32 dstEid;
    bytes32 to; // token receiver address (so that the OFT can execute the `compose` call)
    uint256 amountLD;
    uint256 minAmountLD;
    bytes extraOptions;
    bytes composeMsg; // token receiver address (msg.sender if you want your address to receive the token)
    bytes oftCmd;
}
```

## LZ Transaction

The `lzReceive` calls

```solidity
_credit(toAddress, _toLD(_message.amountSD()), _origin.srcEid)
```

which `mints` the amount in local decimals to the token receiver.
Now we need to send the tokens to the L1 spot address.

```solidity
_transfer(_receiver, 0x2222222222222222222222222222222222222222, amount);
```

Low level call that changes the token receiver's balance and sends the tokens to the L1 spot address. This emits the `Transfer` event.
