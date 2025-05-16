# Compose Aptos Move Example

## Flow Overview

This example demonstrates how to use LayerZero's Compose feature to:

1. Send USDe tokens from an EVM chain to the Aptos blockchain
2. Automatically swap the received tokens for USDC on Aptos using Thalaswap
3. Send the resulting USDC to a specified Aptos wallet address

The swap functionality is implemented in the `compose.move` contract, which handles token reception, swapping, and transfers to the destination wallet. The key unlock is that all of this is done through one source chain transaction.

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

## Project Setup

Create a `.env` file with the following variables:

```bash
EVM_PRIVATE_KEY=<your-evm-private-key>

APTOS_ACCOUNT_ADDRESS=<your-aptos-account-address>
APTOS_PRIVATE_KEY=<your-aptos-private-key>
```

Then run `source .env` to make these values available to your environment.

## Create and Publish the Move Package

To create and publish your Move package, run:

```bash
aptos move create-object-and-publish-package --address-name=compose
```

This command will create the necessary object and publish your Move package to the blockchain.

## Configure Composer Ownership

After deploying your composer module, you need to call the `twist_owner` function to allow the composer to access its own tokens and perform swaps:

```bash
aptos move run \
  --function-id <COMPOSER_ADDRESS>::compose::twist_owner \
  --args address:<COMPOSER_OBJECT_ADDRESS> \
  --assume-yes
```

Replace:
- `<COMPOSER_ADDRESS>` with the address where your composer module is deployed
- `<COMPOSER_OBJECT_ADDRESS>` with the object address of your composer

This function transfers ownership, enabling the composer to manage tokens autonomously for swaps and transfers.

## Initialize CLI for Chains

### Initialize Aptos CLI

If you need to generate a new key, run:

```bash
aptos key generate --output-file my_key.pub
```

Then initialize the Aptos CLI and connect to the Aptos network:

```bash
aptos init --network=testnet --private-key=<your-private-key>
```

Verify your initialization was successful:

```bash
cat .aptos/config.yaml
```

If successful, the config will be populated with the RPC links, your account private key, account address, and network.

## Running the Send OFT with Compose Script

Before running the script, make sure to update the parameters in `scripts/sendOFTWithCompose.ts` with your own values:

1. `srcRpcUrl` - The RPC URL for your source chain
2. `srcOftContractAddress` - The address of your OFT contract (for this example it is the Ethena USDe address)
3. `destEndpointId` - The endpoint ID for your destination chain
4. `aptosComposerAddress` - Your Aptos composer address
5. `amountToSend` - The amount of tokens to send
6. `minAmountToSwapOnDest` - The minimum amount to swap on the destination chain
7. `aptosDestWalletAddress` - The wallet address to receive tokens after the swap

Run the script:

```bash
ts-node scripts/sendOFTWithCompose.ts
```

This will:
1. Connect to your source chain
2. Send tokens from your OFT contract to the Aptos composer
3. Execute a compose operation on the destination chain
4. Log the transaction details
