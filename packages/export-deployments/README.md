<p align="center">
  <a href="https://layerzero.network">
    <img alt="LayerZero" style="max-width: 500px" src="https://d3a2dpnnrypp5h.cloudfront.net/bridge-app/lz.png"/>
  </a>
</p>

<h1 align="center">@layerzerolabs/export-deployments</h1>

<!-- The badges section -->
<p align="center">
  <!-- Shields.io NPM published package version -->
  <a href="https://www.npmjs.com/package/@layerzerolabs/export-deployments"><img alt="NPM Version" src="https://img.shields.io/npm/v/@layerzerolabs/export-deployments"/></a>
  <!-- Shields.io NPM downloads -->
  <a href="https://www.npmjs.com/package/@layerzerolabs/export-deployments"><img alt="Downloads" src="https://img.shields.io/npm/dm/@layerzerolabs/export-deployments"/></a>
  <!-- Shields.io license badge -->
  <a href="https://www.npmjs.com/package/@layerzerolabs/export-deployments"><img alt="NPM License" src="https://img.shields.io/npm/l/@layerzerolabs/export-deployments"/></a>
</p>

## Installation

```bash
yarn add @layerzerolabs/export-deployments

pnpm add @layerzerolabs/export-deployments

npm install @layerzerolabs/export-deployments
```

## Usage

### CLI

This package comes with a CLI interface and registers an executable called `@layerzerolabs/export-deployments`:

```bash
# When installed locally
@layerzerolabs/export-deployments --help

# Or using npx, preferred
npx @layerzerolabs/export-deployments
```

### Programmatic usage

```typescript
// generateSafe is an error-safe function that returns an Either<Error, OutputFile[]> object
import { generateSafe } from "@layerzerolabs/export-deployments";

// if throwing an error is desired, generate is a better option
import { generate } from "@layerzerolabs/export-deployments";

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
} from "@layerzerolabs/export-deployments";

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
} from "@layerzerolabs/export-deployments";

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
