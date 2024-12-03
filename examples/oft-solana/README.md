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
sh -c "$(curl -sSfL https://release.solana.com/v1.17.31/install)"
```

### Install Anchor

Install and use the correct version

```bash
cargo install --git https://github.com/coral-xyz/anchor --tag v0.29.0 anchor-cli --locked
```

### Get the code

```bash
LZ_ENABLE_EXPERIMENTAL_SOLANA_OFT_EXAMPLE=1 npx create-lz-oapp@latest
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

In the `.env` just created, set `SOLANA_PRIVATE_KEY` to your private key value in base58 format. Since the locally stored keypair is in an integer array format, we'd need to encode it into base58 first. You can create a temporary script called `getBase58Pk.js` in your project root with the following contents:

<details>
  <summary> View `getBase58Pk.js` script </summary>

```js
import fs from "fs";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";

const keypairFilePath = `<KEYPAIR_FILE_PATH_HERE>`; // you can view this by running `solana config get`

const data = fs.readFileSync(keypairFilePath, "utf8");
const keypairJson = JSON.parse(data);
const keypair = Keypair.fromSecretKey(Uint8Array.from(keypairJson));
const base58EncodedPrivateKey = bs58.encode(keypair.secretKey);

console.log(base58EncodedPrivateKey);
```

Then, run `node getBase58Pk.js`

</details>

Also set the `RPC_URL_SOLANA_TESTNET` value. Note that while the naming used here is `TESTNET`, it refers to the [Solana Devnet](https://docs.layerzero.network/v2/developers/evm/technical-reference/deployed-contracts#solana-testnet). We use `TESTNET` to keep it consistent with the existing EVM testnets.

## Deploy

### Prepare the OFT Program ID

Create `programId` keypair files by running:

```bash
solana-keygen new -o target/deploy/endpoint-keypair.json --force
solana-keygen new -o target/deploy/oft-keypair.json --force

anchor keys sync
```

:warning: `--force` flag overwrites the existing keys with the ones you generate.

Run `anchor keys list` to view the generated programIds (public keys). The output should look something like this:

```
endpoint: <ENDPOINT_PROGRAM_ID>
oft: <OFT_PROGRAM_ID>
```

Copy the OFT's programId and go into [lib.rs](./programs/oft/src/lib.rs). Note the following snippet:

```
declare_id!(Pubkey::new_from_array(program_id_from_env!(
    "OFT_ID",
    "9UovNrJD8pQyBLheeHNayuG1wJSEAoxkmM14vw5gcsTT"
)));
```

Replace `9UovNrJD8pQyBLheeHNayuG1wJSEAoxkmM14vw5gcsTT` with the programId that you have copied.

### Building and Deploying the Solana OFT Program

Ensure you have Docker running before running the build command.

```bash
anchor build -v # verification flag enabled
solana program deploy --program-id target/deploy/oft-keypair.json target/verifiable/oft.so -u devnet
```

:information_source: the `-u` flag specifies the RPC URL that should be used. The options are `mainnet-beta, devnet, testnet, localhost`, which also have their respective shorthands: `-um, -ud, -ut, -ul`

:warning: If the deployment is slow, it could be that the network is congested. If so, you can either wait it out or opt to include a `priorityFee`.

### (optional) Deploying with a priority fee

This section only applies if you are unable to land your deployment transaction due to network congestion.

:information_source: [Priority Fees](https://solana.com/developers/guides/advanced/how-to-use-priority-fees) are Solana's mechanism to allow transactions to be prioritized during periods of network congestion. When the network is busy, transactions without priority fees might never be processed. It is then necessary to include priority fees, or wait until the network is less congested. Priority fees are calculated as follows: `priorityFee = compute budget * compute unit price`. We can make use of priority fees by attaching the `--with-compute-unit-price` flag to our `solana program deploy` command. Note that the flag takes in a value in micro lamports, where 1 micro lamport = 0.000001 lamport.

<details>
  <summary>View instructions</summary>
  Because building requires Solana CLI version `1.17.31`, but priority fees are only supported in version `1.18`, we will need to switch Solana CLI versions temporarily.

```bash
sh -c "$(curl -sSfL https://release.solana.com/v1.18.26/install)"
```

You can run `npx hardhat lz:solana:get-priority-fees --eid <SOLANA_EID> --address <PROGRAM_ID>` and use the `averageFeeExcludingZeros` value.

:information_source: The average is calculated from getting the prioritization fees across recent blocks, but some blocks may have `0` as the prioritization fee. `averageFeeExcludingZeros` ignores blocks with `0` prioritization fees.

Now let's rerun the deploy command, but with the compute unit price flag.

```bash
solana program deploy --program-id target/deploy/oft-keypair.json target/verifiable/oft.so -u devnet --with-compute-unit-price <COMPUTE_UNIT_PRICE_IN_MICRO_LAMPORTS>
```

:warning: Make sure to switch back to v1.17.31 after deploying. If you need to rebuild artifacts, you must use Solana CLI version `1.17.31` and Anchor version `0.29.0`

```bash
sh -c "$(curl -sSfL https://release.solana.com/v1.17.31/install)"
```

</details>

### Create the Solana OFT

:information_source: For **OFT** and **OFT Mint-and-Burn Adapter**, the SPL token's Mint Authority is set to the **Mint Authority Multisig**, which always has the **OFT Store** as a signer. The multisig is fixed to needing 1 of N signatures.

:information_source: For **OFT** and **OFT Mint-And-Burn Adapter**, you have the option to specify additional signers through the `--additional-minters` flag. If you choose not to, you must pass in `--only-oft-store true`, which means only the **OFT Store** will be a signer for the \_Mint Authority Multisig\*.

:warning: If you choose to go with `--only-oft-store`, you will not be able to add in other signers/minters or update the Mint Authority. You will also not be able to renounce the Freeze Authority. The Mint Authority and Freeze Authority will be fixed to the Mint Authority Multisig address.

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

#### For OFT Mint-And-Burn Adapter (MABA):

```bash
pnpm hardhat lz:oft:solana:create --eid 40168 --program-id <PROGRAM_ID> --mint <TOKEN_MINT> --token-program <TOKEN_PROGRAM_ID>
```

:warning: Use `--additional-minters` flag to add a CSV of additional minter addresses to the Mint Authority Multisig. If you do not want to, you must specify `--only-oft-store true`.

### Update [layerzero.config.ts](./layerzero.config.ts)

Make sure to update [layerzero.config.ts](./layerzero.config.ts) and set `solanaContract.address` with the `oftStore` address.

```typescript
const solanaContract: OmniPointHardhat = {
  eid: EndpointId.SOLANA_V2_TESTNET,
  address: "", // <---TODO update this with the OFTStore address.
};
```

### Deploy a sepolia OFT peer

```bash
pnpm hardhat lz:deploy # follow the prompts
```

Note: If you are on testnet, consider using `MyOFTMock` to allow test token minting. If you do use `MyOFTMock`, make sure to update the `sepoliaContract.contractName` in [layerzero.config.ts](./layerzero.config.ts) to `MyOFTMock`.

### Initialize the Solana OFT

:warning: Only do this the first time you are initializing the OFT.

```bash
npx hardhat lz:oapp:init:solana --oapp-config layerzero.config.ts --solana-secret-key <SECRET_KEY> --solana-program-id <PROGRAM_ID>
```

:information_source: `<SECRET_KEY>` should also be in base58 format.

### Wire

```bash
npx hardhat lz:oapp:wire --oapp-config layerzero.config.ts --solana-secret-key <PRIVATE_KEY> --solana-program-id <PROGRAM_ID>
```

With a squads multisig, you can simply append the `--multisigKey` flag to the end of the above command.

### Mint OFT on Solana

This is only relevant for **OFT**. If you opted to include the `--amount` flag in the create step, that means you already have minted some Solana OFT and you can skip this section.

:information_source: This is only possible if you specified your deployer address as part of the `--additional-minters` flag when creating the Solana OFT. If you had chosen `--only-oft-store true`, you will not be able to mint your OFT on Solana.

First, you need to create the Associated Token Account for your address.

```bash
spl-token create-account <TOKEN_MINT>
```

Then, you can mint.

```bash
spl-token mint <TOKEN_MINT> <AMOUNT> --multisig-signer ~/.config/solana/id.json --owner <MINT_AUTHORITY>
```

:information_source: `~/.config/solana/id.json` assumes that you will use the keypair in the default location. To verify if this path applies to you, run `solana config get` and not the keypair path value.
:information_source: You can get the `<MINT_AUTHORITY>` address from [deployments/solana-testnet/OFT.json](deployments/solana-testnet/OFT.json).

### Set Message Execution Options

Refer to [Generating Execution Options](https://docs.layerzero.network/v2/developers/solana/gas-settings/options#generating-options) to learn how to build the options param for send transactions.

Note that you will need to either enable `enforcedOptions` in [./layerzero.config.ts](./layerzero.config.ts) or pass in a value for `_options` when calling `send()`. Having neither will cause a revert when calling send().

#### Specifing the `_options` value when calling `send()`

For Sepolia -> Solana, you should pass in the options value into the script at [tasks/evm/send.ts](./tasks/evm/send.ts) as the value for `sendParam.extraOptions`.
For Solana -> Sepolia, you should pass in the options value into the script at [tasks/solana/sendOFT.ts](./tasks/solana/sendOFT.ts) as the value for `options` for both in `quote` and `send`.

### Send

#### Send SOL -> Sepolia

```bash
npx hardhat lz:oft:solana:send --amount <AMOUNT> --from-eid 40168 --to <TO> --to-eid 40161 --mint <MINT_ADDRESS> --program-id <PROGRAM_ID> --escrow <ESCROW>
```

#### Send Sepolia -> SOL

```bash
npx hardhat --network sepolia-testnet send --dst-eid 40168 --amount <AMOUNT> --to <TO>
```

:information_source: If you encounter an error such as `No Contract deployed with name`, ensure that the `tokenName` in the task defined in `tasks/evm/send.ts` matches the deployed contract name.

### Set a new Mint Authority Multisig

If you are not happy with the deployer being a mint authority, you can create and set a new mint authority by running:

```bash
pnpm hardhat lz:oft:solana:setauthority --eid <SOLANA_EID> --mint <TOKEN_MINT> --program-id <PROGRAM_ID> --escrow <ESCROW> --additional-minters <MINTERS_CSV>
```

The `OFTStore` is automatically added as a mint authority to the newly created mint authority, and does not need to be
included in the `--additional-minters` list.

## Common Errors

### "AnchorError occurred. Error Code: DeclaredProgramIdMismatch. Error Number: 4100. Error Message: The declared program id does not match the actual program id."

This is often caused by failing to manually update [lib.rs](./programs/oft/src/lib.rs) with the updated program ID prior
to running `solana program deploy...`.

### `anchor build -v` fails

There are known issues with downloading rust crates in older versions of docker. Please ensure you are using the most
up-to-date docker version. The issue manifests similar to:

```bash
anchor build -v
Using image "backpackapp/build:v0.29.0"
Run docker image
WARNING: The requested image's platform (linux/amd64) does not match the detected host platform (linux/arm64/v8) and no specific platform was requested
417a5b38e427cbc75ba2440fedcfb124bbbfe704ab73717382e7d644d8c021b1
Building endpoint manifest: "programs/endpoint-mock/Cargo.toml"
info: syncing channel updates for '1.75.0-x86_64-unknown-linux-gnu'
info: latest update on 2023-12-28, rust version 1.75.0 (82e1608df 2023-12-21)
info: downloading component 'cargo'
info: downloading component 'clippy'
info: downloading component 'rust-docs'
info: downloading component 'rust-std'
info: downloading component 'rustc'
info: downloading component 'rustfmt'
info: installing component 'cargo'
info: installing component 'clippy'
info: installing component 'rust-docs'
info: installing component 'rust-std'
info: installing component 'rustc'
info: installing component 'rustfmt'
    Updating crates.io index
Cleaning up the docker target directory
Removing the docker container
anchor-program
Error during Docker build: Failed to build program
Error: Failed to build program
```

Note: The error occurs after attempting to update crates.io index.

### When sending tokens from Solana `The value of "offset" is out of range. It must be >= 0 and <= 32. Received 41`

If you receive this error, it may be caused by an improperly configured executor address in your `layerzero.config.ts`
configuration file. The value for this address is not the programId from listed as `LZ Executor` in the
[deployed endpoints page](https://docs.layerzero.network/v2/developers/evm/technical-reference/deployed-contracts).
Instead, this address is the Executor Config PDA. It can be derived using the following:

```typescript
const executorProgramId = "6doghB248px58JSSwG4qejQ46kFMW4AMj7vzJnWZHNZn";
console.log(new ExecutorPDADeriver("executorProgramId").config());
```

The result is:

```text
AwrbHeCyniXaQhiJZkLhgWdUCteeWSGaSN1sTfLiY7xK
```

The full error message looks similar to below:

```text
RangeError [ERR_OUT_OF_RANGE]: The value of "offset" is out of range. It must be >= 0 and <= 32. Received 41
    at new NodeError (node:internal/errors:405:5)
    at boundsError (node:internal/buffer:88:9)
    at Buffer.readUInt32LE (node:internal/buffer:222:5)
    at Object.read (/Users/user/go/src/github.com/paxosglobal/solana-programs-internal/paxos-lz-oft/node_modules/@metaplex-foundation/beet/src/beets/numbers.ts:51:16)
    at Object.toFixedFromData (/Users/user/go/src/github.com/paxosglobal/solana-programs-internal/paxos-lz-oft/node_modules/@metaplex-foundation/beet/src/beets/collections.ts:142:23)
    at fixBeetFromData (/Users/user/go/src/github.com/paxosglobal/solana-programs-internal/paxos-lz-oft/node_modules/@metaplex-foundation/beet/src/beet.fixable.ts:23:17)
    at FixableBeetArgsStruct.toFixedFromData (/Users/user/go/src/github.com/paxosglobal/solana-programs-internal/paxos-lz-oft/node_modules/@metaplex-foundation/beet/src/struct.fixable.ts:85:40)
    at fixBeetFromData (/Users/user/go/src/github.com/paxosglobal/solana-programs-internal/paxos-lz-oft/node_modules/@metaplex-foundation/beet/src/beet.fixable.ts:23:17)
    at FixableBeetStruct.toFixedFromData (/Users/user/go/src/github.com/paxosglobal/solana-programs-internal/paxos-lz-oft/node_modules/@metaplex-foundation/beet/src/struct.fixable.ts:85:40)
    at FixableBeetStruct.deserialize (/Users/user/go/src/github.com/paxosglobal/solana-programs-internal/paxos-lz-oft/node_modules/@metaplex-foundation/beet/src/struct.fixable.ts:59:17) {
  code: 'ERR_OUT_OF_RANGE'
```

### Failed while deploying the Solana OFT `Error: Account allocation failed: unable to confirm transaction. This can happen in situations such as transaction expiration and insufficient fee-payer funds`

This error is caused by the inability to confirm the transaction in time, or by running out of funds. This is not
specific to OFT deployment, but Solana programs in general. Fortunately, you can retry by recovering the program key and
re-running with `--buffer` flag similar to the following:

```bash
solana-keygen recover -o recover.json
solana program deploy --buffer recover.json --upgrade-authority <pathToKey> --program-id <programId> target/verifiable/oft.so -u mainnet-beta
```

### When sending tokens from Solana `Instruction passed to inner instruction is too large (1388 > 1280)`

The outbound OApp DVN configuration violates a hard CPI size restriction, as you have included too many DVNs in the
configuration (more than 3 for Solana outbound). As such, you will need to adjust the DVNs to comply with the CPI size
restriction. The current CPI size restriction is 1280 bytes. The error message looks similar to the following:

```text
SendTransactionError: Simulation failed.
Message: Transaction simulation failed: Error processing Instruction 0: Program failed to complete.
Logs:
[
  "Program 2gFsaXeN9jngaKbQvZsLwxqfUrT2n4WRMraMpeL8NwZM invoke [1]",
  "Program log: Instruction: Send",
  "Program TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb invoke [2]",
  "Program log: Instruction: Burn",
  "Program TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb consumed 1143 of 472804 compute units",
  "Program TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb success",
  "Program 2gFsaXeN9jngaKbQvZsLwxqfUrT2n4WRMraMpeL8NwZM consumed 67401 of 500000 compute units",
  "Program 2gFsaXeN9jngaKbQvZsLwxqfUrT2n4WRMraMpeL8NwZM failed: Instruction passed to inner instruction is too large (1388 > 1280)"
].
```

[`loosen_cpi_size_restriction`](https://github.com/solana-labs/solana/blob/v1.18.26/programs/bpf_loader/src/syscalls/cpi.rs#L958-L994),
which allows more lenient CPI size restrictions, is not yet enabled in the current version of Solana devnet or mainnet.

```text
solana feature status -u devnet --display-all
```

### When sending tokens from Solana `base64 encoded solana_sdk::transaction::versioned::VersionedTransaction too large: 1728 bytes (max: encoded/raw 1644/1232).`

This error happens when sending for Solana outbound due to the transaction size exceeds the maximum hard limit. To
alleviate this issue, consider using an Address Lookup Table (ALT) instruction in your transaction. Example ALTs for
mainnet and testnet (devnet):

| Stage        | Address                                        |
| ------------ | ---------------------------------------------- |
| mainnet-beta | `AokBxha6VMLLgf97B5VYHEtqztamWmYERBmmFvjuTzJB` |
| devnet       | `9thqPdbR27A1yLWw2spwJLySemiGMXxPnEvfmXVk4KuK` |

More info can be found in the [Solana documentation](https://solana.com/docs/advanced/lookup-tables).
