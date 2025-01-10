#!/bin/bash

# Exit on error
set -e

echo "🚀 Starting OFT setup process..."

source .env

# Run init twice
echo "🔧 Running first initialization..."
echo -e "y\ny" | pnpm run lz:sdk:move:init-fa --lz-config move.layerzero.config.ts --move-deploy-script deploy-move/OFTInitParams.ts

echo "🔧 Running second initialization..."
echo -e "y\ny" | pnpm run lz:sdk:move:init-fa --lz-config move.layerzero.config.ts --move-deploy-script deploy-move/OFTInitParams.ts

echo "🔧 Setting delegate..."
echo -e "y\ny" | pnpm run lz:sdk:move:set-delegate --lz-config move.layerzero.config.ts

echo "🔌 Running first Move-VM wire..."
echo -e "y\ny" | pnpm run lz:sdk:move:wire --lz-config move.layerzero.config.ts

echo "🔌 Running second Move-VM wire..."
echo -e "y\ny" | pnpm run lz:sdk:move:wire --lz-config move.layerzero.config.ts

echo "✅ Setup complete!"