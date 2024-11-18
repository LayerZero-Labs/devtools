<p align="center">
  <a href="https://layerzero.network">
    <img alt="LayerZero" style="width: 400px" src="https://docs.layerzero.network/img/LayerZero_Logo_White.svg"/>
  </a>
</p>

<p align="center">
  <a href="https://layerzero.network" style="color: #a77dff">Homepage</a> | <a href="https://docs.layerzero.network/" style="color: #a77dff">Docs</a> | <a href="https://layerzero.network/developers" style="color: #a77dff">Developers</a>
</p>

<h1 align="center">Omnichain Fungible Token (OFT) Solana Example</h1>

## Setup

We recommend using `pnpm` as a package manager (but you can of course use a package manager of your choice).
Additionally, we highly recommend that you use the most up-to-date Docker version to avoid any issues with anchor
builds.

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

## Deploy

### Prepare the OFT Program ID

Create `programId` keypair files by running:

```bash
solana-keygen new -o target/deploy/endpoint-keypair.json --force
solana-keygen new -o target/deploy/oft-keypair.json --force

anchor keys sync
```

:warning: `--force` flag overwrites the existing keys with the ones you generate.

:warning: Ensure that [lib.rs](./programs/oft/src/lib.rs) has the updated programId.

### Building and Deploying the OFT Program

```bash
anchor build -v # verification flag enabled
solana program deploy --program-id target/deploy/oft-keypair.json target/verifiable/oft.so -u mainnet-beta
```

### Create the OFT

For OFT:

```bash
pnpm hardhat lz:oft:solana:create --eid 40168 --program-id <PROGRAM_ID>
```

:important: You may specify the `--additional-minters` flag to add a CSV of additional minter keys to the mint
multisig. If you do not want to, you must sepcify `--only-oft-store`. If you choose the latter approach, you can never
substitute in a different mint authority.

For OFTAdapter:

```bash
pnpm hardhat lz:oft-adapter:solana:create --eid 40168 --program-id <PROGRAM_ID> --mint <TOKEN_MINT> --token-program <TOKEN_PROGRAM_ID>
```

For OFT Mint-And-Burn Adapter (MABA):

```bash
pnpm hardhat lz:oft:solana:create --eid 40168 --program-id <PROGRAM_ID> --mint <TOKEN_MINT> --token-program <TOKEN_PROGRAM_ID>
```

:important: You may specify the `--additional-minters` flag to add a CSV of additional minter keys to the mint
multisig. If you do not want to, you must sepcify `--only-oft-store`. If you choose the latter approach, you can never
substitute in a different mint authority.

Make sure to update [layerzero.config.ts](./layerzero.config.ts) and set `solanaContract.address` with the `oftStore` address.

### Deploy a sepolia OFT peer

```bash
pnpm hardhat lz:deploy # follow the prompts
```

Note: If you are on testnet, consider using `MyOFTMock` to allow test token minting.

### Initialize the OFT

:warning: Only do this the first time you are initializing the OFT.

```bash
npx hardhat lz:oapp:init:solana --oapp-config layerzero.config.ts --solana-secret-key <SECRET_KEY> --solana-program-id <PROGRAM_ID>
```

### Wire

```bash
npx hardhat lz:oapp:wire --oapp-config layerzero.config.ts --solana-secret-key <PRIVATE_KEY> --solana-program-id <PROGRAM_ID>
```

With a squads multisig, you can simply append the `--multisigKey` flag to the end of the above command.

### Send SOL -> Sepolia

```bash
npx hardhat lz:oft:solana:send --amount <AMOUNT> --from-eid 40168 --to <TO> --to-eid 40161 --mint <MINT_ADDRESS> --program-id <PROGRAM_ID> --escrow <ESCROW>
```

### Send Sepolia -> SOL

```bash
npx hardhat --network sepolia-testnet send --dst-eid 40168 --amount 10000000000000000000000000 --to <TO>
```

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
