<p align="center">
  <a href="https://layerzero.network">
    <img alt="LayerZero" style="width: 400px" src="https://docs.layerzero.network/img/LayerZero_Logo_White.svg"/>
  </a>
</p>

<p align="center">
  <a href="https://layerzero.network" style="color: #a77dff">Homepage</a> | <a href="https://docs.layerzero.network/" style="color: #a77dff">Docs</a> | <a href="https://layerzero.network/developers" style="color: #a77dff">Developers</a>
</p>

<h1 align="center">LayerZero OFT Composer Library</h1>

<p align="center">
  <a href="https://docs.layerzero.network/v2/developers/evm/oft/quickstart" style="color: #a77dff">Quickstart</a> | <a href="https://docs.layerzero.network/contracts/oapp-configuration" style="color: #a77dff">Configuration</a> | <a href="https://docs.layerzero.network/contracts/options" style="color: #a77dff">Message Execution Options</a> | <a href="https://docs.layerzero.network/v2/developers/evm/composer/overview" style="color: #a77dff">Composer Overview</a>
</p>

<p align="center">
  A Composer library to integrate LayerZero composer contracts with the Omnichain Fungible Token (OFT) standard.
</p>

## Table of Contents

- [Prerequisite Knowledge](#prerequisite-knowledge)
- [Introduction](#introduction)
- [Requirements](#requirements)
- [Scaffold this Example](#scaffold-this-example)
- [Helper Tasks](#helper-tasks)
- [Setup](#setup)
  - [1. Environment Configuration](#1-environment-configuration)
  - [2. Network Configuration](#2-network-configuration)
  - [3. Composer Deployment Configuration](#3-composer-deployment-configuration)
- [Build](#build)
- [Deploy](#deploy)
  - [UniswapV3 Composer Deployment](#uniswapv3-composer-deployment)
  - [AaveV3 Composer Deployment](#aavev3-composer-deployment)
- [Enable Messaging (for manually deployed OFTs only)](#enable-messaging-for-manually-deployed-ofts-only)
- [Stargate to Aave Supply Task](#stargate-to-aave-supply-task)
- [Next Steps](#next-steps)
- [Production Deployment Checklist](#production-deployment-checklist)
- [Appendix](#appendix)
  - [Running Tests](#running-tests)
  - [Adding Other Chains](#adding-other-chains)
  - [LayerZero Hardhat Helper Tasks (Detailed)](#layerzero-hardhat-helper-tasks-detailed)
  - [Troubleshooting](#troubleshooting)

## Prerequisite Knowledge

Before diving into this repository you should understand:

- [OFT Standard](https://docs.layerzero.network/v2/developers/evm/oft/quickstart) — how omnichain ERC20s are minted/burned across chains.
- [Composer Pattern](https://docs.layerzero.network/v2/developers/evm/composer/overview) — how OFT transfers can be extended with compose payloads.
- [Target Protocols](https://docs.uniswap.org/contracts/v3) — Uniswap V3 swaps and [Aave v3](https://docs.aave.com/developers/core-contracts/pool) lending flow.

## Introduction

The OFT Composer library demonstrates how to run **post-bridge workflows** on the destination chain. Two ready-to-run contracts live in `contracts/` and their deployment scripts live in `deploy/`:

- `UniswapV3Composer` routes bridged tokens into a Uniswap V3 swap.
- `AaveV3Composer` routes bridged tokens through Stargate and supplies them to an Aave v3 pool.

The example mirrors the [OVault walkthrough](./EX_README.md) so you can reuse the same workflow: configure networks, deploy composable endpoints, wire messaging, and finally execute cross-chain operations with helpful Hardhat tasks.

## Requirements

- git
- Node.js ≥ 18.18
- pnpm ≥ 8.15 (enable via `corepack enable`)

## Scaffold this Example

```bash
LZ_ENABLE_OFT_COMPOSERS=1 npx create-lz-oapp@latest 
```

## Helper Tasks

Run `pnpm hardhat` to list every built-in task. The most relevant tasks for this example are:

- `lz:deploy` — deploy and tag composer contracts per network.
- `lz:oapp:config:init` / `lz:oapp:wire` — bootstrap and apply messaging configs.
- `lz:oft:send` — send OFT tokens without composer logic (useful for smoke tests).
- `aave:supply` — bridge tokens through Stargate and compose into `AaveV3Composer`.



## Setup

### 1. Environment Configuration

Copy the template and fill in every value before running builds, deploys, or tasks:

```bash
cp .env.example .env
```

```bash
PRIVATE_KEY="0xyourdeployer"
```

- `SWAP_ROUTER_ADDRESS` / `OFT_ADDRESS` are required by `deploy/UniswapV3Composer.ts`.
- `AAVE_V3_POOL_ADDRESS` / `STARGATE_POOL_ADDRESS` are required by `deploy/AaveV3Composer.ts` and by the `aave:supply` task.
- Add any other per-chain secrets (like Tenderly keys) that your Hardhat networks need.

### 2. Network Configuration

Edit `hardhat.config.ts` and align networks with the Endpoint IDs you intend to use. Example configuration:

```ts
const config: HardhatUserConfig = {
  networks: {
    base: {
      eid: EndpointId.BASESEP_V2_TESTNET,
      url: process.env.RPC_URL_BASESEP_TESTNET ?? 'https://base-sepolia.gateway.tenderly.co',
      accounts,
    },
    arbitrum: {
      eid: EndpointId.ARBSEP_V2_TESTNET,
      url: process.env.RPC_URL_ARBSEP_TESTNET ?? 'https://arbitrum-sepolia.gateway.tenderly.co',
      accounts,
    },
  },
  // ...
}
```

Ensure every network listed here has a matching `RPC_URL_*` entry in `.env`.

### 3. Composer Deployment Configuration

Both composers rely on addresses passed through constructor arguments. Decide which chain will host each composer and verify you have the corresponding addresses:

- **Uniswap:** needs the canonical SwapRouter (per chain) plus the OFT that forwards tokens to it.
- **Aave:** needs the Aave v3 Pool on the hub chain plus the Stargate pool on the source chain you’ll send from.

## Build

Install dependencies and compile contracts:

```bash
pnpm install
pnpm compile        # runs both Hardhat + Forge toolchains
```

Need a specific tool only? Run `pnpm compile:hardhat` or `pnpm compile:forge`.

Run unit tests with `pnpm test`, or select suites via `pnpm test:hardhat` / `pnpm test:forge`.

## Deploy

### UniswapV3 Composer Deployment

- Script: `examples/oft-composers/deploy/UniswapV3Composer.ts`
- Required `.env` keys: `PRIVATE_KEY`, `SWAP_ROUTER_ADDRESS`, `OFT_ADDRESS`, the `RPC_URL_*` for the destination network.
- Constructor: `(swapRouter, oft)`.

```bash
SWAP_ROUTER_ADDRESS="0xUniswapRouterOnBase" \
OFT_ADDRESS="0xAssetOFTOnBase" \
pnpm hardhat deploy --tags UniswapV3Composer --network base
```

The script validates addresses via `ethers.utils.isAddress` and prints the deployed composer address. Rerun the command whenever you update swap routes or need to redeploy; set `skipIfAlreadyDeployed` to `true` if you want Hardhat Deploy to keep the existing instance.

### AaveV3 Composer Deployment

- Script: `examples/oft-composers/deploy/AaveV3Composer.ts`
- Required `.env` keys: `PRIVATE_KEY`, `AAVE_V3_POOL_ADDRESS`, `STARGATE_POOL_ADDRESS`, relevant `RPC_URL_*`.
- Constructor: `(aavePool, stargatePool)`.

```bash
AAVE_V3_POOL_ADDRESS="0xAavePoolOnBase" \
STARGATE_POOL_ADDRESS="0xStargatePoolOnArbitrum" \
pnpm hardhat deploy --tags AaveV3Composer --network base
```

The script asserts both addresses exist and belong to deployed contracts before broadcasting. Double-check that the Stargate pool you specify supports the token you’ll bridge (e.g., USDC on Arbitrum Sepolia) and that the Aave pool lives on the hub chain that will execute the supply.

## Enable Messaging (for manually deployed OFTs only)

If you manually deployed OFTs (Asset/Share, adapters, or any custom OApp), you still need to wire them with LayerZero. There are two ways to do it—pick the one that matches your tooling:

### Option A — Use the generated `layerzero.config.ts` (default DVNs & Executors)

1. This example already ships a `layerzero.config.ts` that targets LayerZero’s default DVNs/Executors. Update the contract names/EIDs if you changed them during deployment.
2. Run wiring directly:

   ```bash
   pnpm hardhat lz:oapp:wire --oapp-config layerzero.custom.config.ts
   ```

This is the quickest path and mirrors the standard OFT example in `EX_README.md`.

### Option B — Manual configs

1. Generate per-mesh config scaffolding:

   ```bash
   npx hardhat lz:oapp:config:init --contract-name MyOFT --oapp-config layerzero.custom.config.ts
   ```

2. Fill in DVNs, executors, and enforced gas options using the `TwoWayConfig` helpers.

3. Wire each config once all contracts exist:

   ```bash
   pnpm hardhat lz:oapp:wire --oapp-config layerzero.custom.config.ts
   ```

Skip this entire section if you are using the Aave/Stargate composer workflow described below—Stargate pools already implement OFT semantics, so no extra wiring is required beyond configuring Stargate itself.

## Stargate to Aave Supply Task

File: `examples/oft-composers/tasks/supplyAave.ts`

This task bridges tokens through Stargate and composes into `AaveV3Composer` to finalize a supply on Base. Example scenario: composer lives on **Base Sepolia (EID 30184)**, and you send USDC from **Arbitrum Sepolia (EID 30110)**.


1. Run the task with CLI parameters (replace placeholders with live addresses/amounts):

   ```bash
   pnpm hardhat aave:supply \
     --stargate <0xStargatePoolAddress> \
     --dst-eid 30184 \
     --composer <0xComposerAddress> \
     --amount-ld 1000000 
   ```

   - `amount-ld` is specified in local decimals (1,000,000 = 1 USDC if the pool uses 6 decimals).
   - `compose-gas-limit` defaults to `395000`, which matches the gas used in `Options.newOptions()` inside `supplyAave.ts`.

2. The task automatically:
   - Encodes the compose payload (receiver address).
   - Quotes Stargate fees and approves ERC20 transfers when needed.
   - Sends the transaction with the correct messaging fee (native or LZ token).

Monitor progress on [LayerZero Scan](https://testnet.layerzeroscan.com/) if anything fails in-flight.

## Next Steps

1. Track composer executions by indexing emitted events (see `OFTComposeMsgCodec` usage).
2. Parameterize gas limits per pathway to control costs tightly.
3. Add slippage controls by extending the compose payload and guarding on-chain execution.

## Production Deployment Checklist

- [ ] **Security Stack**
  - [ ] Configure DVNs to meet your trust requirements.
  - [ ] Set confirmation blocks per pathway (e.g., Base ↔ Arbitrum).
  - [ ] Register Executor options with sufficient gas for swaps + lending calls.
- [ ] **Gas & Options**
  - [ ] Profile composer gas usage under real traffic.
  - [ ] Tune `lzCompose` gas for each workflow (swap vs. supply).
  - [ ] Fall back to `lz:oft:send` for simple transfers when compose logic is unnecessary.
- [ ] **Composer Config**
  - [ ] Store composer addresses in a registry so tasks can fetch them dynamically.
  - [ ] Guard swap/supply logic with allowlists if you expose arbitrary payloads.
  - [ ] Monitor Stargate pools for liquidity before large sends.

## Appendix

### Running Tests

```bash
pnpm test
pnpm test:hardhat   # only Hardhat
pnpm test:forge     # only Forge
```

### Adding Other Chains

1. Append new networks to `hardhat.config.ts` and `.env`.
2. Add composer and OFT addresses for the new chain to your deployment config.
3. Extend `layerzero.*.config.ts` pathways so the new chain can talk to existing hubs/spokes.
4. Re-run `lz:oapp:wire` with the updated config file.

### LayerZero Hardhat Helper Tasks (Detailed)

```bash
pnpm hardhat             # list every task
pnpm hardhat lz:deploy   # deploy tagged contracts
pnpm hardhat lz:oft:send # OFT transfers without compose logic
pnpm hardhat lz:oapp:wire --oapp-config layerzero.composer.config.ts
pnpm hardhat aave:supply # Stargate send + compose into Aave
```

### Troubleshooting

1. **Missing `.env` entries** — double-check every section above; deployments will `assert(...)` if required addresses are absent.
2. **Composer revert (swap or supply)** — inspect the compose payload and ensure gas limits cover both the OFT receive and the protocol action.
3. **Slippage exceeded** — consider passing `--oft-cmd` or extending the payload so the composer can enforce min amounts.
4. **Allowance errors** — rerun `aave:supply` after the script auto-approves the Stargate pool; you may need to increase allowance for repeated sends.

---

Need help? Reach out in the [LayerZero Discord](https://discord-layerzero.netlify.app/discord) or check the [Developer Docs](https://docs.layerzero.network/).
