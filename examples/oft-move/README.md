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

Then run the wire command:

For EVM:

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

## Unset Rate Limit

```bash
pnpm run lz:sdk:move:unset-rate-limit --lz-config move.layerzero.config.ts --to-eid number
```

## Irrevocably Disable Blocklist

Warning: This will irrevocably disable the blocklist for the OFT.
It is for OFTs that want to demonstrate to their holders that they will not ever use the blocklists.
```bash
pnpm run lz:sdk:move:irrevocably-disable-blocklist --lz-config move.layerzero.config.ts
```

## Help

```bash
pnpm run lz:sdk:help
```

## EVM Deployment

```bash
npx hardhat lz:deploy
```

Select only the evm networks (DO NOT SELECT APTOS)
For deploy script tags use:
