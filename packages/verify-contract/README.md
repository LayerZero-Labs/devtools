<p align="center">
  <a href="https://layerzero.network">
    <img alt="LayerZero" style="max-width: 500px" src="https://d3a2dpnnrypp5h.cloudfront.net/bridge-app/lz.png"/>
  </a>
</p>

<h1 align="center">@layerzerolabs/verify-contract</h1>

<!-- The badges section -->
<p align="center">
  <!-- Shields.io NPM published package version -->
  <a href="https://www.npmjs.com/package/@layerzerolabs/verify-contract"><img alt="NPM Version" src="https://img.shields.io/npm/v/@layerzerolabs/verify-contract"/></a>
  <!-- Shields.io NPM downloads -->
  <a href="https://www.npmjs.com/package/@layerzerolabs/verify-contract"><img alt="Downloads" src="https://img.shields.io/npm/dm/@layerzerolabs/verify-contract"/></a>
  <!-- Shields.io license badge -->
  <a href="https://www.npmjs.com/package/@layerzerolabs/verify-contract"><img alt="NPM License" src="https://img.shields.io/npm/l/@layerzerolabs/verify-contract"/></a>
</p>

## Overview

A comprehensive tool for verifying smart contracts on block explorers. Supports both CLI and programmatic usage, with built-in support for Etherscan API v2 and 60+ EVM networks.

### Etherscan API v2 Support

This package supports **Etherscan API v2**, providing a unified multichain experience:

- **Unified API URL**: All Etherscan-compatible chains use `https://api.etherscan.io/v2/api`
- **Single API Key**: One Etherscan API key works across all supported chains
- **Automatic Chain ID**: Chain IDs are automatically set for well-known networks

## Installation

```bash
npm install @layerzerolabs/verify-contract
# or
yarn add @layerzerolabs/verify-contract
# or
pnpm add @layerzerolabs/verify-contract
```

## Quick Start

### CLI

```bash
# Verify all contracts on Ethereum
npx @layerzerolabs/verify-contract target \
  --network ethereum \
  --api-key YOUR_ETHERSCAN_API_KEY \
  --deployments ./deployments
```

### Programmatic

```typescript
import { verifyHardhatDeployTarget } from "@layerzerolabs/verify-contract";

verifyHardhatDeployTarget({
  paths: { deployments: "./deployments" },
  networks: {
    ethereum: {
      apiUrl: "https://api.etherscan.io/v2/api",
      apiKey: "your-etherscan-api-key",
    },
  },
});
```

## CLI Usage

The CLI provides two verification modes: `target` (default) and `non-target`.

### Target Verification

Verifies contracts that have their own deployment files (most common case).

#### Basic Usage

```bash
# Verify all contracts in a network
npx @layerzerolabs/verify-contract target \
  --network ethereum \
  --api-key YOUR_ETHERSCAN_API_KEY \
  --deployments ./deployments
```

#### Options

**Common Options:**
- `-n, --network <network>` - Network name (required) - e.g., `ethereum`, `polygon`, `arbitrum`
- `-k, --api-key <key>` - Scan API Key (or use environment variable)
- `-u, --api-url <url>` - Custom scan API URL (auto-detected for known networks)
- `--chain-id <id>` - Chain ID for Etherscan API v2 (auto-detected for known networks)
- `-d, --deployments <path>` - Path to deployments folder
- `--dry-run` - Preview verification without executing
- `-l, --log-level <level>` - Log level: `error`, `warn`, `info`, `verbose`, `debug` (default: `info`)

**Target-Specific Options:**
- `-c, --contracts <names>` - Comma-separated list of contract names to verify

#### Examples

```bash
# Verify specific contracts only
npx @layerzerolabs/verify-contract target \
  --network ethereum \
  --api-key YOUR_ETHERSCAN_API_KEY \
  --deployments ./deployments \
  --contracts FRNTAdapter,DefaultProxyAdmin

# Dry run (preview without actually verifying)
npx @layerzerolabs/verify-contract target \
  --network ethereum \
  --api-key YOUR_ETHERSCAN_API_KEY \
  --deployments ./deployments \
  --dry-run

# Custom explorer (non-Etherscan networks)
npx @layerzerolabs/verify-contract target \
  --network aurora \
  --api-url https://explorer.mainnet.aurora.dev/api \
  --api-key YOUR_AURORA_API_KEY \
  --deployments ./deployments
```

### Non-Target Verification

Verifies contracts without deployment files (e.g., deployed dynamically by factory contracts).

#### Basic Usage

```bash
npx @layerzerolabs/verify-contract non-target \
  --network ethereum \
  --api-key YOUR_ETHERSCAN_API_KEY \
  --deployments ./deployments \
  --address 0x123... \
  --name "contracts/MyContract.sol:MyContract" \
  --deployment MyFactory.json \
  --arguments '[1000, "0x456..."]'
```

#### Options

**Non-Target-Specific Options:**
- `--address <address>` - Contract address to verify (required)
- `--name <contract name>` - Fully qualified contract name (required)
- `--deployment <file>` - Deployment file name to use as source (required)
- `--arguments <args>` - Constructor arguments as JSON array or encoded hex

#### Examples

```bash
# With JSON constructor arguments
npx @layerzerolabs/verify-contract non-target \
  --network ethereum \
  --api-key YOUR_ETHERSCAN_API_KEY \
  --deployments ./deployments \
  --address 0x123... \
  --name "contracts/MyContract.sol:MyContract" \
  --deployment MyFactory.json \
  --arguments '[1000, "0x456..."]'

# With encoded constructor arguments
npx @layerzerolabs/verify-contract non-target \
  --network ethereum \
  --api-key YOUR_ETHERSCAN_API_KEY \
  --deployments ./deployments \
  --address 0x123... \
  --name "contracts/MyContract.sol:MyContract" \
  --deployment MyFactory.json \
  --arguments 0x000000000000000000000000...
```

### Environment Variables

Instead of passing API keys on the command line, use environment variables:

```bash
# Set environment variables
export SCAN_API_KEY_ethereum="your-etherscan-api-key"
export SCAN_API_KEY_polygon="your-etherscan-api-key"

# Then just specify the network
npx @layerzerolabs/verify-contract target \
  --network ethereum \
  --deployments ./deployments
```

The CLI automatically:
- Uses the correct API URL for known networks
- Sets the correct chain ID for Etherscan API v2
- Pulls API keys from environment variables if not specified

## Programmatic Usage

The package provides two verification functions: `verifyHardhatDeployTarget` and `verifyHardhatDeployNonTarget`.

### Target Verification

Verifies contracts that have their own deployment files. This is the default and easiest case.

```typescript
import { verifyHardhatDeployTarget } from "@layerzerolabs/verify-contract";

verifyHardhatDeployTarget({
  paths: {
    deployments: "./my/little/deployments/folder",
  },
  networks: {
    // Using Etherscan API v2 (recommended)
    ethereum: {
      // The v2 base URL is used by default for Etherscan-compatible chains
      apiUrl: "https://api.etherscan.io/v2/api",
      apiKey: "your-etherscan-api-key",
      // Chain ID is automatically set for well-known networks
      // For Ethereum mainnet, chainId: 1 is set automatically
    },
    polygon: {
      // For Etherscan v2, you can use the same API key and URL for all chains
      apiUrl: "https://api.etherscan.io/v2/api",
      apiKey: "your-etherscan-api-key",
      // Chain ID is automatically set for well-known networks
      // For Polygon, chainId: 137 is set automatically
    },
    // Custom network example
    whatachain: {
      apiUrl: "https://api.whatachain.io/api",
      apiKey: "david.hasselhoff.1234",
      // For custom networks, specify the chain ID explicitly
      chainId: 12345,
    },
  },
  // Filter option allows you to limit verification scope
  // Supports multiple formats:
  
  // A list of case-sensitive contract names
  filter: ["Factory", "Router"],
  
  // A single contract name
  filter: "ONFT1155",
  
  // Boolean to toggle verification
  filter: false,
  
  // A function that receives contract name and path, returns boolean
  filter: (name, path) => name.startsWith("Potato721"),
});
```

### Non-Target Verification

Verifies contracts deployed dynamically (e.g., by factory contracts) that don't have their own deployment files.

```typescript
import { verifyHardhatDeployNonTarget } from "@layerzerolabs/verify-contract";

verifyHardhatDeployNonTarget({
  paths: {
    deployments: "./my/little/deployments/folder",
  },
  networks: {
    whatachain: {
      // Using Etherscan API v2
      apiUrl: "https://api.etherscan.io/v2/api",
      apiKey: "your-etherscan-api-key",
      chainId: 12345, // Specify chain ID for custom networks
    },
  },
  // The contracts array specifies which contracts to verify
  contracts: [
    {
      address: "0x0",
      network: "whatachain",
      // Deployment file name (relative to deployments path)
      deployment: "OtherContract.json",
      // Constructor arguments
      constructorArguments: [1000, "0x0"],
      // Fully-qualified contract name
      contractName: "contracts/examples/Pool.sol",
    },
  ],
});
```

## Configuration

### Environment Variables

Configure API keys, URLs, browser URLs, and chain IDs using environment variables:

```bash
# API Key - same key works for all Etherscan v2 compatible chains
SCAN_API_KEY_ethereum=your-etherscan-api-key
SCAN_API_KEY_polygon=your-etherscan-api-key

# API URL - uses v2 base URL by default for Etherscan chains
SCAN_API_URL_ethereum=https://api.etherscan.io/v2/api
SCAN_API_URL_polygon=https://api.etherscan.io/v2/api

# Chain ID - automatically set for well-known networks, but can be overridden
SCAN_CHAIN_ID_ethereum=1
SCAN_CHAIN_ID_polygon=137

# Browser URL for displaying verified contract links
SCAN_BROWSER_URL_ethereum=https://etherscan.io
SCAN_BROWSER_URL_polygon=https://polygonscan.com
```

**Note:** Environment variable names are case-insensitive and support both hyphenated and underscored network names:
- `SCAN_API_KEY_ethereum` or `SCAN_API_KEY_ETHEREUM`
- `SCAN_API_KEY_base-sepolia` or `SCAN_API_KEY_BASE_SEPOLIA`

### Default Network Configuration

The package is preconfigured with scan API URLs and chain IDs for well-known networks.

#### Etherscan v2 Compatible Networks

Most major EVM networks use the Etherscan API v2 unified endpoint (`https://api.etherscan.io/v2/api`). These networks can share a single API key:

| Network                                                        | Chain ID  | API URL (v2)                            |
| -------------------------------------------------------------- | --------- | --------------------------------------- |
| `ethereum`, `ethereum-mainnet`                                 | 1         | `https://api.etherscan.io/v2/api`       |
| `ethereum-goerli`, `goerli`, `goerli-mainnet`                  | 5         | `https://api.etherscan.io/v2/api`       |
| `sepolia-testnet`                                              | 11155111  | `https://api.etherscan.io/v2/api`       |
| `polygon`, `polygon-mainnet`                                   | 137       | `https://api.etherscan.io/v2/api`       |
| `amoy`, `amoy-mainnet`                                         | 80002     | `https://api.etherscan.io/v2/api`       |
| `arbitrum`, `arbitrum-mainnet`                                 | 42161     | `https://api.etherscan.io/v2/api`       |
| `arbitrum-goerli`                                              | 421613    | `https://api.etherscan.io/v2/api`       |
| `arbsep-testnet`                                               | 421614    | `https://api.etherscan.io/v2/api`       |
| `optimism`, `optimism-mainnet`                                 | 10        | `https://api.etherscan.io/v2/api`       |
| `optimism-goerli`                                              | 420       | `https://api.etherscan.io/v2/api`       |
| `optsep-testnet`                                               | 11155420  | `https://api.etherscan.io/v2/api`       |
| `base`, `base-mainnet`                                         | 8453      | `https://api.etherscan.io/v2/api`       |
| `base-goerli`                                                  | 84531     | `https://api.etherscan.io/v2/api`       |
| `avalanche`, `avalanche-mainnet`                               | 43114     | `https://api.etherscan.io/v2/api`       |
| `fuji`, `avalanche-testnet`, `fuji-mainnet`                    | 43113     | `https://api.etherscan.io/v2/api`       |
| `bsc`, `bsc-mainnet`                                           | 56        | `https://api.etherscan.io/v2/api`       |
| `bsc-testnet`                                                  | 97        | `https://api.etherscan.io/v2/api`       |
| `fantom`, `fantom-mainnet`                                     | 250       | `https://api.etherscan.io/v2/api`       |
| `fantom-testnet`                                               | 4002      | `https://api.etherscan.io/v2/api`       |
| `gnosis`, `gnosis-mainnet`                                     | 100       | `https://api.etherscan.io/v2/api`       |
| `blast`, `blast-mainnet`                                       | 81457     | `https://api.etherscan.io/v2/api`       |
| `linea`, `linea-mainnet`, `zkconsensys`, `zkconsensys-mainnet` | 59144     | `https://api.etherscan.io/v2/api`       |
| `scroll`, `scroll-mainnet`                                     | 534352    | `https://api.etherscan.io/v2/api`       |
| `zkpolygon`, `zkpolygon-mainnet`                               | 1101      | `https://api.etherscan.io/v2/api`       |
| `moonbeam`, `moonbeam-mainnet`                                 | 1284      | `https://api.etherscan.io/v2/api`       |
| `moonbeam-testnet`                                             | 1287      | `https://api.etherscan.io/v2/api`       |
| `moonriver`, `moonriver-mainnet`                               | 1285      | `https://api.etherscan.io/v2/api`       |
| `fraxtal`, `fraxtal-mainnet`                                   | 252       | `https://api.etherscan.io/v2/api`       |
| `taiko`, `taiko-mainnet`                                       | 167000    | `https://api.etherscan.io/v2/api`       |

#### Non-Etherscan Explorers

Some networks use their own explorer infrastructure and require separate API keys:

| Network                     | Chain ID    | API URL                                                           |
| --------------------------- | ----------- | ----------------------------------------------------------------- |
| `astar`, `astar-mainnet`    | 592         | `https://astar.blockscout.com/api`                                |
| `aurora`, `aurora-mainnet`  | 1313161554  | `https://explorer.mainnet.aurora.dev/api`                         |
| `kava`, `kava-mainnet`      | 2222        | `https://kavascan.com/api`                                        |
| `kava-testnet`              | 2221        | `https://testnet.kavascan.com/api`                                |
| `klaytn`, `klaytn-mainnet`  | 8217        | `https://api-cypress.klaytnscope.com/api`                         |
| `klaytn-testnet`            | 1001        | `https://api-baobab.klaytnscope.com/api`                          |
| `mantle`, `mantle-mainnet`  | 5000        | `https://explorer.mantle.xyz/api`                                 |
| `manta`, `manta-mainnet`    | 169         | `https://pacific-explorer.manta.network/api`                      |
| `metis`, `metis-mainnet`    | 1088        | `https://api.routescan.io/v2/network/mainnet/evm/1088/etherscan` |
| `mode`, `mode-mainnet`      | 34443       | `https://explorer.mode.network/api`                               |
| `flare`, `flare-mainnet`    | 14          | `https://api.routescan.io/v2/network/mainnet/evm/14/etherscan`   |
