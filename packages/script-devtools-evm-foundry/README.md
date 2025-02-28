<p align="center">
  <a href="https://layerzero.network">
    <img alt="LayerZero" style="max-width: 500px" src="https://d3a2dpnnrypp5h.cloudfront.net/bridge-app/lz.png"/>
  </a>
</p>

<h1 align="center">@layerzerolabs/script-devtools-evm-foundry</h1>

<!-- The badges section -->
<p align="center">
  <!-- Shields.io NPM published package version -->
  <a href="https://www.npmjs.com/package/@layerzerolabs/script-devtools-evm-foundry"><img alt="NPM Version" src="https://img.shields.io/npm/v/@layerzerolabs/script-devtools-evm-foundry"/></a>
  <!-- Shields.io NPM downloads -->
  <a href="https://www.npmjs.com/package/@layerzerolabs/script-devtools-evm-foundry"><img alt="Downloads" src="https://img.shields.io/npm/dm/@layerzerolabs/script-devtools-evm-foundry"/></a>
  <!-- Shields.io license badge -->
  <a href="https://www.npmjs.com/package/@layerzerolabs/script-devtools-evm-foundry"><img alt="NPM License" src="https://img.shields.io/npm/l/@layerzerolabs/script-devtools-evm-foundry"/></a>
</p>

## Installation

```sh
$ npm install @layerzerolabs/script-devtools-evm-foundry
```

## Usage

This package not only exports a bunch of scripts for you to use in your foundry projects. But since they compile into your `artifacts` folder, you can run them from your command line.

```sh
forge script SimulateReceive --rpc-url YOUR_DESTINATION_CHAIN_RPC_URL --ffi
```

Since all the scripts are bundled into `LZScripts.s.sol`, you can import them in your own scripts like this:

```solidity
import { LZUtils } from "@layerzerolabs/script-devtools-evm-foundry/scripts/LZScripts.s.sol";
```

## List of scripts

### 1. SimulateReceive

Simulate receiving a message on an EVM chain - [Read more](./script/SimulateReceive/README.md)
Source code: [SimulateReceive.s.sol](./script/SimulateReceive/SimulateReceive.s.sol)

```sh
forge script SimulateReceive --rpc-url $DESTINATION_CHAIN_RPC_URL --ffi
```
