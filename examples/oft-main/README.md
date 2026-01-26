<p align="center">
  <a href="https://layerzero.network">
    <picture>
      <source srcset="https://docs.layerzero.network/img/LayerZero_Logo_White.svg" media="(prefers-color-scheme: dark)">
      <source srcset="https://docs.layerzero.network/img/LayerZero_Logo_Black.svg" media="(prefers-color-scheme: light)">
      <img alt="LayerZero" src="https://docs.layerzero.network/img/LayerZero_Logo_Black.svg" style="width: 400px;">
    </picture>
  </a>
</p>

<p align="center">
 <a href="https://docs.layerzero.network/" style="color: #a77dff">LayerZero Docs</a>
</p>

<h1 align="center">Omnichain Fungible Token (OFT) Master Example</h1>

<p align="center">Template project for a cross-chain token (<a href="https://docs.layerzero.network/v2/concepts/applications/oft-standard">OFT</a>) powered by the LayerZero protocol. This master example supports EVM, Solana, Sui, and Starknet (with Aptos wiring notes where relevant).</p>

## Table of Contents

- [Prerequisite Knowledge](#prerequisite-knowledge)
- [Requirements](#requirements)
- [Scaffold this example](#scaffold-this-example)
- [Helper Tasks](#helper-tasks)
- [Setup](#setup)
- [Build](#build)
- [Deploy](#deploy)
- [Enable Messaging](#enable-messaging)
- [Sending OFT](#sending-oft)
- [Next Steps](#next-steps)
- [Production Deployment Checklist](#production-deployment-checklist)
- [Appendix](#appendix)
  - [Running tests](#running-tests)
  - [Adding other chains](#adding-other-chains)
  - [Using Multisigs](#using-multisigs)
  - [LayerZero Hardhat Helper Tasks](#layerzero-hardhat-helper-tasks)
  - [Solana Program Verification](#solana-program-verification)
  - [Troubleshooting](#troubleshooting)

## Prerequisite Knowledge

- [What is an OFT (Omnichain Fungible Token) ?](https://docs.layerzero.network/v2/concepts/applications/oft-standard)
- [What is an OApp (Omnichain Application) ?](https://docs.layerzero.network/v2/concepts/applications/oapp-standard)

## Requirements

- Rust `1.84.1`
- Anchor `0.31.1`
- Solana CLI `2.2.20`
- Docker `28.3.0`
- Node.js `>=20.19.5`
- `pnpm` (recommended) - or another package manager of your choice (npm, yarn)
- `forge` (optional) - `>=0.2.0` for testing, and if not using Hardhat for compilation
- Sui CLI (optional, for deploying Sui Move packages)
- Scarb + Starknet Foundry (optional, for Starknet deployment)

## Scaffold this example

Create your local copy of this example:

```bash
pnpm dlx create-lz-oapp@latest
```

Specify the directory, select `OFT (Solana)` and proceed with the installation.

Note that `create-lz-oapp` will also automatically run the dependencies install step for you.

## Helper Tasks

Throughout this walkthrough, helper tasks will be used. For the full list of available helper tasks, refer to the [LayerZero Hardhat Helper Tasks section](#layerzero-hardhat-helper-tasks). All commands can be run at the project root.

## Setup

<details>
<summary> Docker</summary>
<br>

[Docker](https://docs.docker.com/get-started/get-docker/) is required to build using anchor. We highly recommend that you use the most up-to-date Docker version to avoid any issues with anchor
builds.

</details>

<details>
<summary>Install Rust</summary>
<br>

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
```

</details>

<details>
<summary>Install Solana <code>2.2.20</code></summary>
<br>

```bash
sh -c "$(curl -sSfL https://release.anza.xyz/v2.2.20/install)"
```

</details>

<details>
<summary>Install Anchor <code>0.31.1</code> </summary>
<br>

```bash
cargo install --git https://github.com/solana-foundation/anchor --tag v0.31.1 anchor-cli --locked
```

</details>

<br>

- Copy `.env.example` into a new `.env`
- Solana Deployer:
  - To set up your Solana deployer, you have 3 options:
    - Use the keypair at the default path of `~/.config/solana/id.json`. For this, no action is needed.
    - In the `.env`, set `SOLANA_PRIVATE_KEY` - this can be either in base58 string format (i.e. when imported from a wallet) or the Uint8 Array in string format (all in one line, e.g. `[1,1,...1]`).
    - In the `.env`, set `SOLANA_KEYPAIR_PATH` - the location to the keypair file that you want to use.
  - Fund your Solana deployer address
    - Run: `solana airdrop 5 -u devnet`
    - We recommend that you request 5 devnet SOL, which should be sufficient for this walkthrough. For the example here, we will deploy to **Solana Devnet**.
    - If you hit rate limits with the above `airdrop` command, you can also use the [official Solana faucet](https://faucet.solana.com/).
- Solana RPC

  - Also set the `RPC_URL_SOLANA_TESTNET` value. Note that while the naming used here is `TESTNET`, it refers to the [Solana Devnet](https://docs.layerzero.network/v2/developers/evm/technical-reference/deployed-contracts#solana-testnet). We use `TESTNET` to keep it consistent with the existing EVM testnets.

- EVM Deployer:

  - Set up your EVM deployer address/account via the `.env`
  - You can specify either `MNEMONIC` or `PRIVATE_KEY`:

    ```
    MNEMONIC="test test test test test test test test test test test junk"
    or...
    PRIVATE_KEY="0xabc...def"
    ```

  - Fund your EVM deployer address with the native tokens of the chains you want to deploy to. This example by default will deploy to the following EVM testnet: **Arbitrum Sepolia**.

- Sui Deployer:
  - Set `SUI_PRIVATE_KEY` in `.env` (base64 or hex string) and `RPC_URL_SUI` (or `RPC_URL_SUI_TESTNET` for testnet).
  - Fund the Sui address with enough SUI for gas.

- Starknet Deployer:
  - Set `STARKNET_ACCOUNT_ADDRESS` and `STARKNET_PRIVATE_KEY` in `.env`.
  - Set `RPC_URL_STARKNET` (or `RPC_URL_STARKNET_TESTNET` for testnet).

## Build

### Prepare the Solana OFT Program keypair

Create the OFT `programId` keypair by running:

```bash
anchor keys sync -p oft
```

<details>
The above command will generate a keypair for the OFT program in your workspace if it doesn't yet exist, and also automatically update `Anchor.toml` to use the generated keypair's public key. The default path for the program's keypair will be `target/deploy/oft-keypair.json`. The program keypair is only used for initial deployment of the program. 
</details>
<br>
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

### Building the Solana OFT Program

Ensure you have Docker running before running the build command.

#### Build the Solana OFT program

```bash
anchor build -v -e OFT_ID=<OFT_PROGRAM_ID>
```

Where `<OFT_PROGRAM_ID>` is replaced with your OFT Program ID copied from the previous step.

> :information_source: For a breakdown of expected rent-exempt costs before deployment, see https://docs.layerzero.network/v2/developers/solana/technical-reference/solana-guidance#previewing-solana-rent-costs.

## Deploy

:information_source: LayerZero's default deployment path for Solana OFTs require you to deploy your own OFT program as this means you own the Upgrade Authority and don't rely on LayerZero to manage that authority for you. Read [this](https://neodyme.io/en/blog/solana_upgrade_authority/) to understand more on why this is important.

To deploy a Solana OFT, you need to both deploy an OFT Program and also create the OFT Store, alongside the other configuration steps that are handled by the provided tasks. To understand the relationship between the OFT Program and the OFT Store, read the section ['The OFT Program'](https://docs.layerzero.network/v2/developers/solana/oft/overview#the-oft-program) on the LayerZero docs.

#### (Recommended) Deploying with a priority fee

The `deploy` command will run with a priority fee. Read the section on ['Deploying Solana programs with a priority fee'](https://docs.layerzero.network/v2/developers/solana/technical-reference/solana-guidance#deploying-solana-programs-with-a-priority-fee) to learn more.

#### Run the deploy command

```bash
solana program deploy --program-id target/deploy/oft-keypair.json target/verifiable/oft.so -u devnet --with-compute-unit-price <COMPUTE_UNIT_PRICE_IN_MICRO_LAMPORTS>
```

## Deploy (Sui)

Sui OFTs use a two-package pattern: your token package plus the LayerZero OFT package. You will need to capture the
package/object IDs from the publish/initialization steps for wiring and sending.

0) Ensure `.env` includes Sui keys + RPC

```
SUI_PRIVATE_KEY=...   # base64 or hex
RPC_URL_SUI=...       # mainnet; use RPC_URL_SUI_TESTNET for testnet
```

1) Create + publish your token package

```bash
cd examples/oft-main/sui/token
sui client publish --gas-budget 500000000 --json > token_deploy.json
TOKEN_PACKAGE=$(jq -r '.objectChanges[] | select(.type=="published") | .packageId' token_deploy.json)
TREASURY_CAP=$(jq -r '.objectChanges[] | select(.objectType != null and (.objectType | contains("TreasuryCap"))) | .objectId' token_deploy.json)
COIN_METADATA=$(jq -r '.objectChanges[] | select(.objectType != null and (.objectType | contains("CoinMetadata"))) | .objectId' token_deploy.json)
echo "TOKEN_PACKAGE=$TOKEN_PACKAGE"
echo "TREASURY_CAP=$TREASURY_CAP"
echo "COIN_METADATA=$COIN_METADATA"
```

Capture:
- Token package ID
- TreasuryCap object ID (mint/burn) or escrow balance (adapter)
- CoinMetadata object ID

2) Publish the LayerZero OFT package

```bash
cd ../oft
git clone https://github.com/LayerZero-Labs/LayerZero-v2.git --depth 1
cp -r LayerZero-v2/packages/layerzero-v2/sui/contracts/oapps/oft/oft/sources ./sources
rm -rf LayerZero-v2

sui client publish --gas-budget 1000000000 --json > oft_deploy.json
OFT_PACKAGE=$(jq -r '.objectChanges[] | select(.type=="published") | .packageId' oft_deploy.json)
OAPP_OBJECT=$(jq -r '.objectChanges[] | select(.objectType != null and (.objectType | contains("::oapp::OApp"))) | select(.owner.Shared) | .objectId' oft_deploy.json)
INIT_TICKET=$(jq -r '.objectChanges[] | select(.objectType != null and (.objectType | contains("OFTInitTicket"))) | .objectId' oft_deploy.json)
echo "OFT_PACKAGE=$OFT_PACKAGE"
echo "OAPP_OBJECT=$OAPP_OBJECT"
echo "INIT_TICKET=$INIT_TICKET"
```

Move.toml should reference LayerZero git dependencies:
- `OApp` (oapp)
- `OFTCommon` (oft-common)
- `PtbMoveCall` (ptb-move-call)

The OFT sources should be copied from `LayerZero-v2/packages/layerzero-v2/sui/contracts/oapps/oft/oft/sources`.

Capture:
- OFT package ID (used as peer on remote chains)
- OApp object ID
- OFTInitTicket object ID

3) Initialize the OFT via SDK

Use the OFT SDK to consume the init ticket and create the OFT object. Capture the OFT object ID.
Use `initOftMoveCall` for mint/burn (TreasuryCap) or `initOftAdapterMoveCall` for lock/unlock.

```bash
cd ..
SUI_OFT_PACKAGE_ID=$OFT_PACKAGE \
SUI_OAPP_OBJECT_ID=$OAPP_OBJECT \
SUI_OFT_INIT_TICKET=$INIT_TICKET \
SUI_TREASURY_CAP=$TREASURY_CAP \
SUI_COIN_METADATA=$COIN_METADATA \
SUI_TOKEN_TYPE="${TOKEN_PACKAGE}::myoft::MYOFT" \
node examples/oft-main/sui/init-and-register.js
```

4) Register OApp + configure

Register the OFT with the Endpoint and set:
- send/receive libraries
- DVN/executor configs
- enforced options
- peer (last)

Contract info checklist (Sui):
- OFT package ID (peer on remote chains)
- OApp object ID
- OFT object ID
- OFTInitTicket object ID
- TreasuryCap object ID (mint/burn) or escrow balance (adapter)
- CoinMetadata object ID
- OFTComposerManager address
  - Mainnet: `0xfbece0b75d097c31b9963402a66e49074b0d3a2a64dd0ed666187ca6911a4d12`
  - Testnet: `0x90384f5f6034604f76ac99bbdd25bc3c9c646a6e13a27f14b530733a8e98db99`

Required values for oft-main tasks:
- `suiOftPackageId` (OFT package ID)
- `suiOftObjectId` (OFT object ID)
- `suiOappObjectId` (OApp object ID)
- `suiTokenType` (e.g. `0xTOKEN_PKG::myoft::MYOFT`)

Update `layerzero.config.ts` with a Sui OmniPoint once you have the package ID and object IDs.
Use the OFT package ID (not object ID) as the peer address on remote chains.

Reference docs:
https://docs.layerzero.network/v2/developers/sui/oft/overview

## Deploy (Starknet)

Starknet currently supports the OFT Mint/Burn Adapter. You will need the deployed ERC20 token address and the OFT
adapter address for wiring and sending.

0) Ensure `.env` includes Starknet keys + RPC

```
STARKNET_ACCOUNT_ADDRESS=0x...
STARKNET_PRIVATE_KEY=0x...
RPC_URL_STARKNET=...  # mainnet; use RPC_URL_STARKNET_TESTNET for testnet
```

1) Deploy ERC20MintBurnUpgradeable

```bash
source ~/.nvm/nvm.sh && nvm use 22
node examples/oft-main/starknet/deploy-starknet-mainnet.js
```

This script deploys both the ERC20 and OFT adapter and grants MINTER/BURNER roles. It writes
`examples/oft-main/starknet/deploy.json` with the deployed addresses.

If you need to deploy manually via Starknet Foundry:

```bash
# Deploy ERC20MintBurnUpgradeable
sncast --account <ACCOUNT_NAME> deploy \
  --class-hash 0x01bea3900ebe975f332083d441cac55f807cf5de7b1aa0b7ccbda1de53268500 \
  --url <RPC_URL> \
  --arguments '"MyToken", "MTK", 18, <DEFAULT_ADMIN_ADDRESS>'

# Deploy OFTMintBurnAdapter
sncast --account <ACCOUNT_NAME> deploy \
  --class-hash 0x07c02E3797d2c7B848FA94820FfB335617820d2c44D82d6B8Cf71c71fbE7dd6E \
  --url <RPC_URL> \
  --arguments '<ERC20_TOKEN_ADDRESS>, <MINTER_BURNER_ADDRESS>, 0x524e065abff21d225fb7b28f26ec2f48314ace6094bc085f0a7cf1dc2660f68, <OWNER_ADDRESS>, 0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d, 6'
```

2) Configure OApp security stack and peers (delegate, libs, DVNs, executor, enforced options, peers last)

Contract info checklist (Starknet):
- OFTMintBurnAdapter class hash: `0x07c02E3797d2c7B848FA94820FfB335617820d2c44D82d6B8Cf71c71fbE7dd6E`
- ERC20MintBurnUpgradeable class hash: `0x01bea3900ebe975f332083d441cac55f807cf5de7b1aa0b7ccbda1de53268500`
- Endpoint address:
  - Sepolia: `0x0316d70a6e0445a58c486215fac8ead48d3db985acde27efca9130da4c675878`
  - Mainnet: `0x524e065abff21d225fb7b28f26ec2f48314ace6094bc085f0a7cf1dc2660f68`
- STRK token address:
  - `0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d`

Required values for oft-main tasks:
- `oftAddress` (OFT Mint/Burn Adapter contract address)
- `starknetTokenDecimals` (defaults to 18)

Update `layerzero.config.ts` with a Starknet OmniPoint once you have the OFT address.
Use the OFT adapter contract address (felt252) as the peer address on remote chains.

Reference docs:
https://docs.layerzero.network/v2/developers/starknet/oft/overview

<details>

:information_source: the `-u` flag specifies the RPC URL that should be used. The options are `mainnet-beta, devnet, testnet, localhost`, which also have their respective shorthands: `-um, -ud, -ut, -ul`

:warning: If the deployment is slow, it could be that the network is congested and you might need to increase the priority fee.

</details>

### Create the Solana OFT

```bash
pnpm hardhat lz:oft:solana:create --eid 40168 --program-id <PROGRAM_ID> --only-oft-store true --amount 100000000000
```

The above command will create a Solana OFT which will have only the OFT Store as the Mint Authority and will also mint 100 OFT (given the default 9 decimals on Solana, this would be `100_000_000_000` in raw amount).

> For an elaboration on the command params for this command to create an Solana OFT, refer to the section [Create Solana OFT](#create-solana-oft)

### Deploy an Arbitrum Sepolia OFT peer

```bash
pnpm hardhat lz:deploy # follow the prompts
```

> For EVM OFTs used in this flow, if you need initial tokens on testnet, open the EVM `contracts/MyOFT.sol` and uncomment `_mint(msg.sender, 100000 * (10 ** 18));` in the constructor. Ensure you remove this line for production.

## Enable Messaging

Run the following command to initialize the SendConfig and ReceiveConfig Accounts. This step is unique to pathways that involve Solana.

```bash
npx hardhat lz:oft:solana:init-config --oapp-config layerzero.config.ts
```

<details>
You only need to do this when initializing the OFT pathways the first time. If a new pathway is added later, run this again to initialize the new pathway.
</details>
<br>

The OFT standard builds on top of the OApp standard, which enables generic message-passing between chains. After deploying the OFT on the respective chains, you enable messaging by running the [wiring](https://docs.layerzero.network/v2/concepts/glossary#wire--wiring) task.

> :information_source: This example uses the [Simple Config Generator](https://docs.layerzero.network/v2/developers/evm/technical-reference/simple-config), which is recommended over manual configuration.

Run the wiring task:

```bash
pnpm hardhat lz:oapp:wire --oapp-config layerzero.config.ts
```

## Sending OFTs

Send From 1 OFT from **Solana Devnet** to **Arbitrum Sepolia**

```bash
npx hardhat lz:oft:send --src-eid 40168 --dst-eid 40231 --to <EVM_ADDRESS>  --amount 1
```

> :information_source: `40168` and `40231` are the Endpoint IDs of Solana Devnet and Arbitrum Sepolia respectively. View the list of chains and their Endpoint IDs on the [Deployed Endpoints](https://docs.layerzero.network/v2/deployments/deployed-contracts) page.

Send 1 OFT From **Arbitrum Sepolia** to **Solana Devnet**

```bash
npx hardhat lz:oft:send --src-eid 40231 --dst-eid 40168 --to <SOLANA_ADDRESS>  --amount 1
```

Send 1 OFT From **Sui Testnet** to **EVM** (requires Sui package/object IDs):

```bash
npx hardhat lz:oft:send \
  --src-eid 40245 \
  --dst-eid 40231 \
  --to <EVM_ADDRESS> \
  --amount 1 \
  --sui-oft-package-id <SUI_OFT_PACKAGE_ID> \
  --sui-oft-object-id <SUI_OFT_OBJECT_ID> \
  --sui-oapp-object-id <SUI_OAPP_OBJECT_ID> \
  --sui-token-type <SUI_TOKEN_TYPE>
```

Send 1 OFT From **Starknet Testnet** to **EVM**:

```bash
npx hardhat lz:oft:send \
  --src-eid 40253 \
  --dst-eid 40231 \
  --to <EVM_ADDRESS> \
  --amount 1 \
  --oft-address <STARKNET_OFT_ADDRESS> \
  --starknet-token-decimals 18
```

Upon a successful send, the script will provide you with the link to the message on LayerZero Scan.

Once the message is delivered, you will be able to click on the destination transaction hash to verify that the OFT was sent.

Congratulations, you have now sent an OFT between Solana and Arbitrum!

> If you run into any issues, refer to [Troubleshooting](#troubleshooting).

## Next Steps

After successfully deploying your OFT, consider the following steps:

- Review the [Choosing between OFT, OFT Adapter and OFT Mint-and-Burn-Adapter](#choosing-between-oft-oft-adapter-and-mint-and-burn-adapter-oft) section
- Review the [Production Deployment Checklist](#production-deployment-checklist) before going to mainnet
- Learn about [Security Stack](https://docs.layerzero.network/v2/developers/evm/protocol-gas-settings/security-stack)
- Understand [Message Execution Options](https://docs.layerzero.network/v2/developers/evm/protocol-gas-settings/options)
- Wiring **Solana to Aptos** - for Wiring Solana to Aptos please refer to the instructions in [docs/wiring-to-aptos.md](./docs/wiring-to-aptos.md).

## Choosing between OFT, OFT Adapter and Mint and Burn Adapter OFT

This section explains the three different options available for creating OFTs on Solana and when to use each one.

### Decision Tree

<p align="center">
<pre>
              Do you have an existing Solana token (SPL or Token2022)?
                                      │
          ┌───────────────────────────┴───────────────────────────┐
          │                                                       │
         NO                                                     YES
          │                                                       │
  ✅ Use OFT (Preferred)                              Can you transfer the 
  • Creates a new token                              Mint Authority to OFT 
  • Uses burn and mint mechanism                     Store or new SPL Multisig?
                                                              │
                                                ┌────────────┴────────────┐
                                                │                         │
                                              YES                       NO/WON'T
                                                │                         │
                          ✅ Use OFT MABA (Mint-And-Burn Adapter)   ⚠️ Use OFT Adapter (Last Resort)
                          • Uses existing token                    • Uses existing token
                          • Transfers Mint Authority               • Keeps existing Mint Authority
                            to OFT Store/Multisig                  • Uses lock and unlock mechanism
                          • Uses burn and mint mechanism
</pre>
</p>

### OFT

- **Mechanism**: Burn and mint
- **Token**: Create new as part of the [create task](#create-solana-oft)
- **Note**: Preferred option when you don't have an existing token

```bash
pnpm hardhat lz:oft:solana:create --eid 40168 --program-id <PROGRAM_ID> --only-oft-store true --amount 100000000000
```

### OFT Adapter

- **Mechanism**: Lock and unlock
- **Token**: Use existing
- **Note**: ⚠️ Last resort option when you can't or won't transfer Mint Authority of existing token

```bash
pnpm hardhat lz:oft-adapter:solana:create --eid 40168 --program-id <PROGRAM_ID> --mint <TOKEN_MINT> --token-program <TOKEN_PROGRAM_ID>
```

### OFT Mint-And-Burn Adapter (MABA)

- **Mechanism**: Burn and mint
- **Token**: Use existing
- **Note**: ⚠️ Requires transferring Mint Authority to OFT Store or new SPL Multisig. Cannot use if Mint Authority has been renounced.

```bash
pnpm hardhat lz:oft:solana:create --eid 40168 --program-id <PROGRAM_ID> --mint <TOKEN_MINT> --token-program <TOKEN_PROGRAM_ID>
```

:warning: **Important for MABA**: Before attempting any cross-chain transfers, you must transfer the Mint Authority for `lz_receive` to work. If you used `--additional-minters`, transfer to the newly created multisig address. Otherwise, set it to the OFT Store address.

## Production Deployment Checklist

<!-- TODO: move to docs page, then just link -->

Before deploying, ensure the following:

- (required) for EVM OFTs used in this flow, if you uncommented the testnet mint line in `contracts/MyOFT.sol`, ensure it is commented out for production
- (recommended) you have profiled the gas usage of `lzReceive` on your destination chains
<!-- TODO: mention https://docs.layerzero.network/v2/developers/evm/technical-reference/integration-checklist#set-security-and-executor-configurations after it has been updated to reference the CLI -->

## Appendix

### Running tests

```bash
pnpm test
```

### Adding other chains

To add additional chains to your OFT deployment:

1. If EVM, add the new chain configuration to your `hardhat.config.ts`
2. Deploy the OFT contract on the new chain
3. Update your `layerzero.config.ts` to include the new chain
4. Run `init-config` for the new pathway (if it involves Solana)
5. Run the wiring task

Notes for Sui/Starknet:
- Use your Sui OFT package ID (not object ID) as the peer address in config.
- For Starknet, use the OFT contract address (felt252) as the peer address.
- Ensure `RPC_URL_SUI(_TESTNET)` / `RPC_URL_STARKNET(_TESTNET)` are set before wiring.

### Using Multisigs

For production deployments, consider using multisig wallets:

- Solana: Use [Squads](https://squads.so/) multisig with the `--multisig-key` flag
- EVM chains: Use Safe or similar multisig solutions

If your Solana OFT's delegate/owner is a Squads multisig, you can simply append the `--multisig-key` flag to the end of tasks such as the `wire` task:

```bash
pnpm hardhat lz:oapp:wire --oapp-config layerzero.config.ts --multisig-key <SQUADS_MULTISIG_ACCOUNT>
```

### Set a new Mint Authority Multisig

If you are not happy with the deployer being a mint authority, you can create and set a new mint authority by running:

```bash
pnpm hardhat lz:oft:solana:setauthority --eid <SOLANA_EID> --mint <TOKEN_MINT> --program-id <PROGRAM_ID> --escrow <ESCROW> --additional-minters <MINTERS_CSV>
```

The `OFTStore` is automatically added as a mint authority to the newly created mint authority, and does not need to be
included in the `--additional-minters` list.

### LayerZero Hardhat Helper Tasks

This example includes various helper tasks. For a complete list, run:

```bash
npx hardhat --help
```

#### Create Solana OFT

`lz:oft:solana:create`

##### Required Parameters

- **`--eid`** (EndpointId)  
  Solana mainnet (30168) or testnet (40168)

- **`--program-id`** (string)  
  The OFT Program ID

##### Optional Parameters

- **`--amount`** (number)  
  The initial supply to mint on Solana  
  _Default: undefined_

- **`--local-decimals`** (number)  
  Token local decimals  
  _Default: 9_

- **`--shared-decimals`** (number)  
  OFT shared decimals  
  _Default: 6_

- **`--name`** (string)  
  Token Name  
  _Default: "MockOFT"_

- **`--symbol`** (string)  
  Token Symbol  
  _Default: "MOFT"_

- **`--uri`** (string)  
  URI for token metadata  
  _Default: ""_

- **`--seller-fee-basis-points`** (number)  
  Seller fee basis points  
  _Default: 0_

- **`--token-metadata-is-mutable`** (boolean)  
  Whether token metadata is mutable  
  _Default: true_

- **`--additional-minters`** (CSV string)  
  Comma-separated list of additional minters  
  _Default: undefined_

- **`--only-oft-store`** (boolean)  
  If you plan to have only the OFTStore and no additional minters. This is not reversible, and will result in losing the ability to mint new tokens by everything but the OFTStore.  
  _Default: false_

- **`--freeze-authority`** (string)  
  The Freeze Authority address (only supported in onlyOftStore mode)  
  _Default: ""_

##### MABA-Only Parameters

The following parameters are only used for Mint-And-Burn Adapter (MABA) mode:

- **`--mint`** (string)  
  The Token mint public key (used for MABA only)  
  _Default: undefined_

- **`--token-program`** (string)  
  The Token Program public key (used for MABA only)  
  _Default: TOKEN_PROGRAM_ID_

#### Mint Authority Configuration

:information_source: For **OFT**, the SPL token's Mint Authority is set to the **Mint Authority Multisig**, which always has the **OFT Store** as a signer. The multisig is fixed to needing 1 of N signatures.

:information_source: You have the option to specify additional signers through the `--additional-minters` flag. If you choose not to, you must pass in `--only-oft-store true`, which means only the **OFT Store** will be a signer for the **Mint Authority Multisig**.

:warning: If you choose to go with `--only-oft-store`, you will not be able to add in other signers/minters or update the Mint Authority, and the Freeze Authority will be immediately renounced. The token Mint Authority will be fixed Mint Authority Multisig address while the Freeze Authority will be set to None.

##### Important Notes

:warning: Use `--additional-minters` flag to add a CSV of additional minter addresses to the Mint Authority Multisig. If you do not want to, you must specify `--only-oft-store true`.

<details>
<summary> <a href="https://docs.layerzero.network/v2/developers/evm/create-lz-oapp/deploying"><code>pnpm hardhat lz:oft:solana:debug --eid <SOLANA_EID></code></a> </summary>

<br>

Fetches and prints info related to the Solana OFT.

</details>

### Note on the LZ Config file

In [layerzero.config.ts](./layerzero.config.ts), the `solanaContract.address` is auto-populated with the `oftStore` address from the deployment file, which has the default path of `deployments/solana-<mainnet/testnet>`.

```typescript
const solanaContract: OmniPointHardhat = {
  eid: EndpointId.SOLANA_V2_TESTNET,
  address: getOftStoreAddress(EndpointId.SOLANA_V2_TESTNET),
};
```

:warning: Ensure that you `address` is specified only for the solana contract object. Do not specify addresses for the EVM chain contract objects. Under the hood, we use `hardhat-deploy` to retrieve the contract addresses of the deployed EVM chain contracts. You will run into an error if you specify `address` for an EVM chain contract object.

### Mint OFT on Solana

<!-- TODO: move this into docs and just link to there -->

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

### Solana Program Verification

Refer to [Verify the OFT Program](https://docs.layerzero.network/v2/developers/solana/oft/overview#optional-verify-the-oft-program).

### Troubleshooting

Refer to the [Solana Troubleshooting page on the LayerZero Docs](https://docs.layerzero.network/v2/developers/solana/troubleshooting/common-errors) to see how to solve common error when deploying Solana OFTs.
