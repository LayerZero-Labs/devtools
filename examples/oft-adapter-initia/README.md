## OFT Initia Example

The following is a guide for deploying OFT's and wiring them to Initia.

## Setup and Installation

To download the example run:

`LZ_ENABLE_EXPERIMENTAL_INITIA_EXAMPLES=1 npx create-lz-oapp@latest`

Set pnpm to the required version:

```bash
npm install -g pnpm@8.14.0
```

## Initiad Setup

Deploying to Initia requires the Initia CLI tool (Initiad). To install Initiad, follow the official documentation at:
https://docs.initia.xyz/build-on-initia/initiad

After installation, generate a new key and add it to the keyring:

```bash
initiad keys add <your-key-name> --key-type secp256k1 --coin-type 118 --keyring-backend test
```

For more information on key management please reference the Initiad docs: https://docs.initia.xyz/build-on-initia/initiad#managing-keys

To list of your imported or generated keys run:

```bash
initiad keys list --keyring-backend test
```

Create a `.env` file with the following variables:

> **Important:** The INITIA_ACCOUNT_ADDRESS must be in the bech32 format starting with "init" (example: init19ck72hj3vt2ccsw78zwv7mtu4r0rjs9xzf3gc3)

```bash
# You only need to set one of these values based on your preference
EVM_MNEMONIC=
EVM_PRIVATE_KEY=

# All Initia values below are required - testnet values can be found in the .env.example file
INITIA_ACCOUNT_ADDRESS=<your-initia-bech32-account-address>
INITIA_PRIVATE_KEY=<your-initia-private-key-hex>
INITIA_KEY_NAME=<your-initia-key-name>
INITIA_REST_URL=<your-initia-rest-url>
INITIA_RPC_URL=<your-initia-rpc-url>
INITIA_CHAIN_ID=<your-desired-initia-chain-id>
```

After creating the `.env` file, load the environment variables:

```bash
source .env
```

### Wire setup

Before running the deploy and wire commands, inside of `move.layerzero.config.ts`, configure the delegate and owner address to your deployer account address. These can be changed in the future with commands shown later in this README, but for now they should be set to the address you will be running the commands from (deployer account address).

> **Note:** in move.layerzero.config.ts all Initia addresses must be in hex format e.g.: 0x1a2b3c...

To convert your init prefixed bech32 address to hex, run the command:

```initiad keys parse <your-bech32-addresss> --output json```

move.layerzero.config.ts:

```ts
    contracts: [
        {
            contract: your_initia_contract_name,
            config: {
                delegate: 'your_initia_hex_account_address',
                owner: 'your_initia_hex_account_address',
            },
        },
    ],
```

> **Note:** By default, minting functionality is not available on the OFT. If you need to mint tokens for testing, please follow the [Mint to Account on Move VM OFT](#mint-to-account-on-move-vm-oft) instructions at the bottom of this README.

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

Select only the EVM networks you wish to deploy to (do not select Aptos, Movement, Solana, or Initia).

## Init and Set Delegate

First modify deploy-move/OFTAdapterInitParams.ts and replace the oftMetadata with your desired values:

```ts
const oftMetadata = {
  move_vm_fa_address: "<your fungible asset address>",
};
```

Then run the following command to set the delegate:

```bash
pnpm run lz:sdk:move:set-delegate --oapp-config move.layerzero.config.ts
```

Then run the following command to initialize the oft:

```bash
pnpm run lz:sdk:move:init-fa-adapter --oapp-config move.layerzero.config.ts --move-deploy-script deploy-move/OFTAdapterInitParams.ts
```

## Wire

> **Important:** Follow the [LayerZero Project Configuration Guide](https://docs.layerzero.network/v2/developers/evm/create-lz-oapp/project-config) to properly set up your `move.layerzero.config.ts` file with correct endpoint IDs and network configurations before running wiring commands.

EVM Wiring:
Ensure that in move.layerzero.config.ts, all of your evm contracts have the owner and delegate specified.

```ts
    contracts: [
        {
            contract: your_contract_name,
            config: {
                owner: 'YOUR_ACCOUNT_ADDRESS',
                delegate: 'YOUR_ACCOUNT_ADDRESS',
            },
        },
        ...
    ]
```

If you are wiring solana to move-vm, create a file in deployments/solana-mainnet/MyOFT.json (solana-testnet if you are using testnet) and add the following field:

```json
{
    "address": <oft-store-address-from-solana-deployment-folder>
}
```

### To wire from EVM to Move-VM:

```bash
pnpm run lz:sdk:evm:wire --oapp-config move.layerzero.config.ts
```

Note: `--simulate <true>` and `--mnemonic-index <value>` are optional.
`--mnemonic-index <value>` is the index of the mnemonic to use for the EVM account. If not specified, EVM_PRIVATE_KEY from `.env` is used. Otherwise, the mnemonic is used along with the index.
If `--only-calldata <true>` is specified, only the calldata is generated and not the transaction (this is primarily for multisig wallets).
To wire from Move-VM to EVM:

### To wire from Move-VM to EVM:

> **⚠️ Important Security Consideration:** When configuring your `move.layerzero.config.ts` file, pay careful attention to the `confirmations` parameter. This value determines the number of block confirmations to wait on Aptos before emitting the message from the source chain. The default value of `5` is for illustration purposes only. For production deployments, it is critical to select an appropriate confirmation value based on your security requirements and risk assessment. Default recommended values can be found at: https://layerzeroscan.com/tools/defaults

```bash
pnpm run lz:sdk:move:wire --oapp-config move.layerzero.config.ts
```

## Set Fee

```bash
pnpm run lz:sdk:move:adapter-set-fee --oapp-config move.layerzero.config.ts --fee-bps 1000 --to-eid number
```

## Set Rate Limit

```bash
pnpm run lz:sdk:move:adapter-set-rate-limit --oapp-config move.layerzero.config.ts --rate-limit 10000 --window-seconds number --to-eid number
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

1. Transfer the delegate
2. Transfer the OApp owner
3. Transfer the object owner

> **Note:** These ownership transfer commands only affect the Move VM (Aptos/Movement) implementation of your OFT. To transfer ownership of EVM implementations, you'll need to use the corresponding EVM ownership transfer commands.

To transfer the delegate, run the following command:
First ensure that the delegate you wish to transfer to is specified in the move.layerzero.config.ts file.

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
> First add this function to ./sources/internal_oft/oft_fa.move in order to expose minting functionality to our move sdk script:

```rust
public entry fun mint(
    admin: &signer,
    recipient: address,
    amount: u64,
) acquires OftImpl {
    assert_admin(address_of(admin));
    primary_fungible_store::mint(&store().mint_ref, recipient, amount);
}
```

Then run the deploy, init, and wire commands again on this new oft. To utilize the mint function, run the following command:

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

## Multi-sig

Multi-sig wallet creation and transaction execution on Initia can be done using the Initia multi-sig builder: https://multisig.testnet.initia.xyz/

For executing transactions on Initia multi-sig you to first generate the transaction parameters using the CLI. This is because some of the OApp methods take parameters that are encoded on the client side by our CLI. In order to obtain the encoded data you can run the desired command in the CLI and choose option 'e' to export the parameters to a json file. When 'e' is selected, the command will not be executed, and instead the transaction data will be written to a json file. From there you can copy the encoded values into the Initia multi-sig front end and execute them with your multi-sig wallet.

Example of console prinout after running a command in the CLI:

```
Choose an action:
(y)es - execute transactions
(e)xport - save as JSON for multisig execution
(n)o - cancel
```

## Help

```bash
pnpm run lz:sdk:help
```

## Validating object ownership of your deployed Initia OApp:

Go to: https://scan.testnet.initia.xyz/initiation-2/interact?address=0x1&moduleName=object&functionType=view&functionName=owner (use mainnet equivalent contract for mainnet)

Fill in the text boxes as follows:
For TO: 0x1::Object::ObjectCore
For the argument: your deployed Object Address

Verify the method returns your desired Initia account address as the object owner.
