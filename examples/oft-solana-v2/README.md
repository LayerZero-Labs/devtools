<p align="center">
  <a href="https://layerzero.network">
    <img alt="LayerZero" style="width: 400px" src="https://docs.layerzero.network/img/LayerZero_Logo_White.svg"/>
  </a>
</p>

<p align="center">
  <a href="https://layerzero.network" style="color: #a77dff">Homepage</a> | <a href="https://docs.layerzero.network/" style="color: #a77dff">Docs</a> | <a href="https://layerzero.network/developers" style="color: #a77dff">Developers</a>
</p>

<h1 align="center">Unaudited Omnichain Fungible Token (OFT) Solana Example</h1>

> [!WARNING]  
> This OFT Solana Example is NOT AUDITED and currently an experimental build that is subject to changes.
> It should not be used in production.
## Installation

#### Installing dependencies

We recommend using `pnpm` as a package manager (but you can of course use a package manager of your choice):

```bash
pnpm install
```

#### Compiling your program

```bash
pnpm compile
```

#### Running tests

```bash
pnpm test
```

### Preparing OFT Program ID

Create `programId` keypair files by running:

```bash
solana-keygen new -o target/deploy/endpoint-keypair.json
solana-keygen new -o target/deploy/oft-keypair.json

anchor keys sync
```

:warning: You will want to use the `--force` flag to generate your own keypair if these keys already exist.

### Deploying OFT Program

#### Using `anchor`

```bash
anchor build -v
solana program deploy --program-id target/deploy/oft-keypair.json target/verifiable/oft.so -u mainnet-beta
```

#### Using `solana-verify`

```bash
solana-verify build
solana program deploy --program-id target/deploy/oft-keypair.json target/deploy/oft.so -u mainnet-beta
```

please visit [Solana Verify CLI](https://github.com/Ellipsis-Labs/solana-verifiable-build) and [Deploy a Solana Program with the CLI](https://docs.solanalabs.com/cli/examples/deploy-a-program) for more detail.