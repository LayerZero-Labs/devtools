<p align="center">
  <a href="https://layerzero.network">
    <img alt="LayerZero" style="width: 400px" src="https://docs.layerzero.network/img/LayerZero_Logo_Black.svg"/>
  </a>
</p>

<p align="center">
 <a href="https://docs.layerzero.network/" style="color: #a77dff">LayerZero Docs</a>
</p>

<h1 align="center">OFT Adapter Example</h1>

<p align="center">Template project for converting an existing token into a cross-chain token (<a href="https://docs.layerzero.network/v2/concepts/applications/oft-standard">OFT</a>) using the LayerZero protocol. This example's config involves EVM chains, but the same OFT can be extended to involve other VM chains such as Solana, Aptos and Hyperliquid.</p>

## Table of Contents

- [Prerequisite Knowledge](#prerequisite-knowledge)
- [Requirements](#requirements)
- [Scaffold this example](#scaffold-this-example)
- [Helper Tasks](#helper-tasks)
- [Setup](#setup)
- [Build](#build)
  - [Compiling your contracts](#compiling-your-contracts)
- [Deploy](#deploy)
- [Enable Messaging](#enable-messaging)
- [Sending OFTs](#sending-ofts)
- [Next Steps](#next-steps)
- [Production Deployment Checklist](#production-deployment-checklist)
  - [Profiling `lzReceive` and `lzCompose` Gas Usage](#profiling-lzreceive-and-lzcompose-gas-usage)
  - [Available Commands](#available-commands)
    - [`lzReceive`](#lzreceive)
    - [`lzCompose`](#lzcompose)
  - [Notes](#notes)
- [Appendix](#appendix)
  - [Running Tests](#running-tests)
  - [Adding other chains](#adding-other-chains)
  - [Using Multisigs](#using-multisigs)
  - [LayerZero Hardhat Helper Tasks](#layerzero-hardhat-helper-tasks)

## Prerequisite Knowledge

- [What is an OFT (Omnichain Fungible Token) ?](https://docs.layerzero.network/v2/concepts/applications/oft-standard)
- [What is an OApp (Omnichain Application) ?](https://docs.layerzero.network/v2/concepts/applications/oapp-standard)


## Introduction
**OFT Adapter** - while a regular OFT uses the mint/burn mechanism, an OFT adapter uses lock/unlock. The OFT Adapter contract functions as a lockbox for the existing token (referred to as the *inner token*). Given the inner token's chain, transfers to outside the inner token's chain will require locking and transfers to the inner token's chain will result in unlocking.

<!-- TODO: remove this Introduction after having a page/section specifically on OFT Adapter that we can link to under Prerequisite Knowledge -->

## Requirements

- `Node.js` - ` >=18.16.0`
- `pnpm` (recommended) - or another package manager of your choice (npm, yarn)
- `forge` (optional) - `>=0.2.0` for testing, and if not using Hardhat for compilation


## Scaffold this example

Create your local copy of this example:

```bash
pnpm dlx create-lz-oapp@latest --example oft-adapter
```

Specify the directory, select `OFTAdapter` and proceed with the installation.

Note that `create-lz-oapp` will also automatically run the dependencies install step for you.


## Helper Tasks

Throughout this walkthrough, helper tasks will be used. For the full list of available helper tasks, refer to the [LayerZero Hardhat Helper Tasks section](#layerzero-hardhat-helper-tasks). All commands can be run at the project root.

## Setup

- Copy `.env.example` into a new `.env`
- Set up your deployer address/account via the `.env`

  - You can specify either `MNEMONIC` or `PRIVATE_KEY`:

    ```
    MNEMONIC="test test test test test test test test test test test junk"
    or...
    PRIVATE_KEY="0xabc...def"
    ```

- Fund this deployer address/account with the native tokens of the chains you want to deploy to. This example by default will deploy to the following chains' testnets: **Optimism** and **Arbitrum**.


## Build

### Compiling your contracts

<!-- TODO: consider moving this section to Appendix, since for Hardhat, the deploy task wil auto-run compile -->

This project supports both `hardhat` and `forge` compilation. By default, the `compile` command will execute both:

```bash
pnpm compile
```

If you prefer one over the other, you can use the tooling-specific commands:

```bash
pnpm compile:forge
pnpm compile:hardhat
```

## Deploy

First, deploy the inner token to (only) **Optimism Sepolia**.

```bash
pnpm hardhat lz:deploy --tags MyERC20Mock --networks optimism-testnet
```

The deploy script for **MyERC20Mock** will also mint 10 tokens to the deployer address.

On the `Deployed Contract` line, note the `address` logged (inner token's address) upon successful deployment as you need it for the next step. Else, you can also refer to `./deployments/optimism-testnet/MyERC20Mock.json`.

> :information_source: MyERC20Mock will be used as it provides a public mint function which we require for testing. Ensure you do not use this for production.


In the `hardhat.config.ts` file, add the inner token's address to the network you want to deploy the OFTAdapter to:

```typescript
// Replace `0x0` with the address of the ERC20 token you want to adapt to the OFT functionality.
oftAdapter: {
    tokenAddress: '<INNER_TOKEN_ADDRESS>',
}
```

Deploy an OFTAdapter to Optimism Sepolia:

```bash
pnpm hardhat lz:deploy --tags MyOFTAdapter --networks optimism-testnet
```

Deploy the OFT to Arbitrum Sepolia:

```bash
pnpm hardhat lz:deploy --tags MyOFT --networks arbitrum-testnet
```

## Enable Messaging

The OFT standard builds on top of the OApp standard, which enables generic message-passing between chains. After deploying the OFT on the respective chains, you enable messaging by running the [wiring](https://docs.layerzero.network/v2/concepts/glossary#wire--wiring) task.


Run the wiring task:

```bash
pnpm hardhat lz:oapp:wire --oapp-config layerzero.config.ts
```

Submit all the transactions to complete wiring. After all transactions confirm, your OApps are wired and can send messages to each other.
