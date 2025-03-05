# OFT Adapter Aptos Move Example

## Setup and Installation

First, clone the repository and navigate to the example directory:

```bash
git clone --recurse-submodules https://github.com/LayerZero-Labs/devtools.git --depth 1
cd devtools
cd examples/oft-adapter-aptos-move
```

Install the Aptos CLI (required for deployment):

```bash
brew install aptos
```

> **Important:** Version requirements:
>
> - For Aptos chain: Use version 6.0.1 (installable via brew)
> - For Movement chain: Use version 3.5.0 (must be built from source following the [Aptos CLI Build Guide](https://aptos.dev/en/network/nodes/building-from-source/))

Set pnpm to the required version:

```bash
npm install -g pnpm@8.14.0
```

Install dependencies and build the project:

```bash
pnpm install
pnpm turbo build --force
```

## Move-VM OFT Adapter Setup and Deployment

### Connecting to Aptos via CLI

If you need to generate a new key, run the following command:

```bash
aptos key generate --output-file my_key.pub
```

Then initialize the aptos cli and connect to the aptos network:

For Aptos Chain:

```bash
aptos init --network=testnet --private-key=<your-private-key>
```

For Movement Chain:

```bash
aptos init --network=custom --private-key=<your-private-key>
```

You can then verify that your initialization was successful by running the following command:

```bash
cat .aptos/config.yaml
```

If successful the config will be populated with the RPC links and your account private key, account address, and network.

Note: Your private key is stored in the .aptos/config.yaml file and will be extracted from there.

## Setup

Create a `.env` file with the following variables:

```bash
EVM_PRIVATE_KEY=<your-evm-private-key>
MNEMONIC=<your-mnemonic>

# If you are deploying to Movement chain
MOVEMENT_INDEXER_URL=https://indexer.testnet.movementnetwork.xyz/v1/graphql
MOVEMENT_FULLNODE_URL=https://aptos.testnet.bardock.movementlabs.xyz/v1
MOVEMENT_ACCOUNT_ADDRESS=<your-movement-account-address>
MOVEMENT_PRIVATE_KEY=<your-movement-private-key>
MOVEMENT_COMPATIBLE_APTOS_CLI_PATH=<path-to-aptos-cli>

# If you are deploying to Aptos chain
APTOS_ACCOUNT_ADDRESS=<your-aptos-account-address>
APTOS_PRIVATE_KEY=<your-aptos-private-key>
APTOS_COMPATIBLE_APTOS_CLI_PATH=<path-to-aptos-cli>
```

Then run `source .env` in order for your values to be mapped.

Note: the aptos specific values can be found in `.aptos/config.yaml` after running `aptos init`

Note: the Movement specific values can be found at: https://docs.movementnetwork.xyz/devs/networkEndpoints#movement-bardock-testnet-aptos-environment and currently Bardock testnet is the only Movement testnet with a deployed layerzero endpoint.

> **Important:** If using Aptos CLI version >= 6.1.0 (required for Aptos chain), you need to uncomment the following lines in Move.toml and remove the existing AptosFramework dependency:
>
> ```
> # [dependencies.AptosFramework]
> # git = "https://github.com/aptos-labs/aptos-framework.git"
> # rev = "mainnet"
> # subdir = "aptos-framework"
> ```

### Wire setup

Before running the deploy and wire commands, first inside of `move.layerzero.config.ts`, set the delegate and owner address to your deployer account address. These can be changed in the future with commands shown later in this README, but for now they should be set to the address you will be running the commands from (deployer account address).

```ts
    contracts: [
        {
            contract: your_contract_name,
            config: {
                delegate: 'YOUR_ACCOUNT_ADDRESS',
                owner: 'YOUR_ACCOUNT_ADDRESS',
            },
        },
    ],
```

### Build and Deploy the modules

First modify deploy-move/OFTAdapterInitParams.ts and replace the oftMetadata with your desired values:

```ts
const oftMetadata = {
  move_vm_fa_address: "0x0",
  shared_decimals: 6,
};
```

To build the contracts without deploying them, run the following command:

```bash
pnpm run lz:sdk:move:build --oapp-config move.layerzero.config.ts --oapp-type oft
```

To build and deploy the contracts, run the following command:

```bash
pnpm run lz:sdk:move:deploy --oapp-config move.layerzero.config.ts --address-name oft --move-deploy-script deploy-move/OFTInitParams.ts --oapp-type oft
```

## EVM Deployment

```bash
npx hardhat lz:deploy
```

Select only the EVM networks (DO NOT SELECT APTOS or MOVEMENT).

## Init and Set Delegate

```bash
pnpm run lz:sdk:move:init-fa-adapter --oapp-config move.layerzero.config.ts --move-deploy-script deploy-move/OFTAdapterInitParams.ts
```

```bash
pnpm run lz:sdk:move:set-delegate --oapp-config move.layerzero.config.ts
```

## Wire

> **Important:** Follow the [LayerZero Project Configuration Guide](https://docs.layerzero.network/v2/developers/evm/create-lz-oapp/project-config) to properly set up your `move.layerzero.config.ts` file with correct endpoint IDs and network configurations before running wiring commands.

Ensure that in move.layerzero.config.ts, all of your evm contracts have the owner and delegate specified.

```ts
    contracts: [
        {
            contract: your_contract_name,
            config: {
                owner: 'YOUR_EVM_ACCOUNT_ADDRESS',
                delegate: 'YOUR_EVM_ACCOUNT_ADDRESS',
            },
        },
        ...
    ]
```

If you are wiring solana to move-vm, create a file in `deployments/solana-mainnet/MyOFT.json` (or `deployments/solana-testnet/MyOFT.json` if you are using testnet) and add the following field:

```json
{
    "address": <oft-store-address-from-solana-deployment-folder>
}
```

Commands:

### To wire from EVM to Move-VM:

```bash
pnpm run lz:sdk:evm:wire --oapp-config move.layerzero.config.ts
```

Note: `--simulate <true>` and `--mnemonic-index <value>` are optional.
`--mnemonic-index <value>` is the index of the mnemonic to use for the EVM account. If not specified, EVM_PRIVATE_KEY from `.env` is used. Otherwise, the mnemonic is used along with the index.
If `--only-calldata <true>` is specified, only the calldata is generated and not the transaction (this is primarily for multisig wallets).

### To wire from Move-VM to EVM:

```bash
pnpm run lz:sdk:move:wire --oapp-config move.layerzero.config.ts
```

## Set Fee

```bash
pnpm run lz:sdk:move:adapter-set-fee --oapp-config move.layerzero.config.ts --fee-bps 1000 --to-eid number
```

## Set Rate Limit

```bash
pnpm run lz:sdk:move:adapter-set-rate-limit --oapp-config move.layerzero.config.ts --rate-limit 10000 --window-seconds 60 --to-eid number
```

Rate limit limits how much is sent netted by the amount that is received. It is set on a per pathway basis.
For example if the rate limit from Aptos to EVM is 100 tokens you can send 100 tokens from Aptos to EVM, however if you receive 50 tokens from EVM to Aptos you are then able to send 150 tokens from Aptos to EVM.
Window is the number of seconds over which the capacity is restored. If the rate limit is 1000 and window is 10 seconds, then each second you get 100 (1000/10) capacity back. The units of the rate limit are the tokens in local decimals.

## Unset Rate Limit

```bash
pnpm run lz:sdk:move:adapter-unset-rate-limit --oapp-config move.layerzero.config.ts --to-eid number
```

## Permanently Disable Blocklist

> ⚠️ **Warning**: This will permanently disable the blocklist for the OFT. It is for OFTs that want to demonstrate to their holders that they will never use blocklisting abilities.

```bash
pnpm run lz:sdk:move:adapter-permanently-disable-blocklist --oapp-config move.layerzero.config.ts
```

### Transferring Ownership of your Move OApp (OFT)

There are three steps to transferring ownership of your Move OFT:

1. Transfer the delegate to the new delegate
2. Transfer the OApp owner to the new owner
3. Transfer the Move-VM object owner to the new owner

> **Note:** These ownership transfer commands only affect the Move VM (Aptos/Movement) implementation of your OFT. To transfer ownership of EVM implementations, you'll need to use the corresponding EVM ownership transfer commands.

To set the delegate, run the following command:
First ensure that the delegate is specified in the move.layerzero.config.ts file.

```ts
    contracts: [
        {
            contract: your_contract_name,
            config: {
                delegate: 'YOUR_DESIRED_DELEGATE_ACCOUNT_ADDRESS',
            },
        },
        ...
    ]
```

Then run the following command:

```bash
pnpm run lz:sdk:move:set-delegate --oapp-config move.layerzero.config.ts
```

To transfer the OApp owner, run the following command:

```bash
pnpm run lz:sdk:move:transfer-oapp-owner --oapp-config move.layerzero.config.ts --new-owner <new-owner-address>
```

To transfer the Move-VM object owner, run the following command:

```bash
pnpm run lz:sdk:move:transfer-object-owner --oapp-config move.layerzero.config.ts --new-owner <new-owner-address>
```

Note: The object owner has the upgrade authority for the Object.

## Send Tokens

### Send from Move VM to EVM

```bash
pnpm run lz:sdk:move:send-from-move-oft \
  --oapp-config move.layerzero.config.ts \
  --amount-ld <amount-to-send> \
  --min-amount-ld <minimum-amount-to-receive> \
  --src-address <your-move-account-address> \
  --to-address <destination-evm-address> \
  --gas-limit 400000 \
  --dst-eid <destination-chain-eid>
```

### Send from EVM to Move VM

```bash
pnpm run lz:sdk:evm:send-evm \
  --oapp-config move.layerzero.config.ts \
  --src-eid <source-chain-eid> \
  --dst-eid <destination-chain-eid> \
  --to <destination-move-address> \
  --amount <amount-to-send> \
  --min-amount <minimum-amount-to-receive>
```

## Help

```bash
pnpm run lz:sdk:help
```

Select only the EVM networks (DO NOT SELECT APTOS or MOVEMENT).

### Verifying successful ownership transfer of your Move-VM OFT:

Run the following command:

```bash
aptos account list \
  --account <OBJECT_ADDRESS> \
  --url https://fullnode.testnet.aptoslabs.com \
  --query resources
```

Note: replace the url with your desired aptos fullnode url.

Look for the following in the output:

```json
{
  "0x1::object::ObjectCore": {
    ...
    "owner": "0x<OWNER_ADDRESS>",
    ...
  }
  ...
}
```

If the owner is your desired address, then the ownership transfer was successful.

For verifying the admin look for the following in the output:

```json
    {
      "<your-oft-address>::oapp_store::OAppStore": {
        "admin": "0x<ADMIN_ADDRESS>",
        ...
      }
    }
```

If the admin is your desired address, then the ownership transfer was successful.
