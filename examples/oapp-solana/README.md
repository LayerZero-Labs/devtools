<p align="center">
  <a href="https://layerzero.network">
    <img alt="LayerZero" style="width: 400px" src="https://docs.layerzero.network/img/LayerZero_Logo_White.svg"/>
  </a>
</p>

<p align="center">
  <a href="https://layerzero.network" style="color: #a77dff">Homepage</a> | <a href="https://docs.layerzero.network/" style="color: #a77dff">Docs</a> | <a href="https://layerzero.network/developers" style="color: #a77dff">Developers</a>
</p>

<h1 align="center">OApp Example</h1>

<p align="center">
  <a href="https://docs.layerzero.network/v2/concepts/getting-started/what-is-layerzero" style="color: #a77dff">Core Concepts</a> | <a href="https://docs.layerzero.network/v2/developers/evm/configuration/options" style="color: #a77dff">Message Execution Options</a> | <a href="https://docs.layerzero.network/v2/deployments/deployed-contracts" style="color: #a77dff">Endpoint Addresses</a>
</p>

<p align="center">Template project for getting started with LayerZero's  <code>OApp</code> development for Solana <> EVM.</p>

<br>
This is a simple cross-chain string-passing OApp example involving EVM and Solana.

## How a Solana OApp works

For a more thorough walkthrough of how a Solana OApp works, refer to [Solana OApp Reference](https://docs.layerzero.network/v2/developers/solana/oapp/overview) in our docs. The reference details the accounts that are required, which will help you identify modifications needed to support your specific use case.

## Requirements

- Rust `nightly-2025-05-01`
- Anchor `v0.31.1`
- Solana CLI `v2.2.20`
- Docker
- Node.js

## Setup

We recommend using `pnpm` as a package manager (but you can of course use a package manager of your choice).

[Docker](https://docs.docker.com/get-started/get-docker/) is required to build using anchor. We highly recommend that you use the most up-to-date Docker version to avoid any issues with anchor
builds.

### Install Rust

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
```

### Install Solana

```bash
sh -c "$(curl -sSfL https://release.anza.xyz/v2.2.20/install)"
```

If this is your first time installing the Solana CLI, run the following to [generate a keypair](https://solana.com/docs/intro/installation#create-wallet) at the default keypair path (`~/.config/solana/id.json`):

```bash
solana-keygen new
```

### Install Anchor

Install and use the correct version

```bash
cargo install --git https://github.com/solana-foundation/anchor --tag v0.31.1 anchor-cli --locked
```

### Get the code

```bash
LZ_ENABLE_SOLANA_OAPP_EXAMPLE=1 npx create-lz-oapp@latest
```

The CLI will also automatically run pnpm install for you.

Make sure you select the **OApp (Solana)** example from the dropdown:

```bash
✔ Where do you want to start your project? … ./example
? Which example would you like to use as a starting point? › - Use arrow-keys. Return to submit.
    OApp
    OFT
    OFTAdapter
    ONFT721
    OFT (Solana)
❯   OApp (Solana)
```

## Developing Contracts

#### Compiling your contracts

To compile the Solidity OApp contract and build the Solana OApp program, run:

```bash
pnpm compile
```

#### Get Devnet SOL

```bash
solana airdrop 5 -u devnet
```

We recommend that you request 5 devnet SOL, which should be sufficient for this walkthrough. For the example here, we will be using Solana Devnet. If you hit rate limits, you can also use the [official Solana faucet](https://faucet.solana.com/).

#### Prepare `.env`

Copy the example `.env` file:

```bash
cp .env.example .env
```

and fill up the values.

##### EVM Private Key

Choose your preferred means of setting up your EVM deployer wallet/account:

```
MNEMONIC="test test test test test test test test test test test junk"
or...
PRIVATE_KEY="0xabc...def"
```

##### Solana Keypair

By default, the scripts will use the keypair at the default location `~/.config/solana/id.json`. If you want to use this keypair, there is no need to set any environment variable. There will, however, be a prompt when running certain commands to confirm that you want to use the default keypair.

If you wish to use a different keypair, then you can set either of the following in the `.env`:

1. `SOLANA_PRIVATE_KEY` - this can be either in base58 string format (i.e. when imported from a wallet) or the Uint8 Array in string format (all in one line, e.g. `[1,1,...1]`).

2. `SOLANA_KEYPAIR_PATH` - the location to the keypair file that you want to use.

##### Solana RPC

Also set the `RPC_URL_SOLANA_TESTNET` value. Note that while the naming used here is `TESTNET`, it refers to the [Solana Devnet](https://docs.layerzero.network/v2/developers/evm/technical-reference/deployed-contracts#solana-testnet). We use `TESTNET` to keep it consistent with the existing EVM testnets.

## Deploying Contracts

### Prepare the OApp Program ID

Create the MyOApp `programId` keypair file by running:

```bash
solana-keygen new -o target/deploy/my_oapp-keypair.json
anchor keys sync
```

Run

```
anchor keys list
```

to view the generated programId (public keys). The output should look something like this:

```
my_oapp: <OAPP_PROGRAM_ID>
```

Copy the OApp's program ID, which you will use in the build step.

### Building and Deploying the Solana MyOApp Program

Ensure you have Docker running before running the build command.

#### Build the Solana MyOApp program

```bash
anchor build -v -e MYOAPP_ID=<OAPP_PROGRAM_ID>
```

Where `<OAPP_PROGRAM_ID>` is replaced with your OApp Program ID copied from the previous step.

#### Deploy the Solana OApp

##### Run the deploy command

```bash
solana program deploy --program-id target/deploy/my_oapp-keypair.json target/verifiable/my_oapp.so -u devnet --with-compute-unit-price <COMPUTE_UNIT_PRICE_IN_MICRO_LAMPORTS>
```

:information_source: `--with-compute-unit-price` takes in the microlamport value applied per compute unit. This is how we can attach a [priority fee](https://solana.com/vi/developers/guides/advanced/how-to-use-priority-fees) to our deployment.

:information_source: the `-u` flag specifies the RPC URL that should be used. The options are `mainnet-beta, devnet, testnet, localhost`, which also have their respective shorthands: `-um, -ud, -ut, -ul`

:warning: If the deployment is slow, it could be that the network is congested and you might need to increase the priority fee.

### Initialize the Solana OApp account

Solana programs require accounts to be initialized before state can be written.

Run the following to init the OApp store account:

```bash
npx hardhat lz:oapp:solana:create --eid 40168 --program-id <PROGRAM_ID>
```

:information_source: The address of this account (and **not** the OApp program ID) is what will be used as the OApp address in the context of cross-chain messaging.

:information_source: The example `init_store` method being called by this task can be called by anyone, and can only be called once. Modify it accordingly if for your use case it should be access controlled or callable multiple times based on some param value.

##### Deploy the EVM OApp

To deploy your Solidity contracts to your desired EVM blockchain(s), run the following command in your project's folder:

```bash
npx hardhat lz:deploy
```

You will be presented with a list of networks that have been defined via your `hardhat.config.ts`. Select the ones you want to deploy to.

More information about available CLI arguments can be found using the `--help` flag:

```bash
npx hardhat lz:deploy --help
```

### Wiring

Wiring will apply the settings configured in the [LZ config](https://docs.layerzero.network/v2/concepts/glossary#lz-config) file. By default, this file is named `layerzero.config.ts`.

#### Run the Solana `init-config` task

This step is required only for the Solana OApp and is again required due to the need to init accounts explicitly.

The task initializes the OApp's SendConfig and ReceiveConfig Accounts.

You need to do this only when initializing the OApp for the first time. However, if a new pathway involving Solana is added, you need to run this again as the SendConfig and ReceiveConfig accounts are required per peer.

```bash
npx hardhat lz:oapp:solana:init-config --oapp-config layerzero.config.ts
```

#### Run the [wire task](https://docs.layerzero.network/v2/concepts/glossary#wire--wiring)

Run the following to [wire](https://docs.layerzero.network/v2/concepts/glossary#wire--wiring) the pathways specified in your `layerzero.config.ts`

```bash
npx hardhat lz:oapp:wire --oapp-config layerzero.config.ts
```

With a squads multisig, you can simply append the `--multisig-key` flag to the end of the above command.

### Send Messages

With your OApps wired, you can now send a message.

Send from Solana Devnet (40168) to Optimism Sepolia (40232) :

```bash
npx hardhat lz:oapp:send --from-eid 40168 --dst-eid 40232 --message "Hello from Solana Devnet"
```

Send from Optimism Sepolia (40232) to Solana Devnet (40168) :

```bash
npx hardhat --network optimism-testnet lz:oapp:send --from-eid 40232 --dst-eid 40168 --message "Hello from Optimism Sepolia"
```

:information_source: For the list of supported chains and their endpoint ID's refer to the [Deployed Endpoints](https://docs.layerzero.network/v2/deployments/deployed-contracts) page.

<br>

Congratulations, you have now successfully set up an EVM <> Solana OApp.

### Running tests

The `test` command will execute the hardhat and forge tests:

```bash
pnpm test
```

<br></br>

<p align="center">
  Join our <a href="https://layerzero.network/community" style="color: #a77dff">community</a>! | Follow us on <a href="https://x.com/LayerZero_Labs" style="color: #a77dff">X (formerly Twitter)</a>
</p>
