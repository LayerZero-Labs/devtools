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

We recommend using `pnpm` as a package manager (but you can of course use a package manager of your choice):

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

### Create Mint

```bash
pnpm hardhat lz:oft:solana:create --eid 40168 --program-id <PROGRAM_ID>
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
