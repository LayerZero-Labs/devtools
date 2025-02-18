<p align="center">
  <a href="https://layerzero.network">
    <img alt="LayerZero" style="max-width: 500px" src="https://d3a2dpnnrypp5h.cloudfront.net/bridge-app/lz.png"/>
  </a>
</p>

<h1 align="center">@layerzerolabs/devtools-cli</h1>

<!-- The badges section -->
<p align="center">
  <!-- Shields.io NPM published package version -->
  <a href="https://www.npmjs.com/package/@layerzerolabs/devtools-cli"><img alt="NPM Version" src="https://img.shields.io/npm/v/@layerzerolabs/devtools-cli"/></a>
  <!-- Shields.io NPM downloads -->
  <a href="https://www.npmjs.com/package/@layerzerolabs/devtools-cli"><img alt="Downloads" src="https://img.shields.io/npm/dm/@layerzerolabs/devtools-cli"/></a>
  <!-- Shields.io license badge -->
  <a href="https://www.npmjs.com/package/@layerzerolabs/devtools-cli"><img alt="NPM License" src="https://img.shields.io/npm/l/@layerzerolabs/devtools-cli"/></a>
</p>

## LayerZero devtools CLI <img alt="Static Badge" src="https://img.shields.io/badge/status-work_in_progress-yellow">

This package provides a network-agnostic CLI interface for configuring LayerZero OApp contracts.

---

**Please note** that this package is in a **beta** state and backwards-incompatible changes might be introduced in future releases. The functionality is not yet on par with <a href="https://www.npmjs.com/package/@layerzerolabs/toolbox-hardhat"><code>@layerzerolabs/toolbox-hardhat</code></a>. While we strive to comply to [semver](https://semver.org/), we can not guarantee to avoid breaking changes in minor releases.

---

### Quick start

#### Installation

The CLI is distributed as an NPM package, we recommend the following ways of running it:

```bash
npx @layerzerolabs/devtools-cli@latest
# or
yarn @layerzerolabs/devtools-cli
# or
pnpm @layerzerolabs/devtools-cli
# or
bunx @layerzerolabs/devtools-cli
```

#### Configuration

The configuration of the CLI consists of two parts:

- **OApp configuration** that describes the desired state of your OApp (typically called `layerzero.config.ts`)
- **CLI setup** that creates the necessary functionality for the CLI to run - SDKs, configuration functions, signing functions (typically called `layerzero.setup.ts`)

The main difference between this CLI and `@layerzerolabs/toolbox-hardhat` is the `layerzero.setup.ts` file. While in `@layerzerolabs/toolbox-hardhat` lot of the functionality can be inferred based on `hardhat`, it is not possible to infer this functionality in a generic CLI environment.

##### CLI setup

The following is an example of a setup file that loads the EVM functionality based on `hardhat`.

```typescript
import {
  createConnectedContractFactory,
  createSignerFactory,
  createDefaultContext,
} from "@layerzerolabs/devtools-evm-hardhat";
import { createOAppFactory } from "@layerzerolabs/ua-devtools-evm";

import type { CLISetup } from "@layerzerolabs/devtools-cli";

/**
 * Since we are not in hardhat CLI, we'll need to create the context first
 */
createDefaultContext();

/**
 * This is a setup file for @layerzerolabs/devtools-cli.
 *
 * At the moment, @layerzerolabs/devtools-cli is in development
 * and will be available
 */
const setup: CLISetup = {
  createSdk: createOAppFactory(createConnectedContractFactory()),
  createSigner: createSignerFactory(),
};

export default setup;
```
