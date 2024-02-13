<p align="center">
  <a href="https://layerzero.network">
    <img alt="LayerZero" style="max-width: 500px" src="https://d3a2dpnnrypp5h.cloudfront.net/bridge-app/lz.png"/>
  </a>
</p>

<h1 align="center">@layerzerolabs/devtools-evm-hardhat-export-deployments</h1>

<!-- The badges section -->
<p align="center">
  <!-- Shields.io NPM published package version -->
  <a href="https://www.npmjs.com/package/@layerzerolabs/devtools-evm-hardhat-export-deployments"><img alt="NPM Version" src="https://img.shields.io/npm/v/@layerzerolabs/devtools-evm-hardhat-export-deployments"/></a>
  <!-- Shields.io NPM downloads -->
  <a href="https://www.npmjs.com/package/@layerzerolabs/devtools-evm-hardhat-export-deployments"><img alt="Downloads" src="https://img.shields.io/npm/dm/@layerzerolabs/devtools-evm-hardhat-export-deployments"/></a>
  <!-- Shields.io license badge -->
  <a href="https://www.npmjs.com/package/@layerzerolabs/devtools-evm-hardhat-export-deployments"><img alt="NPM License" src="https://img.shields.io/npm/l/@layerzerolabs/devtools-evm-hardhat-export-deployments"/></a>
</p>

## Installation

```bash
yarn add @layerzerolabs/devtools-evm-hardhat-export-deployments

pnpm add @layerzerolabs/devtools-evm-hardhat-export-deployments

npm install @layerzerolabs/devtools-evm-hardhat-export-deployments
```

## Usage

### CLI

This package comes with a CLI interface and registers an executable called `@layerzerolabs/devtools-evm-hardhat-export-deployments`:

```bash
# When installed locally
@layerzerolabs/devtools-evm-hardhat-export-deployments --help

# Or using npx, preferred
npx @layerzerolabs/devtools-evm-hardhat-export-deployments
```

### Programatic usage

```typescript
// generateSafe is an error-safe function that returns an Either<Error, OutputFile[]> object
import { generateSafe } from "@layerzerolabs/devtools-evm-hardhat-export-deployments";

// if throwing an error is desired, generate is a better option
import { generate } from "@layerzerolabs/devtools-evm-hardhat-export-deployments";

generateSafe({
  deploymentsDir: "./my/deployments",
  outDir: "./generated",
});
```

If filtering of networks is necessary, `createIncludeDirent` utility can be used to construct a quick filtering function:

```typescript
import {
  createIncludeDirent,
  generateSafe,
} from "@layerzerolabs/devtools-evm-hardhat-export-deployments";

const includedNetworks = ["arbitrum-mainnet"];
const excludedNetworks = ["telos-testnet"];

generateSafe({
  deploymentsDir: "./my/deployments",
  outDir: "./generated",
  includeNetworkDir: createIncludeDirent(includedNetworks, excludedNetworks),
});
```

Similar goes for deployment files:

```typescript
import {
  createIncludeDirent,
  generateSafe,
} from "@layerzerolabs/devtools-evm-hardhat-export-deployments";

// createIncludeDirent will handle the json extension internally
const includedContracts = ["MyContract", "OtherContract.json"];
const excludedContracts = ["TopSecret"];

generateSafe({
  deploymentsDir: "./my/deployments",
  outDir: "./generated",
  includeDeploymentFile: createIncludeDirent(
    includedContracts,
    excludedContracts,
  ),
});
```
