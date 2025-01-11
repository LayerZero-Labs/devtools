#!/bin/bash
set -e # Exit on error

# Load environment variables
source .env

echo "Starting OFT Move smoke tests..."

# Build contracts
echo "Building contracts..."
echo -e "y\ny" | pnpm run lz:sdk:move:build --oapp-config move.layerzero.config.ts --named-addresses oft=$ACCOUNT_ADDRESS,oft_admin=$ACCOUNT_ADDRESS

# Deploy contracts
echo "Deploying contracts..."
echo -e "y\ny" | pnpm run lz:sdk:move:deploy --oapp-config move.layerzero.config.ts --address-name oft --named-addresses oft=$ACCOUNT_ADDRESS,oft_admin=$ACCOUNT_ADDRESS --move-deploy-script deploy-move/OFTInitParams.ts

# Initialize and set delegate
echo "Initializing and setting delegate..."
echo -e "y\ny" | pnpm run lz:sdk:move:init-fa --oapp-config move.layerzero.config.ts --move-deploy-script deploy-move/OFTInitParams.ts
echo -e "y\ny" | pnpm run lz:sdk:move:set-delegate --oapp-config move.layerzero.config.ts

# Wire EVM and Move-VM
echo "Wiring EVM and Move-VM..."
echo -e "y\ny" | pnpm run lz:sdk:evm:wire --oapp-config move.layerzero.config.ts
echo -e "y\ny" | pnpm run lz:sdk:move:wire --oapp-config move.layerzero.config.ts

# Set fee (example with EID 2)
echo "Setting fee..."
echo -e "y\ny" | pnpm run lz:sdk:move:set-fee --oapp-config move.layerzero.config.ts --fee-bps 1000 --to-eid 40102

# Set rate limit (example with EID 2)
echo "Setting rate limit..."
echo -e "y\ny" | pnpm run lz:sdk:move:set-rate-limit --oapp-config move.layerzero.config.ts --rate-limit 10000 --window-seconds 60 --to-eid 40102

# Unset rate limit (example with EID 2)
echo "Unsetting rate limit..."
echo -e "y\ny" | pnpm run lz:sdk:move:unset-rate-limit --oapp-config move.layerzero.config.ts --to-eid 40102

# Permanently disable blocklist
echo "Disabling blocklist..."
echo -e "y\ny" | pnpm run lz:sdk:move:permanently-disable-blocklist

# Permanently disable freezing
echo "Disabling freezing..."
echo -e "y\ny" | pnpm run lz:sdk:move:permanently-disable-freezing

# Deploy EVM contracts
echo "Deploying EVM contracts..."
echo -e "y\ny" | npx hardhat lz:deploy

echo "Smoke tests completed!"