## Move-VM OFT Setup and Deployment

### connecting to aptos via cli

To install aptos cli, run the following command:

```
brew install aptos
```

> **Important:** Version requirements:
>
> - For Aptos chain: Use version 6.0.1 (installable via brew)
> - For Movement chain: Use version 3.5.0 (must be built from source following the [Aptos CLI Build Guide](https://aptos.dev/en/network/nodes/building-from-source/))

If you need to generate a new key, run the following command:

```
aptos key generate --output-file my_key.pub
```

Then initialize the aptos cli and connect to the aptos network:

For Aptos Chain:

```
aptos init --network=testnet --private-key=<your-private-key>
```

For Movement Chain:

```
aptos init --network=custom --private-key=<your-private-key>
```

You can then verify that your initialization was successful by running the following command:

```
cat .aptos/config.yaml
```

If successful the config will be populated with the RPC links and your account private key, account address, and network.

Note: Your private key is stored in the .aptos/config.yaml file and will be extracted from there.

## Setup

Create a `.env` file with the following variables:

```bash
MOVEMENT_INDEXER_URL=https://indexer.testnet.movementnetwork.xyz/v1/graphql
MOVEMENT_FULLNODE_URL=https://aptos.testnet.bardock.movementlabs.xyz/v1
MOVEMENT_ACCOUNT_ADDRESS=<your-movement-account-address>
MOVEMENT_PRIVATE_KEY=<your-movement-private-key>

EVM_PRIVATE_KEY=<your-evm-private-key>
MNEMONIC=<your-mnemonic>

APTOS_INDEXER_URL=<your-aptos-indexer-url>
APTOS_FULLNODE_URL=<your-aptos-fullnode-url>
APTOS_ACCOUNT_ADDRESS=<your-aptos-account-address>
APTOS_PRIVATE_KEY=<your-aptos-private-key>
```

Then run `source .env` in order for your values to be mapped.

Note: the aptos and movement specific values can be found in `.aptos/config.yaml` after running `aptos init`

## Build and deploy aptos move modules

Note: to overwrite previous deploy and build, you can use `--force-build true` for the build script and `--force-deploy true` for the deploy script.

### Build and Deploy the modules

Before running the deploy and wire commands, first inside of `move.layerzero.config.ts`, set the delegate and owner address to your deployer account address. These can be changed in the future with commands shown later in this README, but for now they should be set to the address you will be running the commands from (deployer account address).

```ts
    contracts: [
        {
            contract: bscContract,
            config: {
                owner: 'YOUR_EVM_ACCOUNT_ADDRESS',
                delegate: 'YOUR_EVM_ACCOUNT_ADDRESS',
            },
        },
        {
            contract: aptosContract,
            config: {
                delegate: 'YOUR_APTOS_ACCOUNT_ADDRESS',
                owner: 'YOUR_APTOS_ACCOUNT_ADDRESS',
            },
        },
    ],
```

```bash
pnpm run lz:sdk:move:deploy --oapp-config move.layerzero.config.ts --address-name oft --move-deploy-script deploy-move/OFTInitParams.ts --oapp-type oft
```

## EVM Deployment

```bash
npx hardhat lz:deploy
```

Select only the evm networks (DO NOT SELECT APTOS or MOVEMENT)

## Init and Set Delegate

First modify deploy-move/OFTInitParams.ts and replace the oftMetadata with your desired values:

```ts
const oftMetadata = {
  token_name: "MyMoveOFT",
  token_symbol: "MMOFT",
  icon_uri: "",
  project_uri: "",
  sharedDecimals: 6,
  localDecimals: 6,
};
```

Then Run the following command to set the delegate:

```bash
pnpm run lz:sdk:move:set-delegate --oapp-config move.layerzero.config.ts
```

Then Run the following command to initialize the oft:

```bash
pnpm run lz:sdk:move:init-fa --oapp-config move.layerzero.config.ts --move-deploy-script deploy-move/OFTInitParams.ts
```

## Wire

> **Important:** Follow the [LayerZero Project Configuration Guide](https://docs.layerzero.network/v2/developers/evm/create-lz-oapp/project-config) to properly set up your `layerzero.config.ts` file with correct endpoint IDs and network configurations before running wiring commands.

For EVM:
Ensure that in move.layerzero.config.ts, all of your evm contracts have the owner and delegate contract is specified.

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

If you are wiring solana to move-vm, create a file in deployments/solana-mainnet/MyOFT.json (solana-testnet if you are using testnet) and add the following field:

```json
{
    "address": <oftStore-Address-from-solana-deployment-folder>
}
```

Commands:

```bash
pnpm run lz:sdk:evm:wire --oapp-config move.layerzero.config.ts [--simulate true] [--mnemonic-index 0]
```

--simulate <true> and --mnemonic-index <value> are optional.
--mnemonic-index <value> is the index of the mnemonic to use for the EVM account. If not specified, EVM_PRIVATE_KEY from .env is used. else the mnemonic is used along with the index.
--only-calldata <true> is optional. If specified, only the calldata is generated and not the transaction (this is primarily for multisig wallets).

For Move-VM:

```bash
pnpm run lz:sdk:move:wire --oapp-config move.layerzero.config.ts
```

## Set Fee

```bash
pnpm run lz:sdk:move:set-fee --oapp-config move.layerzero.config.ts --fee-bps 1000 --to-eid number
```

## Set Rate Limit

```bash
pnpm run lz:sdk:move:set-rate-limit --oapp-config move.layerzero.config.ts --rate-limit 10000 --window-seconds 60 --to-eid number
```

Rate limit limits how much is sent netted by the amount that is received. It is set on a per pathway basis.
For example if the rate limit from Aptos to EVM is 100 tokens you can send 100 tokens from Aptos to EVM, however if you receive 50 tokens from EVM to Aptos you are then able to send 150 tokens from Aptos to EVM.
Window is the number of seconds over which the capacity is restored. If the rate limit is 1000 and window is 10 seconds, then each second you get 100 (1000/10) capacity back. The units of the rate limit are the tokens in local decimals.

## Unset Rate Limit

```bash
pnpm run lz:sdk:move:unset-rate-limit --oapp-config move.layerzero.config.ts --to-eid number
```

## Permanently Disable Blocklist

> ⚠️ **Warning**: This will permanently disable the blocklist for the OFT. It is for OFTs that want to demonstrate to their holders that they will never use blocklisting abilities.

```bash
pnpm run lz:sdk:move:permanently-disable-blocklist --oapp-config move.layerzero.config.ts
```

## Permanently Disable Freezing

> ⚠️ **Warning**: This will permanently disable the freezing for the OFT. It is for OFTs that want to demonstrate to their holders that they will never use the freezing ability.

```bash
pnpm run lz:sdk:move:permanently-disable-freezing --oapp-config move.layerzero.config.ts
```

### Transferring Ownership of your Move OApp (OFT)

There are three steps to transferring ownership of your Move OFT:

1. Transfer the delegate to the new delegate
2. Transfer the OApp owner of the your to the new owner
3. Transfer the Move-VM object owner to the new owner

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

### Mint to Account on Move VM OFT:

> ⚠️ **Warning**: This mint command is only for testing and experimentation purposes. Do not use in production.
> First add this function to oft/sources/internal_oft/oft_impl.move in order to expose minting functionality to our move sdk script:

```
public entry fun mint(
    admin: &signer,
    recipient: address,
    amount: u64,
) acquires OftImpl {
    assert_admin(address_of(admin));
    primary_fungible_store::mint(&store().mint_ref, recipient, amount);
}
```

Then run the following command to mint the move oft:

```bash
pnpm run lz:sdk:move:mint-to-move-oft --oapp-config move.layerzero.config.ts --amount-ld 1000000000000000000 --to-address <your-move-account-address>
```

## Send from Move VM

```bash
pnpm run lz:sdk:move:send-from-move-oft \
  --oapp-config move.layerzero.config.ts \
  --amount-ld <your-amount-ld> \
  --min-amount-ld <your-min-amount-ld> \
  --src-address <your-source-account-address> \
  --to-address <your-destination-account-address> \
  --gas-limit <your-gas-limit> \
  --dst-eid <your-dst-eid>\
```

## Send from EVM

```bash
pnpm run lz:sdk:evm:send-evm \
  --oapp-config move.layerzero.config.ts \
  --src-eid <your-src-eid> \
  --dst-eid <your-dst-eid> \
  --to <your-source-account-address> \
  --amount <your-amount> \
  --min-amount <your-min-amount>
```

## Help

```bash
pnpm run lz:sdk:help
```

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

## Multisig Transaction Execution

To execute transactions with a multisig account via the aptos CLI, follow these steps:

1. Run the CLI command and select `(e)xport - save as JSON for multisig execution` when prompted. This will save a JSON file to the transactions folder.

2. Create the transaction using:

```bash
aptos multisig create-transaction \
    --json-file <path-to-json-file> \
    --multisig-address <your-multisig-address> \
    --private-key-file <path-to-private-key> \
    --assume-yes
```

3. Approve the transaction:

```bash
aptos multisig approve \
    --multisig-address <your-multisig-address> \
    --sequence-number <your-sequence-number> \
    --private-key-file <path-to-private-key> \
    --assume-yes
```

For more detailed information about multisig transactions, please refer to the [Aptos Multi-Signature Tutorial](https://aptos.dev/en/build/cli/working-with-move-contracts/multi-signature-tutorial#execute-the-governance-parameter-transaction).
