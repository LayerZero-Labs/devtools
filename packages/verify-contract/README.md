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

## Installation

```bash
yarn add @layerzerolabs/verify-contract

pnpm add @layerzerolabs/verify-contract

npm install @layerzerolabs/verify-contract
```

## Etherscan API v2 Support

This package now supports **Etherscan API v2**, which provides a unified multichain experience across 60+ supported networks using a single API key. 

### Key Changes

- **Unified API URL**: All Etherscan-compatible chains now use `https://api.etherscan.io/v2/api` as the base URL
- **Single API Key**: One Etherscan API key works across all supported chains
- **Chain ID Required**: API v2 requires a `chainId` parameter to identify the target network

The package automatically handles chain IDs for well-known networks. For custom networks or if you need to override the default chain ID, you can specify it explicitly in your network configuration.

## Usage

### CLI

This package comes with a CLI interface:

```bash
npx @layerzerolabs/verify-contract --help
```

Using the CLI, contracts can be verified one network at a time.

### Programmatic usage

The package provides two types of verification for hardhat deploy: _target_ and _non-target_.

#### Target verification

This is suitable for verifying contracts that have been the compilation targets for a deployment, i.e. they have their own deployment file.
This is the default and easiest case for which we know all the information we need from the deployment file.

```typescript
import { verifyHardhatDeployTarget } from "@layerzerolabs/verify-contract";

// Programmatic usage allows for more fine-grained and multi-network verification
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
  // The filter option allows you to limit the scope of verification to
  // specific contracts
  //
  // It supports several ways of scoping the verification:
  //
  // A list of case-sensitive contract names
  filter: ["Factory", "Router"],
  // A single contract name
  filter: "ONFT1155",
  // Boolean to toggle the verification as a whole
  filter: false,
  // A function that gets passed the contract name and an relative contract path and returns a boolean to signify the contract needs to be verified
  filter: (name, path) => name.startsWith("Potato721"),
});
```

#### Non-target verification

This is suitable for verifying contracts that have been e.g. deployed dynamically from other contracts within the deployment.

In this case we need to know more information - the specific deployment file to use, the address of the contract and also its constructor arguments.

```typescript
import { verifyHardhatDeployNonTarget } from "@layerzerolabs/verify-contract";

// Programmatic usage allows for more fine-grained and multi-network verification
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
  // The contracts array is used to pass the contract details
  contracts: [
    {
      address: "0x0",
      network: "whatachain",
      // We'll need to pass the name of the deployment file to use (relative to the deployments path)
      deployment: "OtherContract.json",
      constructorArguments: [1000, "0x0"],
      // In this case we'll need to pass a fully-qualified contract name
      contractName: "contracts/examples/Pool.sol",
    },
  ],
});
```

### Environment Variables

You can configure API keys, URLs, browser URLs, and chain IDs using environment variables:

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

Environment variable names are case-insensitive and support both hyphenated and underscored network names:
- `SCAN_API_KEY_ethereum` or `SCAN_API_KEY_ETHEREUM`
- `SCAN_API_KEY_base-sepolia` or `SCAN_API_KEY_BASE_SEPOLIA`

### Default configuration

The package is preconfigured for scan API URLs and chain IDs for several well-known networks.

#### Etherscan v2 Compatible Networks (use single API key)

Most major EVM networks now use the Etherscan API v2 unified endpoint (`https://api.etherscan.io/v2/api`):

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

#### Non-Etherscan Explorers (require separate API keys)

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
