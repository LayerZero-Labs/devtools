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

For OFTAdapter:

```bash
pnpm hardhat lz:oft-adapter:solana:create --eid 40168 --program-id <PROGRAM_ID> --mint <TOKEN_MINT> --token-program <TOKEN_PROGRAM_ID>
```

For OFT Mint-And-Burn Adapter (MABA):

```bash
pnpm hardhat lz:oft:solana:create --eid 40168 --program-id <PROGRAM_ID> --mint <TOKEN_MINT> --token-program <TOKEN_PROGRAM_ID>
```

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

### Send SOL -> Sepolia

```bash
npx hardhat lz:oft:solana:send --amount <AMOUNT> --from-eid 40168 --to <TO> --to-eid 40161 --mint <MINT_ADDRESS> --program-id <PROGRAM_ID> --escrow <ESCROW>
```

### Send Sepolia -> SOL

```bash
npx hardhat --network sepolia-testnet send --dst-eid 40168 --amount 10000000000000000000000000 --to <TO>
```

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
