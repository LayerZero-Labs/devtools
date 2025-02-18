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
    whatachain: {
      apiUrl: "https://api.whatachain.io/api",
      apiKey: "david.hasselhoff.1234",
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
      apiUrl: "https://api.whatachain.io/api",
      apiKey: "david.hasselhoff.1234",
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

### Default configuration

The package is preconfigured for scan API URLs for several well-known networks:

| Network                                                        | API URL                                          |
| -------------------------------------------------------------- | ------------------------------------------------ |
| `avalanche`, `avalanche-mainnet`                               | `https://api.snowtrace.io/api`                   |
| `fuji`, `avalanche-testnet`                                    | `https://api-testnet.snowtrace.io/api`           |
| `bsc`                                                          | `https://api.bscscan.com/api`                    |
| `bsc-testnet`                                                  | `https://api-testnet.bscscan.com/api`            |
| `ethereum`                                                     | `https://api.etherscan.io/api`                   |
| `ethereum-goerli`                                              | `https://api-goerli.etherscan.io/api`            |
| `goerli`                                                       | `https://api-goerli.etherscan.io/api`            |
| `fantom`                                                       | `https://api.ftmscan.com/api`                    |
| `fantom-testnet`                                               | `https://api-testnet.ftmscan.com/api`            |
| `arbitrum`                                                     | `https://api.arbiscan.io/api`                    |
| `arbitrum-goerli`                                              | `https://api-goerli.arbiscan.io/api`             |
| `polygon`                                                      | `https://api.polygonscan.com/api`                |
| `mumbai`                                                       | `https://api-testnet.polygonscan.com/api`        |
| `optimism`                                                     | `https://api-optimistic.etherscan.io/api`        |
| `optimism-goerli`                                              | `https://api-goerli-optimistic.etherscan.io/api` |
| `gnosis`                                                       | `https://api.gnosisscan.io/api`                  |
| `zkpolygon`, `zkpolygon-mainnet`                               | `https://api-zkevm.polygonscan.com/api`          |
| `base`, `base-mainnet`                                         | `https://api.basescan.org/api`                   |
| `base-goerli`                                                  | `https://api-goerli.basescan.org/api`            |
| `zkconsensys`, `zkconsensys-mainnet`, `linea`, `linea-mainnet` | `https://api.lineascan.build/api`                |
| `moonbeam`                                                     | `https://api-moonbeam.moonscan.io/api`           |
| `moonbeam-testnet`                                             | `https://api-moonbase.moonscan.io/api`           |
| `kava`, `kava-mainnet`                                         | `https://kavascan.com/api`                       |
| `kava-testnet`                                                 | `https://testnet.kavascan.com/api`               |
