# OApp Aptos Move Example

## Setup and Installation

### Aptos CLI

Install the Aptos CLI (required for deployment):

Aptos does not have native version management capabilities. To simplify the installation process, LayerZero has developed an Aptos CLI Version Manager.

Clone the repository and follow the instructions in its README.md:

```bash
git clone https://github.com/LayerZero-Labs/aptosup
```

> **Important:** Version requirements:
>
> - For Aptos chain: Use version 6.0.1
> - For Movement chain: Use version 3.5.0

### Example installation

To download the example run:

`LZ_ENABLE_EXPERIMENTAL_MOVE_VM_EXAMPLES=1 npx create-lz-oapp@latest`

Set pnpm to the required version:

```bash
npm install -g pnpm@8.14.0
```

Install dependencies and build the project:

```bash
pnpm install
```

## Move-VM OApp Setup and Deployment

### Connecting to Move-VM via Aptos CLI

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

Note: the aptos specific values can be found in `.aptos/config.yaml` after running `aptos init`

Note: the Movement specific values can be found at: https://docs.movementnetwork.xyz/devs/networkEndpoints#movement-bardock-testnet-aptos-environment and currently Bardock testnet is the only Movement testnet with a deployed layerzero endpoint.

```bash
EVM_PRIVATE_KEY=<your-evm-private-key>
EVM_MNEMONIC=<your-mnemonic>

# If you are deploying to Movement chain
MOVEMENT_INDEXER_URL=<indexer-url>
MOVEMENT_FULLNODE_URL=<fullnode-url>
MOVEMENT_ACCOUNT_ADDRESS=<your-movement-account-address>
MOVEMENT_PRIVATE_KEY=<your-movement-private-key>

# If you are deploying to Aptos chain
APTOS_ACCOUNT_ADDRESS=<your-aptos-account-address>
APTOS_PRIVATE_KEY=<your-aptos-private-key>
```

Then run `source .env` in order for your values to be mapped.

> **Important:** If using Aptos CLI version >= 6.1.0 (required for Aptos chain), you need to uncomment the following lines in Move.toml and remove the existing AptosFramework dependency:
>
> ```
> # [dependencies.AptosFramework]
> # git = "https://github.com/aptos-labs/aptos-framework.git"
> # rev = "mainnet"
> # subdir = "aptos-framework"
> ```

## OApp Config Setup

Before running the deploy and wire commands, first inside of `move.layerzero.config.ts`, set the delegate and owner address to your deployer account address. These can be changed in the future with commands shown later in this README, but for now they should be set to the address you will be running the commands from (deployer account address).

> **Important:** Follow the [LayerZero Project Configuration Guide](https://docs.layerzero.network/v2/developers/evm/create-lz-oapp/project-config) to properly set up your `move.layerzero.config.ts` file with correct endpoint IDs and network configurations before running wiring commands. The configuration can be modified to wire any number supported networks to each other. The current move.layerzero.config.ts file is an example of what is required to deploy and wire BSC testnet to Movement testent.

`move.layerzero.config.ts`:

```ts
// Create contract entries for all contracts you would like to deploy.
// This is an example entry for Movement testnet.
const movementContract: OmniPointHardhat = {
    eid: EndpointId.MOVEMENT_V2_TESTNET,
    contractName: 'MyOApp',
}

...

    contracts: [
        {
            contract: movementContract,
            config: {
                delegate: 'YOUR_ACCOUNT_ADDRESS',
                owner: 'YOUR_ACCOUNT_ADDRESS',
            },
        },
    ],
```

To build the contracts without deploying them, run the following command:

```bash
pnpm run lz:sdk:move:build --oapp-config move.layerzero.config.ts --oapp-type oapp
```

To build and deploy the contracts, run the following command:

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

Select only the EVM networks (DO NOT SELECT APTOS or MOVEMENT).

## Wire

Ensure that in move.layerzero.config.ts, all of your evm contracts have the owner and delegate specified.

> **Important:** Follow the [LayerZero Project Configuration Guide](https://docs.layerzero.network/v2/developers/evm/create-lz-oapp/project-config) to properly set up your `move.layerzero.config.ts` file with correct endpoint IDs and network configurations before running wiring commands.

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

> **⚠️ Important Security Consideration:** When configuring your `move.layerzero.config.ts` file, pay careful attention to the `confirmations` parameter. This value determines the number of block confirmations to wait on Aptos before emitting the message from the source chain. The default value of `5` is for illustration purposes only. For production deployments, it is critical to select an appropriate confirmation value based on your security requirements and risk assessment. Default recommended values can be found at: https://layerzeroscan.com/tools/defaults

```bash
pnpm run lz:sdk:move:wire --oapp-config move.layerzero.config.ts
```

### Transferring Ownership of your Move OApp

There are three steps to transferring ownership of your Move OApp:

1. Transfer the delegate to the new delegate
2. Transfer the OApp owner to the new owner
3. Transfer the Move-VM object owner to the new owner

> **Note:** These ownership transfer commands only affect the Move VM (Aptos/Movement) implementation of your OApp. To transfer ownership of EVM implementations, you'll need to use the corresponding EVM ownership transfer commands.

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

Select only the EVM networks (DO NOT SELECT APTOS or MOVEMENT).

### Verifying successful ownership transfer of your Move-VM OApp:

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

For Movement we recommend using MSafe:

Follow the instructions here: https://doc.m-safe.io/aptos
