<p align="center">
  <a href="https://layerzero.network">
    <img alt="LayerZero" style="width: 400px" src="https://docs.layerzero.network/img/LayerZero_Logo_White.svg"/>
  </a>
</p>

<p align="center">
  <a href="https://layerzero.network" style="color: #a77dff">Homepage</a> | <a href="https://docs.layerzero.network/" style="color: #a77dff">Docs</a> | <a href="https://layerzero.network/developers" style="color: #a77dff">Developers</a>
</p>

<h1 align="center">EndpointV1 OFT Migration + Solana OFT202 Example</h1>

<p align="center">Example project for existing Endpoint v1 OFTs that would like to migrate to using ULN 301 to utilize the new security and execution model and to be able to integrate Solana OFTs.</p>

:warning: The backward compatible Solana OFT (OFT202) will only work with Endpoint V1 OFT V2s. In other words, it will only work if the EVM OFT extended [OFTCoreV2](https://github.com/LayerZero-Labs/endpoint-v1-solidity-examples/blob/main/contracts/token/oft/v2/OFTCoreV2.sol) and will not work if the EVM OFT extended [OFTCore](https://github.com/LayerZero-Labs/endpoint-v1-solidity-examples/blob/main/contracts/token/oft/v1/OFTCore.sol).

## Example Overview

For this example, we will deploy the EndpointV1 OFT on Ethereum Sepolia and also OFT202 on Solana Devnet.

:warning: This example repo only works with `@openzeppelin/contracts@^4.0.0` and will not work for `@openzeppelin/contracts@^5.0.0` given the change in the constructor for `Ownable`. The EndpointV1 OFT contracts were built using `@openzeppelin/contracts@^4.0.0` so we emulate that in this repo.

## Preparing config files

In `hardhat.config.ts`, we have specified the `eid` for `sepolia-testnet` to use the EndpointV1 `eid`

```
networks: {
    'sepolia-testnet': {
        eid: EndpointId.SEPOLIA_TESTNET,
```

In `layerzero.config.ts`, for the pathway from Sepolia to Solana, we have specified the following:

- `sendLibrary`: `0x6862b19f6e42a810946B9C782E6ebE26Ad266C84` (SendUln301)
- `receiveLibraryConfig.receiveLibrary`: `0x5937A5fe272fbA38699A1b75B3439389EEFDb399` (ReceiveUln301)

To view the list of ULN addresses on all networks, refer to https://docs.layerzero.network/v2/developers/evm/technical-reference/deployed-contracts

## Developing Contracts

#### Installing dependencies

We recommend using `pnpm` as a package manager (but you can of course use a package manager of your choice):

```bash
pnpm install
```

#### Running tests

Similarly to the contract compilation, we support both `hardhat` and `forge` tests. By default, the `test` command will execute both:

```bash
pnpm test
```

#### Compiling your contracts

##### EVM (EndpointV1 OFT)

This project supports both `hardhat` and `forge` compilation. By default, the `compile` command will execute both:

```bash
pnpm compile
```

##### Solana (OFT202)

```bash
solana-keygen new -o target/deploy/endpoint-keypair.json --force
solana-keygen new -o target/deploy/oft-keypair.json --force

anchor keys sync
anchor keys list
```

Copy the OFT's programId and go into [programs/oft202/lib.rs](./programs/oft202/src/lib.rs). Note the following snippet:

```rust
declare_id!(Pubkey::new_from_array(program_id_from_env!(
    "OFT_ID",
    "3ThC8DDzimnnrt4mvJSKFpWQA3UvnbzKM3mT6SHoNQKu"
)));
```

Replace `3ThC8DDzimnnrt4mvJSKFpWQA3UvnbzKM3mT6SHoNQKu` with the programId that you have copied.

### Building and Deploying the Solana OFT Program

Ensure you have Docker running before running the build command.

#### Build the Solana OFT program

```bash
anchor build -v # verification flag enabled
```

## Deploying Contracts

### EVM (EndpointV1 OFT)

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

### Solana (OFT202)

Deploy the Solana OFT202 Program

```bash
solana program deploy --program-id target/deploy/oft-keypair.json target/verifiable/oft.so -u devnet --max-len $(wc -c < target/verifiable/oft.so)
```

Create the Solana OFT202 acounts

```bash
pnpm hardhat lz:oft:solana:create --eid 40168 --program-id <PROGRAM_ID>
```

Initialize the Solana OFT Config

:warning: Do this only when initializing the OFT for the first time. The only exception is if a new pathway is added later. If so, run this again to properly initialize the pathway.

```bash
npx hardhat lz:oapp:init:solana --oapp-config layerzero.config.ts --solana-secret-key <SECRET_KEY> --solana-program-id <PROGRAM_ID>
```

### Configuration

#### Update [layerzero.config.ts](./layerzero.config.ts)

Make sure to update [layerzero.config.ts](./layerzero.config.ts) and set `solanaContract.address` with the `oftStore` address.

```typescript
const solanaContract: OmniPointHardhat = {
  eid: EndpointId.SOLANA_V2_TESTNET,
  address: "", // <---TODO update this with the OFTStore address.
};
```

#### Run the wire command

```bash
npx hardhat lz:oapp:wire --oapp-config layerzero.config.ts --solana-secret-key <PRIVATE_KEY> --solana-program-id <PROGRAM_ID>
```

#### Call `setDstMinGas`

The script will set it to the default value of `1`, which is all that's needed in order to bypass gas assertion.

```bash
npx hardhat --network sepolia-testnet lz:lzapp:set-min-dst-gas --dst-eid 40168
```

### Calling Send

Sepolia V1 to Solana

```bash
npx hardhat --network sepolia-testnet lz:oft-v1:send --dst-eid 40168 --amount 1000000000000000000 --to <SOLANA_ADDRESS>
```

Solana to Sepolia V1

```bash
npx hardhat lz:oft:solana:send --amount 1000000000 --from-eid 40168 --to <EVM_ADDRESS> --to-eid 10161 --mint <MINT_ADDRESS> --program-id <PROGRAM_ID> --escrow <ESCROW>
```

Congratulations!

## Behind The Scenes

Below is an expanded README section that describes not only the overall configuration and wiring between the V1 and V2 endpoints but also explains the purpose of the overridden tasks provided in the repository:

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
