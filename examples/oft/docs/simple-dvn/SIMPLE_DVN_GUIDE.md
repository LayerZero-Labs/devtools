# Experimental

Do not use this in production.

Simple DVN is a mock DVN for testnet uses.

## Simple DVN Flow

The Simple DVN follows the same folow on the destination chain:

```
                    ┌──────────┐       ┌──────────┐       ┌──────────┐
                    │          │       │          │       │          │
                    │  VERIFY  │──────▶│  COMMIT  │──────▶│ EXECUTE  │
                    │          │       │          │       │          │
                    └──────────┘       └──────────┘       └──────────┘
                         │                   │                   │
                         │                   │                   │
                         ▼                   ▼                   ▼
                   Validate the        Store verification    Execute the
                  packet payload       result on-chain      cross-chain
                   and signatures      Prepare for          transaction
                                       execution
```

## Instructions

Deploy your OFTs like usual, but **before running the wire command**, you need to configure SimpleDVNMock as a custom DVN.

### Step 1: Configure Custom DVN in layerzero.config.ts

Replace your `layerzero.config.ts` file with the SimpleDVNMock configuration. This must be done before wiring your contracts.

**Simply copy the contents of [`simple-dvn-example.layerzero.config.ts`](./simple-dvn-example.layerzero.config.ts) and replace your entire `layerzero.config.ts` file.**

The example configuration includes:
- A custom `fetchMetadata` function that extends the default LayerZero metadata
- Variables for SimpleDVNMock addresses on both Optimism and Arbitrum Sepolia
- SimpleDVNMock defined as a custom DVN on both chains
- Pathways configured to use SimpleDVNMock as the only required DVN (no LayerZero Labs DVN)
- The configuration passed to `generateConnectionsConfig` with the custom metadata

### Step 2: Deploy SimpleDVNMock

Deploy SimpleDVNMock on both networks:

**Deploy on Optimism Sepolia:**
```
pnpm hardhat --network optimism-testnet deploy --tags SimpleDVNMock
```

**Deploy on Arbitrum Sepolia:**
```
pnpm hardhat --network arbitrum-testnet deploy --tags SimpleDVNMock
```

### Step 3: Update SimpleDVN Addresses

After deploying on both networks, update the address variables in your `layerzero.config.ts` file:

1. **For Optimism Sepolia:**
   - Open `deployments/optimism-testnet/SimpleDVNMock.json`
   - Copy the `address` field value
   - Paste it into the `simpleDvnAddressOptimism` variable

2. **For Arbitrum Sepolia:**
   - Open `deployments/arbitrum-testnet/SimpleDVNMock.json`
   - Copy the `address` field value  
   - Paste it into the `simpleDvnAddressArbitrum` variable

Example:
```typescript
const simpleDvnAddressOptimism = '0x1234...' // Your Optimism deployment address
const simpleDvnAddressArbitrum = '0x5678...' // Your Arbitrum deployment address
```

### Step 4: Wire Your Contracts

Now you can run the wire command to configure your OFT connections with the custom DVN:

```
pnpm hardhat lz:wire
```

This will configure your contracts to use SimpleDVNMock as the only required DVN (bypassing LayerZero Labs DVN entirely).

### Step 5: Send 1 OFT from **Optimism Sepolia** to **Arbitrum Sepolia**

**Use the `lz:oft:send` task with the `--simple-dvn` flag to send OFT tokens and automatically process them through SimpleDVN:**

```
pnpm hardhat lz:oft:send \
  --src-eid 40232 \
  --dst-eid 40231 \
  --amount 1.0 \
  --to <RECIPIENT> \
  --simple-dvn
```

⚠️ **Development Only**: The `--simple-dvn` flag is for development/testing only. Do NOT use on mainnet.

This single command will:
1. 🚀 **Send** the OFT transaction from source to destination
2. 📋 **Verify** the message payload and signatures  
3. 📝 **Commit** the verification result on-chain
4. 📦 **Execute** the cross-chain transaction via lzReceive

The SimpleDVN processing happens automatically after the standard OFT send completes.

## Troubleshooting

If you run into error `0x0177e1ca` (when running commit) which decodes into `LZ_PathNotVerifiable()`, then it might be a nonce issue. If it is a nonce issue, it is due to you using a nonce that has already been used on the destination. To fix, verify with a nonce that is higher, then retry commit.