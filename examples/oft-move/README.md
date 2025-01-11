## Move-VM OFT Setup and Deployment

### connecting to aptos via cli

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
Then run `source .env` in order for your values to be mapped to `$ACCOUNT_ADDRESS` and `$EVM_PRIVATE_KEY`

Note: aptos account address can be found in .aptos/config.yaml

## Build and deploy

Note: to overwrite previous deploy and build, you can use `--force-build true` for the build script and `--force-deploy true` for the deploy script.

### Builds the contracts

```bash
pnpm run lz:sdk:move:build --lz-config move.layerzero.config.ts --named-addresses oft=$ACCOUNT_ADDRESS,oft_admin=$ACCOUNT_ADDRESS
```

### Checks for build, builds if not, then deploys the contracts, sets the delegate and initializes
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

```bash
pnpm run lz:sdk:move:deploy --lz-config move.layerzero.config.ts --address-name oft --named-addresses oft=$ACCOUNT_ADDRESS,oft_admin=$ACCOUNT_ADDRESS --move-deploy-script deploy-move/OFTInitParams.ts
```

## Init and Set Delegate

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

Then run the following commands:

```bash
pnpm run lz:sdk:move:init-fa --lz-config move.layerzero.config.ts --move-deploy-script deploy-move/OFTInitParams.ts
```

```bash
pnpm run lz:sdk:move:set-delegate --lz-config move.layerzero.config.ts
```

## Wire
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

Then run the wire command:

```bash
pnpm run lz:sdk:evm:wire --lz-config move.layerzero.config.ts
```

For Move-VM:

```bash
pnpm run lz:sdk:move:wire --lz-config move.layerzero.config.ts
```

## Set Fee

```bash
pnpm run lz:sdk:move:set-fee --lz-config move.layerzero.config.ts --fee-bps 1000 --to-eid number
```

## Set Rate Limit

```bash
pnpm run lz:sdk:move:set-rate-limit --lz-config move.layerzero.config.ts --rate-limit 10000 --window-seconds 60 --to-eid number
```
Rate limit limits how much is sent netted by the amount that is received. It is set on a per pathway basis.
For example if the rate limit from Aptos to EVM is 100 tokens you can send 100 tokens from Aptos to EVM, however if you receive 50 tokens from EVM to Aptos you are then able to send 150 tokens from Aptos to EVM.
Window is the number of seconds over which the capacity is restored. If the rate limit is 1000 and window is 10 seconds, then each second you get 100 (1000/10) capacity back. The units of the rate limit are the tokens in local decimals.

## Unset Rate Limit

```bash
pnpm run lz:sdk:move:unset-rate-limit --lz-config move.layerzero.config.ts --to-eid number
```

## Permanently Disable Blocklist

> ⚠️ **Warning**: This will permanently disable the blocklist for the OFT. It is for OFTs that want to demonstrate to their holders that they will never use blocklisting abilities.

```bash
pnpm run lz:sdk:move:permanently-disable-blocklist
```

## Permanently Disable Freezing

> ⚠️ **Warning**: This will permanently disable the freezing for the OFT. It is for OFTs that want to demonstrate to their holders that they will never use the freezing ability.

```bash
pnpm run lz:sdk:move:permanently-disable-freezing
```

### Mint to Account on Move VM OFT:
> ⚠️ **Warning**: This mint command is only for testing and experimentation purposes. Do not use in production.
First add this function to oft/sources/internal_oft/oft_impl.move in order to expose minting functionality to our move sdk script:
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
pnpm run lz:sdk:move:mint-to-move-oft --amount-ld 1000000000000000000 --to-address <your-move-account-address>
```

## Send from Move VM

```bash
pnpm run lz:sdk:move:send-from-move-oft \
  --amount-ld 10000 \
  --min-amount-ld 100 \
  --src-address <your-move-account-address> \
  --to-address <your-evm-account-address> \
  --gas-limit 400000 \
  --dst-eid <your-dst-eid>\
```

## Help

```bash
pnpm run lz:sdk:help
```

## EVM Deployment

```bash
npx hardhat lz:deploy
```
Select only the evm networks (DO NOT SELECT APTOS or MOVEMENT)
