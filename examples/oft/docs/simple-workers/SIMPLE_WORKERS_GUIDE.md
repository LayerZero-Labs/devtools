# Experimental

Do not use this in production.

Simple Workers refers to mock implementations of LayerZero workers for testnet uses. This includes:

- **SimpleDVNMock**: Data Verification Network for message verification
- **SimpleExecutorMock**: Executor mock used for both send and destination commit/execute operations

## Simple Workers Flow

Simple Workers follow different flows depending on their role:

**Send Operations (SimpleExecutorMock on source chain):**

- Handles the initial send transaction and fee calculation

**Destination Operations (SimpleDVNMock and SimpleExecutorMock on destination chain):**

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

Note: both `commit` and `execute` are permissionless. For simplicity, we combine the two into one function called `commitAndExecute` in `SimpleExecutorMock.sol`.

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
- Variables for Simple Workers addresses on both Base Sepolia and Arbitrum Sepolia
- Simple Workers (SimpleDVNMock and SimpleExecutorMock) defined as custom workers on both chains
- Pathways configured to use Simple Workers as the only required workers (no LayerZero Labs DVN)
- The configuration passed to `generateConnectionsConfig` with the custom metadata

### Step 2: Deploy Simple Workers

Deploy Simple Workers (SimpleDVNMock and SimpleExecutorMock) on both networks:

**Deploy SimpleDVNMock:**

```
pnpm hardhat lz:deploy --tags SimpleDVNMock
```

Select both `arbitrum-testnet` and `base-testnet` and specify the contract name `SimpleDVNMock` as the tag.

**Deploy SimpleExecutorMock (for send operations):**

```
pnpm hardhat lz:deploy --tags SimpleExecutorMock
```

Select both `arbitrum-testnet` and `base-testnet` and specify the contract name `SimpleExecutorMock` as the tag.

> There is no longer a separate destination executor. Use `SimpleExecutorMock` for commit-and-execute on the destination chain.

### Step 3: Update Simple Workers Addresses

After deploying on both networks, update the address variables in your `layerzero.config.ts` file:

1. **For Base Sepolia:**

   - Open `deployments/base-testnet/SimpleDVNMock.json` and `deployments/base-testnet/SimpleExecutorMock.json`
   - Copy the `address` field values
   - Paste them into the respective address variables

2. **For Arbitrum Sepolia:**
   - Open `deployments/arbitrum-testnet/SimpleDVNMock.json` and `deployments/arbitrum-testnet/SimpleExecutorMock.json`
   - Copy the `address` field values
   - Paste them into the respective address variables

Example:

```typescript
const simpleDvnAddressBase = "0x1234..."; // Your Base SimpleDVNMock address
const simpleDvnAddressArbitrum = "0x5678..."; // Your Arbitrum SimpleDVNMock address
const simpleExecutorAddressBase = "0x9abc..."; // Your Base SimpleExecutorMock address
const simpleExecutorAddressArbitrum = "0xdef0..."; // Your Arbitrum SimpleExecutorMock address
// No separate DestinationExecutorMock needed anymore
```

### Step 4: Wire Your Contracts

Now you can run the wire command to configure your OFT connections:

```bash
pnpm hardhat lz:oapp:wire
```

⚠️ **Important**: This command will initially configure your contracts to use **default LayerZero workers** (DVN and Executor). This is expected! The next step will override these with your Simple Workers.

### Step 5: Override with Simple Workers Configuration

After wiring, you need to override the default worker configuration with your Simple Workers. This is the key step that switches from production LayerZero workers to your development Simple Workers.

**Set Send Configuration (for outgoing messages):**

```bash
# On Base Sepolia (to send to Arbitrum)
pnpm hardhat lz:simple-workers:set-send-config --dst-eid 40231 --contract-name MyOFTMock --network base-testnet

# On Arbitrum Sepolia (to send to Base)
pnpm hardhat lz:simple-workers:set-send-config --dst-eid 40245 --contract-name MyOFTMock --network arbitrum-testnet
```

These commands will:

- Override the default LayerZero workers with your Simple Workers
- Set up SimpleDVNMock as the DVN for message verification
- Set up SimpleExecutorMock as the executor for message processing
- Use 1 confirmation and appropriate gas limits for testing

⚠️ **Important**: You must run these configuration commands **after** the `lz:oapp:wire` command, as the wire command will reset the configuration to use default LayerZero workers.

### Step 6: Send 1 OFT from **Base Sepolia** to **Arbitrum Sepolia**

First, via the mock contract, let's mint on **Base Sepolia**:

```
cast send <OFT_ADDRESS> "mint(address,uint256)" <RECIPIENT_ADDRESS> 1000000000000000000000 --private-key <PRIVATE_KEY> --rpc-url <BASE_SEPOLIA_RPC_URL>
```

**Use the `lz:oft:send` task with the `--simple-workers` flag to send OFT tokens and automatically process them through SimpleWorkers:**

```
pnpm hardhat lz:oft:send \
  --src-eid 40245 \
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
