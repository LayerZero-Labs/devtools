<p align="center">
  <a href="https://layerzero.network">
    <img alt="LayerZero" style="width: 400px" src="https://docs.layerzero.network/img/LayerZero_Logo_White.svg"/>
  </a>
</p>

<p align="center">
  <a href="https://layerzero.network" style="color: #a77dff">Homepage</a> | <a href="https://docs.layerzero.network/" style="color: #a77dff">Docs</a> | <a href="https://layerzero.network/developers" style="color: #a77dff">Developers</a>
</p>

<h1 align="center">Omnichain Fungible Token (OFT) Solana Example</h1>

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
sh -c "$(curl -sSfL https://release.anza.xyz/v1.17.31/install)"
```

### Install Anchor

Install and use the correct version

```bash
cargo install --git https://github.com/coral-xyz/anchor --tag v0.29.0 anchor-cli --locked
```

### Get the code

```bash
LZ_ENABLE_SOLANA_OFT_EXAMPLE=1 npx create-lz-oapp@latest
```

Make sure you select the **OFT (Solana)** example from the dropdown:

```bash
✔ Where do you want to start your project? … ./example
? Which example would you like to use as a starting point? › - Use arrow-keys. Return to submit.
    OApp
    OFT
    OFTAdapter
    ONFT721
❯   OFT (Solana)
```

### Installing Dependencies

```bash
pnpm install
```

### Running tests

```bash
pnpm test
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

#### Solana Keypair

By default, the scripts will use the keypair at the default location `~/.config/solana/id.json`. If you want to use this keypair, there is no need to set any environment variable. There will, however, be a prompt when running certain commands to confirm that you want to use the default keypair.

If you wish to use a different keypair, then you can set either of the following in the `.env`:

1. `SOLANA_PRIVATE_KEY` - this can be either in base58 string format (i.e. when imported from a wallet) or the Uint8 Array in string format (all in one line, e.g. `[1,1,...1]`).

2. `SOLANA_KEYPAIR_PATH` - the location to the keypair file that you want to use.

#### Solana RPC

Also set the `RPC_URL_SOLANA_TESTNET` value. Note that while the naming used here is `TESTNET`, it refers to the [Solana Devnet](https://docs.layerzero.network/v2/developers/evm/technical-reference/deployed-contracts#solana-testnet). We use `TESTNET` to keep it consistent with the existing EVM testnets.

## Deploy

### Prepare the OFT Program ID

Create the OFT `programId` keypair by running:

```bash
anchor keys sync -p oft
```

The above command will generate a keypair for the OFT program in your workspace if it doesn't yet exist, and also automatically update `Anchor.toml` to use the generated keypair's public key. The default path for the program's keypair will be `target/deploy/oft-keypair.json`.

View the program ID's based on the generated keypairs:

```
anchor keys list
```

You will see an output such as:

```bash
endpoint: H3SKp4cL5rpzJDntDa2umKE9AHkGiyss1W8BNDndhHWp
oft: DLZdefiak8Ur82eWp3Fii59RiCRZn3SjNCmweCdhf1DD
```

Copy the `oft` program ID value for use in the build step later.

### Building and Deploying the Solana OFT Program

Ensure you have Docker running before running the build command.

#### Build the Solana OFT program

```bash
anchor build -v -e OFT_ID=<OFT_PROGRAM_ID>
```

Where `<OFT_PROGRAM_ID>` is replaced with your OFT Program ID copied from the previous step.

<!-- TODO: move the following 'preview rent costs' into docs and replace below with link to docs page -->

#### Preview Rent Costs for the Solana OFT

:information_source: The majority of the SOL required to deploy your program will be for [**rent**](https://solana.com/docs/core/fees#rent) (specifically, for the minimum balance of SOL required for [rent-exemption](https://solana.com/docs/core/fees#rent-exempt)), which is calculated based on the amount of bytes the program or account uses. Programs typically require more rent than PDAs as more bytes are required to store the program's executable code.

In our case, the OFT Program's rent accounts for roughly 99% of the SOL needed during deployment, while the other accounts' rent, OFT Store, Mint, Mint Authority Multisig and Escrow make up for only a fraction of the SOL needed.

You can preview how much SOL would be needed for the program account. Note that the total SOL required would to be slightly higher than just this, to account for the other accounts that need to be created.

```bash
solana rent $(wc -c < target/verifiable/oft.so)
```

You should see an output such as

```bash
Rent-exempt minimum: 3.87415872 SOL
```

:information_source: LayerZero's default deployment path for Solana OFTs require you to deploy your own OFT program as this means you own the Upgrade Authority and don't rely on LayerZero to manage that authority for you. Read [this](https://neodyme.io/en/blog/solana_upgrade_authority/) to understand more no why this is important.

#### Deploy the Solana OFT

While for building, we must use Solana `v1.17.31`, for deploying, we will be using `v1.18.26` as it provides an improved program deployment experience (i.e. ability to attach priority fees and also exact-sized on-chain program length which prevents needing to provide 2x the rent as in `v1.17.31`).

##### Temporarily switch to Solana `v1.18.26`

First, we switch to Solana `v1.18.26` (remember to switch back to `v1.17.31` later)

```bash
sh -c "$(curl -sSfL https://release.anza.xyz/v1.18.26/install)"
```

##### (Recommended) Deploying with a priority fee

The `deploy` command will run with a priority fee. Read the section on ['Deploying Solana programs with a priority fee
'](https://docs.layerzero.network/v2/developers/solana/technical-reference/solana-guidance#deploying-solana-programs-with-a-priority-fee) to learn more.

##### Run the deploy command

```bash
solana program deploy --program-id target/deploy/oft-keypair.json target/verifiable/oft.so -u devnet --with-compute-unit-price <COMPUTE_UNIT_PRICE_IN_MICRO_LAMPORTS>
```

:information_source: the `-u` flag specifies the RPC URL that should be used. The options are `mainnet-beta, devnet, testnet, localhost`, which also have their respective shorthands: `-um, -ud, -ut, -ul`

:warning: If the deployment is slow, it could be that the network is congested and you might need to increase the priority fee.

##### Switch back to Solana `1.17.31`

:warning: After deploying, make sure to switch back to v1.17.31 after deploying. If you need to rebuild artifacts, you must use Solana CLI version `1.17.31` and Anchor version `0.29.0`

```bash
sh -c "$(curl -sSfL https://release.anza.xyz/v1.17.31/install)"
```

### Create the Solana OFT

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

### Note on the LZ Config file, [layerzero.config.ts](./layerzero.config.ts)

In [layerzero.config.ts](./layerzero.config.ts), the `solanaContract.address` is auto-populated with the `oftStore` address from the deployment file, which has the default path of `deployments/solana-<mainnet/testnet>`.

```typescript
const solanaContract: OmniPointHardhat = {
  eid: EndpointId.SOLANA_V2_TESTNET,
  address: getOftStoreAddress(EndpointId.SOLANA_V2_TESTNET),
};
```

:warning: Ensure that you `address` is specified only for the solana contract object. Do not specify addresses for the EVM chain contract objects. Under the hood, we use `hardhat-deploy` to retrieve the contract addresses of the deployed EVM chain contracts. You will run into an error if you specify `address` for an EVM chain contract object.

### Deploy a sepolia OFT peer

```bash
pnpm hardhat lz:deploy # follow the prompts
```

Note: If you are on testnet, consider using `MyOFTMock` to allow test token minting. If you do use `MyOFTMock`, make sure to update the `sepoliaContract.contractName` in [layerzero.config.ts](./layerzero.config.ts) to `MyOFTMock`.

#### Initialize the OFT Program's SendConfig and ReceiveConfig Accounts

:warning: Do this only when initializing the OFT for the first time. The only exception is if a new pathway is added later. If so, run this again to properly initialize the pathway.

Run the following command to init the pathway config. This step is unique to pathways that involve Solana.

```bash
npx hardhat lz:oft:solana:init-config --oapp-config layerzero.config.ts
```

### Wire

Run the following to wire the pathways specified in your `layerzero.config.ts`

```bash
npx hardhat lz:oapp:wire --oapp-config layerzero.config.ts
```

With a squads multisig, you can simply append the `--multisig-key` flag to the end of the above command.

### Mint OFT on Solana

This is only relevant for **OFT**. If you opted to include the `--amount` flag in the create step, that means you already have minted some Solana OFT and you can skip this section.

:information_source: This is only possible if you specified your deployer address as part of the `--additional-minters` flag when creating the Solana OFT. If you had chosen `--only-oft-store true`, you will not be able to mint your OFT on Solana.

First, you need to create the Associated Token Account for your address.

```bash
spl-token create-account <TOKEN_MINT>
```

Then, you can mint. Note that the `spl-token` CLI expects the human-readable token amount and not the raw integer value for the `<AMOUNT>` param. This means, to mint 1 OFT, you would specify `1` as the amount. The `spl-token` handles the multiplication by `10^decimals` for you.

```bash
spl-token mint <TOKEN_MINT> <AMOUNT> --multisig-signer ~/.config/solana/id.json --owner <MINT_AUTHORITY>
```

:information_source: `~/.config/solana/id.json` assumes that you will use the keypair in the default location. To verify if this path applies to you, run `solana config get` and not the keypair path value.

:information_source: You can get the `<MINT_AUTHORITY>` address from [deployments/solana-testnet/OFT.json](deployments/solana-testnet/OFT.json).

### Set Message Execution Options

Refer to [Generating Execution Options](https://docs.layerzero.network/v2/developers/solana/gas-settings/options#generating-options) to learn how to build the options param for send transactions.

Note that you will need to either enable `enforcedOptions` in [./layerzero.config.ts](./layerzero.config.ts) or pass in a value for `_options` when calling `send()`. Having neither will cause a revert when calling send().

For this example, we have already included `enforcedOptions` by default in the `layerzero.config.ts`, which will take effect in the wiring step.

#### (Optional) If specifying the `_options` value when calling `send()`

It's only necessary to specify `_options` if you do not have `enforcedOptions`.

For Sepolia -> Solana, you should pass in the options value into the script at [tasks/evm/send.ts](./tasks/evm/send.ts) as the value for `sendParam.extraOptions`.

For Solana -> Sepolia, you should pass in the options value into the script at [tasks/solana/sendOFT.ts](./tasks/solana/sendOFT.ts) as the value for `options` for both in `quote` and `send`.

### Send

#### Send From Solana Devnet -> To Ethereum Sepolia

```bash
npx hardhat lz:oft:send --src-eid 40168 --dst-eid 40161 --to <RECEIVER_BYTES20>  --amount <AMOUNT>
```

#### Send From Ethereum Sepolia -> To Solana Devnet

```bash
npx hardhat lz:oft:send --src-eid 40161 --dst-eid 40168 --to <RECEIVER_BASE58>  --amount <AMOUNT>
```

For more information, run:

```bash
npx hardhat lz:oft:send --help
```

### Set a new Mint Authority Multisig

If you are not happy with the deployer being a mint authority, you can create and set a new mint authority by running:

```bash
pnpm hardhat lz:oft:solana:setauthority --eid <SOLANA_EID> --mint <TOKEN_MINT> --program-id <PROGRAM_ID> --escrow <ESCROW> --additional-minters <MINTERS_CSV>
```

The `OFTStore` is automatically added as a mint authority to the newly created mint authority, and does not need to be
included in the `--additional-minters` list.

## Appendix

### Solana Program Verification

Refer to [Verify the OFT Program](https://docs.layerzero.network/v2/developers/solana/oft/program#optional-verify-the-oft-program).

### Transferring ownership

Ownership of OFTs can be transferred via running the wire command after the appropriate changes are made to the LZ Config file (`layerzero.config.ts`). You need to first set the `delegate` value, and then only the `owner` value.

**First, set the `delegate`.**

How to set delegate: https://docs.layerzero.network/v2/developers/evm/create-lz-oapp/configuring-pathways#adding-delegate

Now run

```
npx hardhat lz:oapp:wire --oapp-config layerzero.config.ts
```

and execute the transactions.

**Then, set the `owner`.**

How to set owner: https://docs.layerzero.network/v2/developers/evm/create-lz-oapp/configuring-pathways#adding-owner

Now, run

```
npx hardhat lz:ownable:transfer-ownership --oapp-config layerzero.config.ts
```

### Troubleshooting

Refer to the [Solana Troubleshooting page on the LayerZero Docs](https://docs.layerzero.network/v2/developers/solana/troubleshooting/common-errors) to see how to solve common error when deploying Solana OFTs.
