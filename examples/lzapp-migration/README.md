<p align="center">
  <a href="https://layerzero.network">
    <img alt="LayerZero" style="width: 400px" src="https://docs.layerzero.network/img/LayerZero_Logo_White.svg"/>
  </a>
</p>

<p align="center">
  <a href="https://layerzero.network" style="color: #a77dff">Homepage</a> | <a href="https://docs.layerzero.network/" style="color: #a77dff">Docs</a> | <a href="https://layerzero.network/developers" style="color: #a77dff">Developers</a>
</p>

<h1 align="center">OApp Example</h1>

<p align="center">Template project for getting started with LayerZero's  <code>OApp</code> contract development.</p>

## 1) Developing Contracts

#### Installing dependencies

We recommend using `pnpm` as a package manager (but you can of course use a package manager of your choice):

```bash
pnpm install
```

#### Compiling your contracts

This project supports both `hardhat` and `forge` compilation. By default, the `compile` command will execute both:

```bash
pnpm compile
```

If you prefer one over the other, you can use the tooling-specific commands:

```bash
pnpm compile:forge
pnpm compile:hardhat
```

Or adjust the `package.json` to for example remove `forge` build:

```diff
- "compile": "$npm_execpath run compile:forge && $npm_execpath run compile:hardhat",
- "compile:forge": "forge build",
- "compile:hardhat": "hardhat compile",
+ "compile": "hardhat compile"
```

#### Running tests

Similarly to the contract compilation, we support both `hardhat` and `forge` tests. By default, the `test` command will execute both:

```bash
pnpm test
```

If you prefer one over the other, you can use the tooling-specific commands:

```bash
pnpm test:forge
pnpm test:hardhat
```

Or adjust the `package.json` to for example remove `hardhat` tests:

```diff
- "test": "$npm_execpath test:forge && $npm_execpath test:hardhat",
- "test:forge": "forge test",
- "test:hardhat": "$npm_execpath hardhat test"
+ "test": "forge test"
```

## 2) Deploying Contracts

Set up deployer wallet/account:

- Rename `.env.example` -> `.env`
- Choose your preferred means of setting up your deployer wallet/account:

```
MNEMONIC="test test test test test test test test test test test junk"
or...
PRIVATE_KEY="0xabc...def"
```

To deploy your contracts to your desired blockchains, run the following command in your project's folder:

```bash
npx hardhat lz:deploy
```

More information about available CLI arguments can be found using the `--help` flag:

```bash
npx hardhat lz:deploy --help
```

Below is an expanded README section that describes not only the overall configuration and wiring between the V1 and V2 endpoints but also explains the purpose of the overridden tasks provided in the repository:

---

## Overview

This example demonstrates how to establish cross-chain communication between a LayerZero V1 contract (running on **SEPOLIA_TESTNET**) and a LayerZero V2 contract (running on **ARBSEP_V2_TESTNET**). The configuration allows the endpoints to exchange messages even though they run on different protocol versions by ensuring that the app-level messaging codec and underlying endpoint codecs are aligned.

## Key Configuration Details

- **Endpoints:**  
  - **SEPOLIA_TESTNET (V1):** Represented by the contract `MyLzApp`.
  - **ARBSEP_V2_TESTNET (V2):** Represented by the contract `MyOApp`.

- **Connection Parameters:**  
  For each connection, the configuration specifies:
  - **Send/Receive Library Addresses:** The libraries responsible for encoding and decoding messages.
  - **Executor & ULN Configurations:** These determine how messages are processed, including confirmation settings and DVN (Data Validation Node) requirements.
  
- **Wiring Process:**  
  The wiring tasks filter connections by endpoint version:
  - **V1 Endpoint Logic:** Custom configuration logic is applied for **SEPOLIA_TESTNET** to handle the specific requirements of a V1 LzApp.
  - **V2 Endpoint Logic:** The default logic is used for **ARBSEP_V2_TESTNET**, ensuring that the V2 OApp receives the configuration it expects.

## Overridden Tasks and Their Purpose

The repository includes several custom tasks that extend or override the default LayerZero tooling. Their purposes are as follows:

- **`wire.ts`:**  
  - **Purpose:** Extends the default wiring task to support filtering of connections by endpoint version.  
  - **What It Does:**  
    - Filters the full omni-graph into V1 and V2 parts.
    - Applies custom configuration logic for V1 endpoints (e.g., fetching and setting trusted remotes, send/receive libraries, and ULN/executor configurations).
    - For V2 endpoints, it defers to the default wiring logic, ensuring compatibility between the two versions.
    
- **`config.get.ts`:**  
  - **Purpose:** Overrides the configuration fetching task to retrieve and display comprehensive configuration details for each connection.  
  - **What It Does:**  
    - Loads the omni-graph configuration for the OApp.
    - Iterates through each connection and retrieves various configuration settings (custom, default, and active).
    - Outputs a cross-table comparing configurations for send/receive libraries, ULN, and executor settings.  
    - This task helps developers verify that the correct configurations are being used for both V1 and V2 endpoints.

- **`taskHelper.ts`:**  
  - **Purpose:** Provides shared helper functions that simplify interactions with deployed contracts and streamline configuration management.  
  - **What It Does:**  
    - Implements functions for encoding and decoding configuration parameters.
    - Retrieves configuration details (such as ULN and executor configs) for both V1 and V2 endpoints.
    - Handles setting trusted remote addresses, send/receive library addresses, and applying ULN configurations.
    - Serves as the backbone for both `wire.ts` and `config.get.ts` tasks, ensuring consistency across the configuration and wiring processes.

## How It All Works Together

1. **Configuration Loading:**  
   The `config.get.ts` task loads the omni-graph configuration file, which defines how each endpoint is connected and what parameters to use.

2. **Custom Wiring:**  
   The `wire.ts` task leverages the helper functions in `taskHelper.ts` to:
   - Filter connections for V1 and V2 endpoints.
   - Generate and sign the necessary transactions to set the configurations (e.g., trusted remotes, libraries, ULN, and executor settings).

3. **Deployment & Execution:**  
   When you run the provided deployment and wiring commands, the tasks work together to:
   - Automatically fetch the configuration settings.
   - Adjust the deployed contracts so that a V1 LzApp (**SEPOLIA_TESTNET**) can communicate with a V2 OApp (**ARBSEP_V2_TESTNET**).

By overriding these tasks, the example streamlines the complex process of ensuring compatibility between different LayerZero versions, allowing developers to focus on building omnichain solutions without being bogged down by the underlying cross-chain configuration details.

<br></br>

<p align="center">
  Join our community on <a href="https://discord-layerzero.netlify.app/discord" style="color: #a77dff">Discord</a> | Follow us on <a href="https://twitter.com/LayerZero_Labs" style="color: #a77dff">Twitter</a>
</p>
