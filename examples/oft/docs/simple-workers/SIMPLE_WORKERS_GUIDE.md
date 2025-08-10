# Experimental

Do not use this in production.

Simple Workers refers to mock implementations of LayerZero workers for testnet uses. This includes SimpleDVNMock and SimpleExecutorMock contracts.

## Simple Workers Flow

Simple Workers (SimpleDVNMock and SimpleExecutorMock) follow the same flow on the destination chain:

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

Deploy your OFTs like usual, but **before running the wire command**, you need to configure Simple Workers (SimpleDVNMock and SimpleExecutorMock) as custom workers.

### Step 1: Configure Custom Workers in layerzero.config.ts

Replace your `layerzero.config.ts` file with the Simple Workers configuration. This must be done before wiring your contracts.

**Simply copy the contents of [`simple-workers-example.layerzero.config.ts`](./simple-workers-example.layerzero.config.ts) and replace your entire `layerzero.config.ts` file.**

You can either manually copy the contents or run the following to entirely replace the file:

```
cp docs/simple-workers/simple-workers-example.layerzero.config.ts layerzero.config.ts
```

The example configuration includes:

- A custom `fetchMetadata` function that extends the default LayerZero metadata
- Variables for Simple Workers addresses on both Optimism and Arbitrum Sepolia
- Simple Workers (SimpleDVNMock and SimpleExecutorMock) defined as custom workers on both chains
- Pathways configured to use Simple Workers as the only required workers (no LayerZero Labs DVN)
- The configuration passed to `generateConnectionsConfig` with the custom metadata

### Step 2: Deploy Simple Workers

Deploy Simple Workers (SimpleDVNMock and SimpleExecutorMock) on both networks:

**Deploy SimpleDVNMock:**

```
pnpm hardhat lz:deploy --tags SimpleDVNMock
```

Select both `arbitrum-testnet` and `optimism-testnet` and specify the contract name `SimpleDVNMock` as the tag.

**Deploy on SimpleExecutorMock:**

```
pnpm hardhat lz:deploy --tags SimpleExecutorMock
```

Select both `arbitrum-testnet` and `optimism-testnet` and specify the contract name `SimpleExecutorMock` as the tag.

### Step 3: Update Simple Workers Addresses

After deploying on both networks, update the address variables in your `layerzero.config.ts` file:

1. **For Optimism Sepolia:**

   - Open `deployments/optimism-testnet/SimpleDVNMock.json` and `deployments/optimism-testnet/SimpleExecutorMock.json`
   - Copy the `address` field values
   - Paste them into the respective address variables

2. **For Arbitrum Sepolia:**
   - Open `deployments/arbitrum-testnet/SimpleDVNMock.json` and `deployments/arbitrum-testnet/SimpleExecutorMock.json`
   - Copy the `address` field values
   - Paste them into the respective address variables

Example:

```typescript
const simpleDvnAddressOptimism = "0x1234..."; // Your Optimism SimpleDVNMock address
const simpleDvnAddressArbitrum = "0x5678..."; // Your Arbitrum SimpleDVNMock address
const simpleExecutorAddressOptimism = "0x9abc..."; // Your Optimism SimpleExecutorMock address
const simpleExecutorAddressArbitrum = "0xdef0..."; // Your Arbitrum SimpleExecutorMock address
```

### Step 4: Wire Your Contracts

Now you can run the wire command to configure your OFT connections with the Simple Workers:

```bash
pnpm hardhat lz:oapp:wire
```

This will configure your contracts to use Simple Workers (SimpleDVNMock and SimpleExecutorMock) as the only required workers (bypassing LayerZero Labs DVN entirely).

### Step 5: Configure Executor Settings

Note that this task will not be needed to be run after https://github.com/LayerZero-Labs/devtools/pull/1637 is merged

After wiring, you need to configure the executor settings for both send and receive operations on each chain:

**Set Send Configuration (for outgoing messages):**

```bash
# On Optimism Sepolia (to send to Arbitrum)
pnpm hardhat lz:simple-workers:set-send-config --dst-eid 40231 --contract-name MyOFTMock --network optimism-testnet

# On Arbitrum Sepolia (to send to Optimism)
pnpm hardhat lz:simple-workers:set-send-config --dst-eid 40232 --contract-name MyOFTMock --network arbitrum-testnet
```

These commands will:
- Set up SimpleExecutorMock as the executor for message processing
- Use 1 confirmation and appropriate gas limits for testing

### Step 6: Send 1 OFT from **Optimism Sepolia** to **Arbitrum Sepolia**

**Use the `lz:oft:send` task with the `--simple-workers` flag to send OFT tokens and automatically process them through SimpleWorkers:**

```
pnpm hardhat lz:oft:send \
  --src-eid 40232 \
  --dst-eid 40231 \
  --amount 1.0 \
  --to <RECIPIENT> \
  --simple-workers
```

⚠️ **Development Only**: The `--simple-workers` flag is for development/testing only. Do NOT use on mainnet.

This single command will:

1. 🚀 **Send** the OFT transaction from source to destination
2. 📋 **Verify** the message payload and signatures (via SimpleDVNMock)
3. 📝 **Commit** the verification result on-chain
4. 📦 **Execute** the cross-chain transaction via lzReceive (via SimpleExecutorMock)

The Simple Workers processing happens automatically after the standard OFT send completes.

## Troubleshooting

If you run into error `0x0177e1ca` (when running commit) which decodes into `LZ_PathNotVerifiable()`, then it might be a nonce issue. If it is a nonce issue, it is due to you using a nonce that has already been used on the destination. To fix, verify with a nonce that is higher, then retry commit.
