<p align="center">
  <a href="https://layerzero.network">
    <picture>
      <source srcset="https://docs.layerzero.network/img/LayerZero_Logo_White.svg" media="(prefers-color-scheme: dark)">
      <source srcset="https://docs.layerzero.network/img/LayerZero_Logo_Black.svg" media="(prefers-color-scheme: light)">
      <img alt="LayerZero" src="https://docs.layerzero.network/img/LayerZero_Logo_Black.svg" style="width: 400px;">
    </picture>
  </a>
</p>

<h1 align="center">OFT Multi-VM Example</h1>

<p align="center">
A complete example for deploying and wiring an Omnichain Fungible Token (OFT) across <b>EVM</b>, <b>Solana</b>, <b>Sui</b>, and <b>Starknet</b>.
</p>

## Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Copy and configure environment
cp .env.example .env
# Edit .env with your keys and RPC URLs

# 3. Deploy on each VM (see Deploy sections below)

# 4. Wire all chains together
npx hardhat lz:oapp:wire --oapp-config layerzero.config.ts

# 5. Send tokens cross-chain
npx hardhat lz:oft:send --src-eid <SRC> --dst-eid <DST> --amount 1 --to <ADDRESS>
```

## Supported VMs

| VM | Endpoint ID (Mainnet) | Endpoint ID (Testnet) | Status |
|----|----------------------|----------------------|--------|
| Arbitrum | 30110 | 40231 | ✅ |
| Solana | 30168 | 40168 | ✅ |
| Sui | 30280 | 40245 | ✅ |
| Starknet | 30500 | 40253 | ✅ |

## Environment Setup

Create `.env` from the example and configure:

```bash
cp .env.example .env
```

### Required Variables

```bash
# EVM (Arbitrum)
PRIVATE_KEY=0x...              # EVM deployer private key
RPC_URL_ARBITRUM=...           # Arbitrum RPC URL

# Solana (optional)
SOLANA_PRIVATE_KEY=...         # Base58 or [1,2,3...] array format
RPC_URL_SOLANA=...             # Solana RPC URL

# Sui (optional)
SUI_PRIVATE_KEY=...            # Base64 or hex format
RPC_URL_SUI=...                # Sui RPC URL

# Starknet (optional)
STARKNET_ACCOUNT_ADDRESS=0x... # Deployed account contract address
STARKNET_PRIVATE_KEY=0x...     # Account private key
RPC_URL_STARKNET=...           # Starknet RPC URL
```

## Deploy

### EVM (Arbitrum)

```bash
npx hardhat lz:deploy
# Select: arbitrum-mainnet (or arbitrum-sepolia for testnet)
# Select: MyOFT
```

### Solana

```bash
# 1. Build the program
anchor build -v -e OFT_ID=$(anchor keys list | grep oft | awk '{print $2}')

# 2. Deploy the program
solana program deploy --program-id target/deploy/oft-keypair.json target/verifiable/oft.so -u mainnet-beta

# 3. Create OFT store
npx hardhat lz:oft:solana:create --eid 30168 --program-id <PROGRAM_ID> --only-oft-store true --amount 100000000000
```

### Sui

```bash
# 1. Deploy token package
cd sui/token
sui client publish --gas-budget 500000000 --json > token_deploy.json

# 2. Deploy OFT package
cd ../oft
sui client publish --gas-budget 1000000000 --json > oft_deploy.json

# 3. Initialize OFT (see sui/README.md for full details)
# Creates sui/deploy.json with oftPackageId
```

### Starknet

```bash
# Deploy ERC20 + OFT adapter (creates starknet/deploy.json)
node starknet/deploy-starknet-mainnet.js
```

## Configure

Edit `layerzero.config.ts` to enable/disable VMs:

```typescript
const INCLUDE_EVM = true
const INCLUDE_SOLANA = false  // Set true after deploying
const INCLUDE_SUI = true
const INCLUDE_STARKNET = true
```

The config automatically:
- Loads deployment addresses from `./sui/deploy.json` and `./starknet/deploy.json`
- Generates full mesh pathways between all enabled VMs
- Sets appropriate enforced options for each destination chain

## Wire

Connect all deployed OFTs:

```bash
npx hardhat lz:oapp:wire --oapp-config layerzero.config.ts
```

This sets:
- Peers (bidirectional address registration)
- Send/Receive libraries
- DVN and Executor configurations
- Enforced options (gas limits for each destination)

## Send Tokens

### EVM → Any

```bash
# To Sui
npx hardhat lz:oft:send --src-eid 30110 --dst-eid 30280 --amount 1 --to <SUI_ADDRESS>

# To Starknet
npx hardhat lz:oft:send --src-eid 30110 --dst-eid 30500 --amount 1 --to <STARKNET_ADDRESS>

# To Solana
npx hardhat lz:oft:send --src-eid 30110 --dst-eid 30168 --amount 1 --to <SOLANA_ADDRESS>
```

### Sui → Any

```bash
npx hardhat lz:oft:send \
  --src-eid 30280 \
  --dst-eid 30110 \
  --amount 1 \
  --to <EVM_ADDRESS> \
  --sui-oft-package-id <PKG_ID> \
  --sui-oft-object-id <OFT_OBJ> \
  --sui-oapp-object-id <OAPP_OBJ> \
  --sui-token-type <TOKEN_TYPE>
```

### Starknet → Any

```bash
npx hardhat lz:oft:send \
  --src-eid 30500 \
  --dst-eid 30110 \
  --amount 1 \
  --to <EVM_ADDRESS> \
  --oft-address <STARKNET_OFT_ADDRESS>
```

### Solana → Any

```bash
npx hardhat lz:oft:send --src-eid 30168 --dst-eid 30110 --amount 1 --to <EVM_ADDRESS>
```

## Deployment Files

| VM | Deployment File | Key Fields |
|----|-----------------|------------|
| EVM | `deployments/<network>/MyOFT.json` | Auto-loaded by hardhat-deploy |
| Solana | `deployments/solana-mainnet/OFT.json` | `oftStore` |
| Sui | `sui/deploy.json` | `oftPackageId` |
| Starknet | `starknet/deploy.json` | `oftAddress` |

## Enforced Options

Gas/compute limits for `lzReceive` on each destination:

| Destination | Gas | Value | Notes |
|-------------|-----|-------|-------|
| EVM | 80,000 | 0 | Standard EVM gas |
| Solana | 200,000 | 2,039,280 | CU limit + rent for token account |
| Sui | 5,000 | 0 | Sui gas budget |
| Starknet | 500,000 | 0 | Cairo steps |

## Troubleshooting

### "Missing required deployment file"
Deploy on that VM first, or disable it in `layerzero.config.ts`.

### "Cannot find module '@layerzerolabs/devtools-sui'"
```bash
pnpm install
pnpm build
```

### "Insufficient balance" on Starknet send
Ensure your Starknet account has:
1. Tokens to send (check ERC20 balance)
2. STRK for gas fees

### "LZ_OAPP_CORE_NOT_ENOUGH_NATIVE_ALLOWANCE" on Starknet
The send task automatically approves STRK for fees. Ensure you have enough STRK in your account.

### Wire task shows "0 transactions needed"
All pathways are already configured. Run with `--dry-run` to see current state.

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Arbitrum  │────▶│   Solana    │────▶│     Sui     │────▶│  Starknet   │
│    (EVM)    │◀────│   (SVM)     │◀────│   (Move)    │◀────│  (Cairo)    │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
       │                  │                   │                   │
       └──────────────────┴───────────────────┴───────────────────┘
                              Full Mesh
```

Each OFT is connected to every other OFT via LayerZero, enabling direct transfers between any pair of chains.

## Resources

- [LayerZero Docs](https://docs.layerzero.network/)
- [OFT Standard](https://docs.layerzero.network/v2/concepts/applications/oft-standard)
- [Endpoint IDs](https://docs.layerzero.network/v2/deployments/deployed-contracts)
- [LayerZero Scan](https://layerzeroscan.com/) - Track cross-chain messages
