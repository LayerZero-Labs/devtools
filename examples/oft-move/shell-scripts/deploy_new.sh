#!/bin/bash

# Exit on error
set -e

echo "🚀 Starting OFT setup process..."

source .env

# Check if ACCOUNT_ADDRESS is set
if [ -z "$ACCOUNT_ADDRESS" ]; then
    echo "❌ Error: ACCOUNT_ADDRESS environment variable is not set"
    echo "Please set it in your .env file and source it with 'source .env'"
    exit 1
fi

# Build with force
echo "📦 Building contracts..."
echo -e "y\ny\ny" | pnpm run lz:sdk:move:build --oapp-config move.layerzero.config.ts --named-addresses oft=$ACCOUNT_ADDRESS,oft_admin=$ACCOUNT_ADDRESS --force-build true
echo "\n✅ Build complete!\n"

# Deploy with force
echo "🚀 Deploying contracts..."
echo -e "y\ny\ny" | pnpm run lz:sdk:move:deploy --oapp-config move.layerzero.config.ts --address-name oft --named-addresses oft=$ACCOUNT_ADDRESS,oft_admin=$ACCOUNT_ADDRESS --move-deploy-script deploy-move/OFTInitParams.ts --force-deploy true
echo "\n✅ Deploy complete!\n"

# Run init twice
echo "🔧 Running first initialization..."
echo -e "y\ny" | pnpm run lz:sdk:move:init-fa --oapp-config move.layerzero.config.ts --move-deploy-script deploy-move/OFTInitParams.ts

echo "🔧 Running second initialization..."
echo -e "y\ny" | pnpm run lz:sdk:move:init-fa --oapp-config move.layerzero.config.ts --move-deploy-script deploy-move/OFTInitParams.ts

echo "🔧 Setting delegate..."
echo -e "y\ny" | pnpm run lz:sdk:move:set-delegate --oapp-config move.layerzero.config.ts
echo "✅ Setup complete!"