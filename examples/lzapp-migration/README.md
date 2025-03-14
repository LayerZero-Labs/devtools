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

## Requirements

- Rust `v1.75.0`
- Anchor `v0.29`
- Solana CLI `v1.17.31`
- Docker
- Node.js

## Setup

We recommend using `pnpm` as a package manager (but you can of course use a package manager of your choice).

[Docker](https://docs.docker.com/get-started/get-docker/) is required to build using anchor. We highly recommend that you use the most up-to-date Docker version to avoid any issues with anchor
builds.

:warning: You need anchor version `0.29` and solana version `1.17.31` specifically to compile the build artifacts. Using higher Anchor and Solana versions can introduce unexpected issues during compilation. See the following issues in Anchor's repo: [1](https://github.com/coral-xyz/anchor/issues/3089), [2](https://github.com/coral-xyz/anchor/issues/2835). After compiling the correct build artifacts, you can change the Solana version to higher versions.

### Install Rust

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
```

### Install Solana

```bash
sh -c "$(curl -sSfL https://release.solana.com/v1.17.31/install)"
```

### Install Anchor

Install and use the correct version

```bash
cargo install --git https://github.com/coral-xyz/anchor --tag v0.29.0 anchor-cli --locked
```

### Get the code

```bash
LZ_ENABLE_MIGRATION_EXAMPLE=1 npx create-lz-oapp@latest
```

### Get Devnet SOL

```bash
solana airdrop 5 -u devnet
```

We recommend that you request 5 devnet SOL, which should be sufficient for this walkthrough. For the example here, we will be using Solana Devnet. If you hit rate limits, you can also use the [official Solana faucet](https://faucet.solana.com/).

### Prepare `.env`

```bash
cp .env.example .env
```

In the `.env` just created, set `SOLANA_PRIVATE_KEY` to your private key value in base58 format. Since the locally stored keypair is in an integer array format, we'd need to encode it into base58 first.

You can run the `npx hardhat lz:solana:base-58` to output your private key in base58 format. Optionally, pass in a value for the `--keypair-file` flag if you want to use the keypair other than the default at `~/.config/solana/id.json`

Also set the `RPC_URL_SOLANA_TESTNET` value. Note that while the naming used here is `TESTNET`, it refers to the [Solana Devnet](https://docs.layerzero.network/v2/developers/evm/technical-reference/deployed-contracts#solana-testnet). We use `TESTNET` to keep it consistent with the existing EVM testnets.

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

### Prepare the OFT Program ID

Create `programId` keypair files by running:

```bash
solana-keygen new -o target/deploy/endpoint-keypair.json --force
solana-keygen new -o target/deploy/oft-keypair.json --force

anchor keys sync
```

:warning: `--force` flag overwrites the existing keys with the ones you generate.

Run

```
anchor keys list
```

to view the generated programIds (public keys). The output should look something like this:

```
oft: <OFT_PROGRAM_ID>
```

### Building and Deploying the Solana OFT Program

Ensure you have Docker running before running the build command.

#### Build the Solana OFT program

```bash
anchor build -v -e OFT_ID=<OFT_PROGRAM_ID>
```

## Deploying Contracts

### EVM (EndpointV1 OFT)

Set up deployer wallet/account:

- in `.env`, choose your preferred means of setting up your deployer wallet/account:

```
MNEMONIC="test test test test test test test test test test test junk"
or...
PRIVATE_KEY="0xabc...def"
```

To deploy your contracts to your desired EVM chains, run the following command in your project's folder:

```bash
npx hardhat lz:deploy
```

More information about available CLI arguments can be found using the `--help` flag:

```bash
npx hardhat lz:deploy --help

```

### Solana (OFT202)

#### Deploy the Solana OFT

While for building, we must use Solana `v1.17.31`, for deploying, we will be using `v1.18.26` as it provides an improved program deployment experience (i.e. ability to attach priority fees and also exact-sized on-chain program length which prevents needing to provide 2x the rent as in `v1.17.31`).

##### Temporarily switch to Solana `v1.18.26`

First, we switch to Solana `v1.18.26` (remember to switch back to `v1.17.31` later)

```bash
sh -c "$(curl -sSfL https://release.solana.com/v1.18.26/install)"
```

##### (Recommended) Deploying with a priority fee

This section applies if you are unable to land your deployment transaction due to network congestion.

:information_source: [Priority Fees](https://solana.com/developers/guides/advanced/how-to-use-priority-fees) are Solana's mechanism to allow transactions to be prioritized during periods of network congestion. When the network is busy, transactions without priority fees might never be processed. It is then necessary to include priority fees, or wait until the network is less congested. Priority fees are calculated as follows: `priorityFee = compute budget * compute unit price`. We can make use of priority fees by attaching the `--with-compute-unit-price` flag to our `solana program deploy` command. Note that the flag takes in a value in micro lamports, where 1 micro lamport = 0.000001 lamport.

You can run refer QuickNode's [Solana Priority Fee Tracker](https://www.quicknode.com/gas-tracker/solana) to know what value you'd need to pass into the `--with-compute-unit-price` flag.

##### Run the deploy command

```bash
solana program deploy --program-id target/deploy/oft-keypair.json target/verifiable/oft.so -u devnet --with-compute-unit-price <COMPUTE_UNIT_PRICE_IN_MICRO_LAMPORTS>
```

:information_source: the `-u` flag specifies the RPC URL that should be used. The options are `mainnet-beta, devnet, testnet, localhost`, which also have their respective shorthands: `-um, -ud, -ut, -ul`

:warning: If the deployment is slow, it could be that the network is congested and you might need to increase the priority fee.

##### Switch back to Solana `1.17.31`

:warning: After deploying, make sure to switch back to v1.17.31 after deploying. If you need to rebuild artifacts, you must use Solana CLI version `1.17.31` and Anchor version `0.29.0`

```bash
sh -c "$(curl -sSfL https://release.solana.com/v1.17.31/install)"
```

#### Create the Solana OFT202 acounts

:information_source: For **OFT** and **OFT Mint-and-Burn Adapter**, the SPL token's Mint Authority is set to the **Mint Authority Multisig**, which always has the **OFT Store** as a signer. The multisig is fixed to needing 1 of N signatures.

:information_source: For **OFT** and **OFT Mint-And-Burn Adapter**, you have the option to specify additional signers through the `--additional-minters` flag. If you choose not to, you must pass in `--only-oft-store true`, which means only the **OFT Store** will be a signer for the \_Mint Authority Multisig\*.

:warning: If you choose to go with `--only-oft-store`, you will not be able to add in other signers/minters or update the Mint Authority, and the Freeze Authority will be immediately renounced. The token Mint Authority will be fixed Mint Authority Multisig address while the Freeze Authority will be set to None.

#### For OFT:

```bash
pnpm hardhat lz:oft:solana:create --eid 40168 --program-id <PROGRAM_ID>
```

:warning: Use `--additional-minters` flag to add a CSV of additional minter addresses to the Mint Authority Multisig. If you do not want to, you must specify `--only-oft-store true`.

:information_source: You can also specify `--amount <AMOUNT>` to have the OFT minted to your deployer address upon token creation.

#### For OFTAdapter:

```bash
pnpm hardhat lz:oft-adapter:solana:create --eid 40168 --program-id <PROGRAM_ID> --mint <TOKEN_MINT> --token-program <TOKEN_PROGRAM_ID>
```

:information_source: You can use OFT Adapter if you want to use an existing token on Solana. For OFT Adapter, tokens will be locked when sending to other chains and unlocked when receiving from other chains.

#### For OFT Mint-And-Burn Adapter (MABA):

```bash
pnpm hardhat lz:oft:solana:create --eid 40168 --program-id <PROGRAM_ID> --mint <TOKEN_MINT> --token-program <TOKEN_PROGRAM_ID>
```

:information_source: You can use OFT Mint-And-Burn Adapter if you want to use an existing token on Solana. For OFT Mint-And-Burn Adapter, tokens will be burned when sending to other chains and minted when receiving from other chains.

:warning: You cannot use this option if your token's Mint Authority has been renounced.

:warning: Note that for MABA mode, before attempting any cross-chain transfers, **you must transfer the Mint Authority** for `lz_receive` to work, as that is not handled in the script (since you are using an existing token). If you opted for `--additional-minters`, then you must transfer the Mint Authority to the newly created multisig (this is the `mintAuthority` value in the `/deployments/solana-<mainnet/testnet>/OFT.json`). If not, then it should be set to the OFT Store address, which is `oftStore` in the same file.

### Configuration

#### Update [layerzero.config.ts](./layerzero.config.ts)

Make sure to update [layerzero.config.ts](./layerzero.config.ts) and set `solanaContract.address` with the `oftStore` address.

```typescript
const solanaContract: OmniPointHardhat = {
  eid: EndpointId.SOLANA_V2_TESTNET,
  address: "", // <---TODO update this with the OFTStore address.
};
```

#### Initialize the Solana OFT PeerConfig Account(s)

:warning: Do this only when initializing the OFT for the first time. The only exception is if a new pathway is added later. If so, run this again to properly initialize the pathway.

```bash
npx hardhat lz:oft:solana:init-config --oapp-config layerzero.config.ts --solana-eid <SOLANA_ENDPOINT_ID>
```

#### Run the wire command

```bash
npx hardhat lz:oapp:wire --oapp-config layerzero.config.ts --solana-eid <SOLANA_ENDPOINT_ID>
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

This example demonstrates how to establish cross-chain communication between a LayerZero V1 contract (running on **SEPOLIA_TESTNET**) and a LayerZero V2 contract (running on **SOLANA_V2_TESTNET**). The configuration allows the endpoints to exchange messages even though they run on different protocol versions by ensuring that the app-level messaging codec and underlying endpoint codecs are aligned.

## Key Configuration Details

- **Endpoints:**

  - **SEPOLIA_TESTNET (V1):** Represented by the contract `MyLzApp`.
  - **SOLANA_V2_TESTNET (V2):** Represented by the program `OFT202`.

- **Connection Parameters:**  
  For each connection, the configuration specifies:
  - **Send/Receive Library Addresses:** The libraries responsible for encoding and decoding messages.
  - **Executor & ULN Configurations:** These determine how messages are processed, including confirmation settings and DVN (Data Validation Node) requirements.
- **Wiring Process:**  
  The wiring tasks filter connections by endpoint version:
  - **V1 Endpoint Logic:** Custom configuration logic is applied for **SEPOLIA_TESTNET** to handle the specific requirements of a V1 LzApp.
  - **V2 Endpoint Logic:** The default logic is used for **SOLANA_V2_TESTNET**, ensuring that the V2 OApp receives the configuration it expects.

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
   - Adjust the deployed contracts so that a V1 LzApp (**SEPOLIA_TESTNET**) can communicate with a V2 OApp (**SOLANA_V2_TESTNET**).

By overriding these tasks, the example streamlines the complex process of ensuring compatibility between different LayerZero versions, allowing developers to focus on building omnichain solutions without being bogged down by the underlying cross-chain configuration details.

<br></br>

<p align="center">
  Join our <a href="https://layerzero.network/community" style="color: #a77dff">community</a>! | Follow us on <a href="https://x.com/LayerZero_Labs" style="color: #a77dff">X (formerly Twitter)</a>
</p>

### Troubleshooting

For the Solana-related steps, you may also refer to the default [Solana OFT example README](https://github.com/LayerZero-Labs/devtools/tree/main/examples/oft-solana) which might have more elaboration on the Solana side.

Refer to the [Solana Troubleshooting page on the LayerZero Docs](https://docs.layerzero.network/v2/developers/solana/troubleshooting/common-errors) to see how to solve common error when deploying Solana OFTs.
