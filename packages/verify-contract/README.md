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

> **Note:**  
> Environment variable names for network configuration are **not case-sensitive** and support both hyphens (`-`) and underscores (`_`) in network names. For maximum compatibility across systems and shells, it is recommended to define variables using uppercase characters, underscores, and the canonical network name, e.g.:
>
> - `SCAN_API_KEY_ETHEREUM`
> - `SCAN_API_KEY_BASE_SEPOLIA`

### Default Network Configuration

The package is preconfigured with scan API URLs and chain IDs for well-known networks.

#### Supported Networks

The package supports 60+ EVM networks with preconfigured scan API URLs and chain IDs. Most major EVM networks use the Etherscan API v2 unified endpoint (`https://api.etherscan.io/v2/api`) and can share a single API key.

**Examples:**

| Network              | Chain ID | API URL (v2)                      |
| -------------------- | -------- | --------------------------------- |
| `ethereum`           | 1        | `https://api.etherscan.io/v2/api` |
| `polygon`            | 137      | `https://api.etherscan.io/v2/api` |
| `aurora`             | 1313161554 | `https://explorer.mainnet.aurora.dev/api` |

For the complete list of supported networks, network aliases, and their configurations, see [`src/common/networks.ts`](src/common/networks.ts).
