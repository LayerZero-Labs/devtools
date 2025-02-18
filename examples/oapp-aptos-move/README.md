## Move-VM OFT Setup and Deployment

### connecting to aptos via cli

To install aptos cli, run the following command:

```bash
brew install aptos
```

> **Important:** Version requirements:
>
> - For deploying to Aptos chain: Use version >= 6.0.1 (installable via brew)
> - For deploying to Movement chain: Use version <= 3.5.0 (must be built from source following the [Aptos CLI Build Guide](https://aptos.dev/en/network/nodes/building-from-source/))

After installing the aptos cli, you can set the aptos cli path in the .env file. This allows you to have two different aptos cli versions installed on your machine and not have to switch between them for deployments.

For example:

```bash
# if installed via homebrew, the aptos command will be available globally so this can be set to just aptos:
APTOS_COMPATIBLE_APTOS_CLI_PATH=aptos

# if installed from source the aptos command path to the aptos binary must be specified:
MOVEMENT_COMPATIBLE_APTOS_CLI_PATH=/Users/your-username/Documents/aptos-core/target/cli/aptos
```

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
# If you are deploying to Movement chain
MOVEMENT_INDEXER_URL=https://indexer.testnet.movementnetwork.xyz/v1/graphql
MOVEMENT_FULLNODE_URL=https://aptos.testnet.bardock.movementlabs.xyz/v1
MOVEMENT_ACCOUNT_ADDRESS=<your-movement-account-address>
MOVEMENT_PRIVATE_KEY=<your-movement-private-key>
MOVEMENT_COMPATIBLE_APTOS_CLI_PATH=<path-to-aptos-cli>

EVM_PRIVATE_KEY=<your-evm-private-key>
MNEMONIC=<your-mnemonic>

# If you are deploying to Aptos chain, the indexer and fullnode urls are fetched by the Aptos SDK and do not need to be specified.
APTOS_ACCOUNT_ADDRESS=<your-aptos-account-address>
APTOS_PRIVATE_KEY=<your-aptos-private-key>
APTOS_COMPATIBLE_APTOS_CLI_PATH=<path-to-aptos-cli>
```

Then run `source .env` in order for your values to be mapped.

Note: the Movement specific values can be found at: https://docs.movementnetwork.xyz/devs/networkEndpoints#movement-bardock-testnet-aptos-environment and currently Bardock testnet is the only Movement testnet with a deployed layerzero endpoint.

### Build and Deploy the modules

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

```bash
pnpm run lz:sdk:move:deploy --oapp-config move.layerzero.config.ts --address-name oapp --oapp-type oapp
```

## Set Delegate

```bash
pnpm run lz:sdk:move:set-delegate --oapp-config move.layerzero.config.ts
```

## EVM Deployment

```bash
npx hardhat lz:deploy
```

## Wire

For EVM:
Ensure that in move.layerzero.config.ts, all of your evm contracts have the owner and delegate specified.

> **Important:** Follow the [LayerZero Project Configuration Guide](https://docs.layerzero.network/v2/developers/evm/create-lz-oapp/project-config) to properly set up your `layerzero.config.ts` file with correct endpoint IDs and network configurations before running wiring commands.

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

Commands:

```bash
pnpm run lz:sdk:evm:wire --oapp-config move.layerzero.config.ts
```

For Move-VM:

```bash
pnpm run lz:sdk:move:wire --oapp-config move.layerzero.config.ts
```

### Transferring Ownership of your Move OApp

There are three steps to transferring ownership of your Move OApp:

1. Transfer the delegate to the new delegate
2. Transfer the OApp owner to the new owner
3. Transfer the Move-VM object owner to the new owner

To set the delegate, first ensure that the delegate is specified in the move.layerzero.config.ts file:

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

Then run:

```bash
pnpm run lz:sdk:move:set-delegate --oapp-config move.layerzero.config.ts
```

To transfer the OApp owner:

```bash
pnpm run lz:sdk:move:transfer-oapp-owner --oapp-config move.layerzero.config.ts --new-owner <new-owner-address>
```

To transfer the Move-VM object owner:

```bash
pnpm run lz:sdk:move:transfer-object-owner --oapp-config move.layerzero.config.ts --new-owner <new-owner-address>
```

Note: The object owner has the upgrade authority for the Object.

## Help

```bash
pnpm run lz:sdk:help
```

Select only the evm networks (DO NOT SELECT APTOS or MOVEMENT)

### Verifying successful ownership transfer of your Move-VM OFT:

Run the following command:

```bash
aptos account list \
  --account <OBJECT_ADDRESS> \
  --url <your-fullnode-url> \
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
      "<your-oapp-address>::oapp_store::OAppStore": {
        "admin": "0x<ADMIN_ADDRESS>",
        ...
      }
    }
```

If the admin is your desired address, then the ownership transfer was successful.


## Multisig Transaction Execution

To execute transactions with a multisig account via the aptos CLI, follow these steps:

Run the CLI command and select `(e)xport - save as JSON for multisig execution` when prompted. This will save a JSON file to the transactions folder.

Using Aptos CLI:

1. Create the transaction using:

```bash
aptos multisig create-transaction \
    --json-file <path-to-json-file> \
    --multisig-address <your-multisig-address> \
    --private-key-file <path-to-private-key> \
    --assume-yes
```

2. Approve the transaction:

```bash
aptos multisig approve \
    --multisig-address <your-multisig-address> \
    --sequence-number <your-sequence-number> \
    --private-key-file <path-to-private-key> \
    --assume-yes
```

For more detailed information about multisig transactions, please refer to the [Aptos Multi-Signature Tutorial](https://aptos.dev/en/build/cli/working-with-move-contracts/multi-signature-tutorial#execute-the-governance-parameter-transaction).

Using Rimosafe:

Follow the instructions here: https://docs.rimosafe.com/docs/introduction