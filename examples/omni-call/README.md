<p align="center">
  <a href="https://layerzero.network">
    <img alt="LayerZero" style="width: 400px" src="https://docs.layerzero.network/img/LayerZero_Logo_White.svg"/>
  </a>
</p>

<p align="center">
  <a href="https://layerzero.network" style="color: #a77dff">Homepage</a> | <a href="https://docs.layerzero.network/" style="color: #a77dff">Docs</a> | <a href="https://layerzero.network/developers" style="color: #a77dff">Developers</a>
</p>

<h1 align="center">Generic Omnichain Messaging</h1>

## Introduction

OmniCall is a generic omnichain messaging protocol that allows for the sending and receiving of messages between different chains. The users won't need to set-up security stacks and won't even need to build message options.

## How it works

There are two types of messages:

1. Non-atomic messages (`MessageType.NON_ATOMIC`): the gas token transfer (native drop) is executed in other transaction, separated from the message send transaction
2. Atomic messages (`MessageType.ATOMIC`): the gas token transfer (native drop) is executed in the same transaction as the message send transaction

If the intent is just to send a message, use `MessageType.ATOMIC`.

Furthermore, there are two data structures that comprise the data needed for each message type (native drop and message):

1. `Call`: the destination call of the message.
2. `Transfer`: the destination transfer of the message.

### `Call` struct

The `Call` struct is used to specify the destination call of the message. It contains the following fields:

1. `target`: the address of the destination contract.
2. `value`: the value of the destination call.
3. `callData`: the data of the destination call.

### `Transfer` struct

The `Transfer` struct is used to specify the gas token transfer (native drop). It contains the following fields:

1. `to`: the address of the destination contract.
2. `value`: the value of the destination transfer.

### Sending a message

To send a message, you only need to call the `send` function of the `OmniCall` contract. The `send` function has the following signature:

```solidity
function send(
    MessageType messageType,
    uint32 dstEid,
    Call calldata dstCall,
    Transfer calldata dstTransfer,
    uint128 dstGasLimit
) external payable returns (MessagingReceipt memory receipt);
```

- `messageType`: the type of message to be sent.
- `dstEid`: the destination chain ID.
- `dstCall`: the destination call of the message.
- `dstTransfer`: the destination transfer of the message.
- `dstGasLimit`: the gas limit for the destination call/transfer.

:warning: the message MAY revert if not enough gas limit is provided. Be sure to provide correct `dstGasLimit` to avoid this.

The `send` function returns a `MessagingReceipt` struct, which contains the following fields:

1. `guid`: the GUID of the message.
2. `nonce`: the nonce of the message.
3. `fee`: the fee of the message.


## Examples

For any call type, you need to know exactly how much native token you need to pay for the message. Therefore, you'll always need to call the `quote` function first to get the correct `MessagingFee`. After that, you can call the `send` function to send the message.

### Sending native token (native drop)

You want to send 10ˆ18 native tokens to `dstAddress` on the destination chain. First, call the `quote` function to get the correct `MessagingFee`.

```solidity
MessagingFee memory fee = omniCall.quote(
    MessageType.NON_ATOMIC,
    dstEid,
    Call(address(0), 0, ""),
    Transfer(dstAddress, 1 ether),
    dstGasLimit
);
```

Then, call the `send` function to send the message.

```solidity
MessagingReceipt memory receipt = omniCall.send{ value: fee.nativeFee }(
    MessageType.NON_ATOMIC,
    dstEid,
    Call(address(0), 0, ""),
    Transfer(dstAddress, 1 ether),
    dstGasLimit
);
```

### Sending a function call

Imagine you want to call the `mint` function of the `token` contract on the destination chain, but you don't need to transfer any native token. You want to mint 10 tokens to `dstAddress` and this token has 18 decimals. First, call the `quote` function to get the correct `MessagingFee`.

```solidity
MessagingFee memory fee = omniCall.quote(
    MessageType.ATOMIC,
    dstEid,
    Call(address(token), 0, abi.encodeWithSignature("mint(address,uint256)", dstAddress, 10 ether)),
    Transfer(address(0), 0),
    dstGasLimit
);
```

Then, call the `send` function to send the message.

```solidity
MessagingReceipt memory receipt = omniCall.send{ value: fee.nativeFee }(
    MessageType.ATOMIC,
    dstEid,
    Call(address(token), 0, abi.encodeWithSignature("mint(address,uint256)", dstAddress, 10 ether)),
    Transfer(address(0), 0),
    dstGasLimit
);
```

### Sending a function call with a native drop

Imagine you want to call the `mint` function of the `token` contract on the destination chain, and you need to transfer 10ˆ18 native tokens to the destination chain. You want to mint 10 tokens to `dstAddress` and this token has 18 decimals. First, call the `quote` function to get the correct `MessagingFee`.

```solidity
MessagingFee memory fee = omniCall.quote(
    MessageType.ATOMIC,
    dstEid,
    Call(address(token), 0, abi.encodeWithSignature("mint(address,uint256)", dstAddress, 10 ether)),
    Transfer(dstAddress, 1 ether),
    dstGasLimit
);
```

Then, call the `send` function to send the message.

```solidity
MessagingReceipt memory receipt = omniCall.send{ value: fee.nativeFee }(
    MessageType.ATOMIC,
    dstEid,
    Call(address(token), 0, abi.encodeWithSignature("mint(address,uint256)", dstAddress, 10 ether)),
    Transfer(dstAddress, 1 ether),
    dstGasLimit
);
```

### Sending a function call with value and a native drop

Imagine you want to call the `mint` function of the `token` contract on the destination chain, and you need to transfer 10ˆ18 native tokens to the destination chain. You want to mint 10 tokens to `dstAddress` and this token has 18 decimals. However, this mint is paid and will cost 10ˆ18 native tokens. First, call the `quote` function to get the correct `MessagingFee`.

```solidity
MessagingFee memory fee = omniCall.quote(
    MessageType.ATOMIC,
    dstEid,
    Call(address(token), 1 ether, abi.encodeWithSignature("mint(address,uint256)", dstAddress, 10 ether)),
    Transfer(dstAddress, 1 ether),
    dstGasLimit
);
```

Then, call the `send` function to send the message.

```solidity
MessagingReceipt memory receipt = omniCall.send{ value: fee.nativeFee }(
    MessageType.ATOMIC,
    dstEid,
    Call(address(token), 1 ether, abi.encodeWithSignature("mint(address,uint256)", dstAddress, 10 ether)),
    Transfer(dstAddress, 1 ether),
    dstGasLimit
);
```

## Testing

To run the tests, you can use the following command:

```bash
forge test
```

## Features

- Send arbitrary message and transfer native tokens between any EVM chains ✅
- lzRead ❌
- lzCompose ❌
- Support for Solana chain ❌



