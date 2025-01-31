## Move-VM OApp Setup and Deployment

### Connecting to Aptos via CLI

To install aptos cli, run the following command:

```
brew install aptos
```

If you need to generate a new key, run the following command:

```
aptos key generate --output-file my_key.pub
```

Then initialize the aptos cli and connect to the aptos network:

```
aptos init --network=testnet --private-key=<your-private-key>
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
ACCOUNT_ADDRESS=<your-aptos-account-address>
EVM_PRIVATE_KEY=<your-evm-private-key>
```

Then run `source .env` in order for your values to be mapped to `$APTOS_ACCOUNT_ADDRESS` and `$EVM_PRIVATE_KEY`

Note: aptos account address can be found in .aptos/config.yaml

## Build and deploy Aptos move modules

Note: to overwrite previous deploy and build, you can use `--force-build true` for the build script and `--force-deploy true` for the deploy script.

### Build the modules

```bash
pnpm run lz:sdk:move:build --oapp-config move.layerzero.config.ts --named-addresses oapp=$APTOS_ACCOUNT_ADDRESS,oapp_admin=$APTOS_ACCOUNT_ADDRESS
```

### Deploy the modules

```bash
pnpm run lz:sdk:move:deploy --oapp-config move.layerzero.config.ts --address-name oapp --named-addresses oapp=$APTOS_ACCOUNT_ADDRESS,oapp_admin=$APTOS_ACCOUNT_ADDRESS
```
## Set Delegate

Before running the wire command, first inside of move.layerzero.config.ts, set the delegate address to your account address.

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

Then run the following command:

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

Then run the wire commands:

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
      "<your-oapp-address>::oapp_store::OAppStore": {
        "admin": "0x<ADMIN_ADDRESS>",
        ...
      }
    }
```

If the admin is your desired address, then the ownership transfer was successful.
