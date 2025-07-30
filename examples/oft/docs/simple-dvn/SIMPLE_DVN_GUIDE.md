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
- A `simpleDvnAddress` variable that you need to fill in with your deployed SimpleDVNMock address
- SimpleDVNMock defined as a custom DVN using the address from the variable
- Pathways configured to use SimpleDVNMock by its canonical name 'SimpleDVNMock'
- The configuration passed to `generateConnectionsConfig` with the custom metadata

### Step 2: Deploy SimpleDVNMock

Deploy SimpleDVNMock on the destination chain:

```
pnpm hardhat --network arbitrum-testnet deploy --tags SimpleDVNMock
```

### Step 3: Update SimpleDVN Address

After deployment, update the `simpleDvnAddress` variable in your `layerzero.config.ts` file:

1. Open `deployments/arbitrum-testnet/SimpleDVNMock.json`
2. Copy the `address` field value
3. Paste it into the `simpleDvnAddress` variable in your `layerzero.config.ts`

Example:
```typescript
const simpleDvnAddress = '0xF1e41BaB1E9D09473fA048E09174EBA2669f7ea8' // Your actual deployed address
```

### Step 4: Wire Your Contracts

Now you can run the wire command to configure your OFT connections with the custom DVN:

```
pnpm hardhat lz:wire
```

This will configure your contracts to use the SimpleDVNMock as defined in your `layerzero.config.ts`.

### Step 5: Set Receive Config (Optional)

If you want to use SimpleDVNMock as the only required DVN (bypassing LayerZero Labs DVN), update the destination chain's receive config:

```
pnpm hardhat --network arbitrum-testnet lz:simple-dvn:set-receive-config --src-eid 40232 --contract-name MyOFTMock
```

### Step 6: Execute SimpleDVN Flow

**Use the `lz:simple-dvn:full` task to execute all three steps (verify → commit → execute) in one command:**

```
pnpm hardhat --network arbitrum-testnet lz:simple-dvn:full \
  --src-eid 40232 \
  --src-oapp <SOURCE_OFT_ADDRESS> \
  --nonce 1 \
  --to-address <RECIPIENT_ADDRESS> \
  --amount 1.5 \
  --dst-eid 40231
```

This single command will:
1. 📋 **Verify** the message payload and signatures
2. 📝 **Commit** the verification result on-chain  
3. 📦 **Execute** the cross-chain transaction via lzReceive

### Alternative: Execute Individual Steps

If you need more control or want to execute steps separately, you can use the individual tasks:

**Step 1: Verify**
```
pnpm hardhat --network arbitrum-testnet lz:simple-dvn:verify \
  --src-eid 40232 \
  --src-oapp <SOURCE_OFT_ADDRESS> \
  --nonce 1 \
  --to-address <RECIPIENT_ADDRESS> \
  --amount 1.5 \
  --dst-eid 40231
```

**Step 2: Commit**
```
pnpm hardhat --network arbitrum-testnet lz:simple-dvn:commit \
  --src-eid 40232 \
  --src-oapp <SOURCE_OFT_ADDRESS> \
  --nonce 1 \
  --to-address <RECIPIENT_ADDRESS> \
  --amount 1.5 \
  --dst-eid 40231
```

**Step 3: Execute (lzReceive)**
```
pnpm hardhat --network arbitrum-testnet lz:simple-dvn:lz-receive \
  --src-eid 40232 \
  --src-oapp <SOURCE_OFT_ADDRESS> \
  --nonce 1 \
  --to-address <RECIPIENT_ADDRESS> \
  --amount 1.5 \
  --dst-eid 40231
```

## Troubleshooting

If you run into error `0x0177e1ca` (when running commit) which decodes into `LZ_PathNotVerifiable()`, then it might be a nonce issue. If it is a nonce issue, it is due to you using a nonce that has already been used on the destination. To fix, verify with a nonce that is higher, then retry commit.