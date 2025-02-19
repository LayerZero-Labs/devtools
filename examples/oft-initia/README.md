## Move-VM OFT Setup and Deployment

## Setup

Add key to your keyring:

```bash
initiad keys import-hex <your-initia-key-name> <your-initia-private-key> --keyring-backend test
```

To list your keys:

```bash
initiad keys list --keyring-backend test
```

Create a `.env` file with the following variables:

> **Important:** The INITIA_ACCOUNT_ADDRESS must be in the bech32 format starting with "init", for example: init19ck72hj3vt2ccsw78zwv7mtu4r0rjs9xzf3gc3

```bash
# You don't need to set both of these values, just pick the one that you prefer and set that one
EVM_MNEMONIC=
EVM_PRIVATE_KEY=

# All Initia values must be specified - testnet values can be found in the .env.example file
INITIA_ACCOUNT_ADDRESS=<your-initia-account-address>
INITIA_PRIVATE_KEY=<your-initia-private-key>
INITIA_KEY_NAME=<your-initia-key-name>
INITIA_REST_URL=<your-initia-rest-url>
INITIA_RPC_URL=<your-initia-rpc-url>
INITIA_CHAIN_ID=<your-initia-chain-id>
```

Then run `source .env`.

### Deploy the modules

First modify `./deploy-move/OFTInitParams.ts` and replace the `oftMetadata` with your desired values:

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

Then run the following command to build and deploy the modules:

```bash
pnpm run lz:sdk:move:deploy --oapp-config move.layerzero.config.ts --address-name oft --move-deploy-script deploy-move/OFTInitParams.ts --oapp-type oft
```

## EVM Deployment

```bash
npx hardhat lz:deploy
```

Select only the evm networks (DO NOT SELECT APTOS or MOVEMENT)

## Init and Set Delegate

Before running the wire command, first inside of move.layerzero.config.ts, set the delegate address to your account address.

> **Important:** The delegate address must be in hex format (0x...), not the bech32 format

```ts
    contracts: [
        {
            contract: initiaContract,
            config: {
                delegate: '<your-initia-account-address>',
                owner: '<your-initia-account-address>',
            },
        },
    ],
```

Then run the following commands:

```bash
pnpm run lz:sdk:move:init-fa --oapp-config move.layerzero.config.ts --move-deploy-script deploy-move/OFTInitParams.ts
```

```bash
pnpm run lz:sdk:move:set-delegate --oapp-config move.layerzero.config.ts
```

## Wire

> **Important:** Follow the [LayerZero Project Configuration Guide](https://docs.layerzero.network/v2/developers/evm/create-lz-oapp/project-config) to properly set up your `move.layerzero.config.ts` file with correct endpoint IDs and network configurations before running wiring commands.

For EVM:
Ensure that in `move.layerzero.config.ts`, all of your evm contracts have the owner and delegate addresses specified.

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

To wire from EVM to Move-VM:

```bash
pnpm run lz:sdk:evm:wire --oapp-config move.layerzero.config.ts
```

Note: `--simulate <true>` and `--mnemonic-index <value>` are optional.
`--mnemonic-index <value>` is the index of the mnemonic to use for the EVM account. If not specified, EVM_PRIVATE_KEY from `.env` is used. Otherwise, the mnemonic is used along with the index.
If `--only-calldata <true>` is specified, only the calldata is generated and not the transaction (this is primarily for multisig wallets).

To wire from Move-VM to EVM:

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
> First add this function to ./sources/oft_implementation/oft_fa.move in order to expose minting functionality to our move sdk script:

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

> **Important:** The source and destination addresses must be in hex format (0x...), not the bech32 format

```bash
pnpm run lz:sdk:move:send-from-move-oft \
  --amount-ld <your-amount-ld> \
  --min-amount-ld <your-min-amount-ld> \
  --src-address <your-source-account-address> \
  --to-address <your-destination-account-address> \
  --gas-limit <your-gas-limit> \
  --dst-eid <your-dst-eid>\
```

## Send from EVM

> **Important:** The destination address must be in hex format (0x...), not the bech32 format

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

## Validating object ownership of your deployed Initia OApp:

Go to: https://scan.testnet.initia.xyz/initiation-2/interact?address=0x1&moduleName=object&functionType=view&functionName=owner

For TO: put 0x1::Object::ObjectCore
For the argument: put your deployed Object Address

Verify the method returns your desired Initia account address as the owner.

### Verifying successful ownership transfer of your Aptos OFT:

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
      "<your-oft-address>::oapp_store::OAppStore": {
        "admin": "0x<ADMIN_ADDRESS>",
        ...
      }
    }
```

If the admin is your desired address, then the ownership transfer was successful.

## Aptos Multisig Transaction Execution

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
