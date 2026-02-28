# LayerZero Deployment Workflow

This guide explains the complete workflow for deploying and configuring LayerZero OApps and OFTs.

## The Big Picture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           Cross-Chain Message Flow                               │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  Source Chain                  LayerZero Network              Destination Chain  │
│  ────────────                  ────────────────              ─────────────────   │
│                                                                                  │
│  ┌─────────┐                                                   ┌─────────┐      │
│  │ Your    │ ──► ┌──────────┐     ┌─────┐     ┌──────────┐ ──► │ Your    │      │
│  │ OApp    │     │ Endpoint │ ──► │ DVN │ ──► │ Endpoint │     │ OApp    │      │
│  └─────────┘     └──────────┘     └─────┘     └──────────┘     └─────────┘      │
│       │                            │   │                            │           │
│       │                            │   │                            │           │
│  User calls                   DVNs verify                    Executor delivers  │
│  send()                       the message                    and calls receive  │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Transaction Model

A LayerZero deployment requires transactions on **every chain** in your configuration. Here's the breakdown:

### Phase 1: Deployment

| Action | Transactions | Description |
|--------|--------------|-------------|
| Deploy contract | 1 per chain | Deploy your OApp/OFT contract |
| **Total** | **N chains** | N deployment transactions |

### Phase 2: Wiring (Configuration)

For each **pathway** (A ↔ B), the wire task generates:

| Action | Transactions | Description |
|--------|--------------|-------------|
| `setPeer` | 2 (A→B, B→A) | Set peer addresses |
| `setConfig` (Send) | 2 | Configure send library (DVNs, etc.) |
| `setConfig` (Receive) | 2 | Configure receive library |
| `setEnforcedOptions` | 2 | Set minimum gas options |
| **Total per pathway** | **~8 txs** | 4 on each chain |

### Example: 2-Chain Deployment (Base ↔ Arbitrum)

```
Deployment Phase:
  - Deploy MyOFT on Base:       1 tx
  - Deploy MyOFT on Arbitrum:   1 tx
  Total:                        2 txs

Wiring Phase:
  - setPeer (Base → Arb):       1 tx on Base
  - setPeer (Arb → Base):       1 tx on Arbitrum
  - setConfig (Base send):      1 tx on Base
  - setConfig (Base receive):   1 tx on Base
  - setConfig (Arb send):       1 tx on Arbitrum
  - setConfig (Arb receive):    1 tx on Arbitrum
  - setEnforcedOptions:         2 txs (1 per chain)
  Total:                        ~8 txs

Grand Total:                    ~10 transactions
```

### Example: 3-Chain Deployment (A ↔ B ↔ C)

With 3 chains fully connected (3 pathways: A-B, A-C, B-C):
- Deployment: 3 txs
- Wiring: 3 pathways × ~8 txs = ~24 txs
- **Total: ~27 transactions**

## Hardhat as Task Orchestration

**Key Insight**: In this repository, Hardhat is used as a **task orchestration system**, not just a Solidity compiler.

The LayerZero SDK exposes functionality through Hardhat tasks:

```bash
# These are NOT just compile commands - they orchestrate multi-chain operations
npx hardhat lz:deploy           # Deploys to ALL configured networks
npx hardhat lz:oapp:wire        # Configures ALL pathways
npx hardhat lz:oapp:config:get  # Reads config from ALL chains
```

### How It Works

1. `@layerzerolabs/toolbox-hardhat` registers custom tasks
2. Tasks read your `hardhat.config.ts` for network definitions
3. Tasks read your `layerzero.config.ts` for pathway configuration
4. Tasks execute transactions across multiple networks

## Understanding layerzero.config.ts

The configuration file defines your **OmniGraph** - the topology of your omnichain application.

### Structure

```typescript
// layerzero.config.ts exports an async function
export default async function() {
    return {
        contracts: OmniNode[],     // Which contracts on which chains
        connections: OmniEdge[],   // Pathways between contracts
    }
}
```

### Why Is Config Async?

The config fetches **live metadata** at runtime:
- DVN contract addresses per chain
- Default configurations
- Executor addresses

This ensures your config uses the latest deployed infrastructure.

### Key Types

```typescript
// OmniPointHardhat - A contract location
const myContract: OmniPointHardhat = {
    eid: EndpointId.BASESEP_V2_TESTNET,  // Which chain
    contractName: 'MyOFT',                 // Contract name (from hardhat-deploy)
}

// OmniNode - A contract with its configuration
const node = {
    contract: myContract,
    config: { /* optional per-contract config */ }
}

// OmniEdge - A pathway between two contracts
const edge = {
    from: contractA,
    to: contractB,
    config: {
        sendConfig: { /* DVN, executor config */ },
        receiveConfig: { /* DVN config */ },
        enforcedOptions: [ /* gas options */ ],
    }
}
```

### Using generateConnectionsConfig()

The helper function simplifies bidirectional pathway configuration:

```typescript
import { generateConnectionsConfig, TwoWayConfig } from '@layerzerolabs/metadata-tools'

const pathways: TwoWayConfig[] = [
    [
        contractA,                          // From
        contractB,                          // To
        [['LayerZero Labs'], []],           // [requiredDVNs, [optionalDVNs, threshold]]
        [1, 1],                             // [A→B confirmations, B→A confirmations]
        [enforcedOptionsAtoB, enforcedOptionsBtoA],
    ],
]

const connections = await generateConnectionsConfig(pathways)
```

## Pathway Lifecycle

A pathway goes through these states:

```
1. DEPLOYED
   └── Contracts deployed, but not connected
   └── Cannot send messages

2. WIRED (Peer Set)
   └── setPeer() called on both ends
   └── Contracts know each other's addresses
   └── Still cannot send without proper config

3. CONFIGURED
   └── setConfig() called for send/receive
   └── DVNs and executors configured
   └── setEnforcedOptions() called

4. LIVE ✓
   └── All configuration complete
   └── Messages can flow in both directions
```

### Checking Pathway Status

```bash
# Check if peers are set
npx hardhat lz:oapp:peers:get --oapp-config layerzero.config.ts

# Check full configuration
npx hardhat lz:oapp:config:get --oapp-config layerzero.config.ts

# Compare with LayerZero defaults
npx hardhat lz:oapp:config:get:default --oapp-config layerzero.config.ts
```

## Common Workflows

### Workflow 1: Fresh Testnet Deployment

```bash
# 1. Setup environment
cp .env.example .env
# Edit .env with MNEMONIC or PRIVATE_KEY

# 2. Install and build
pnpm install
pnpm compile

# 3. Deploy to all networks
npx hardhat lz:deploy

# 4. Wire all pathways
npx hardhat lz:oapp:wire --oapp-config layerzero.config.ts

# 5. Verify configuration
npx hardhat lz:oapp:config:get --oapp-config layerzero.config.ts

# 6. Send test message/token (example-specific task)
# Note: lz:oft:send is a custom task defined in examples/oft/tasks/, not a core SDK task
# Each example may have its own send task implementation
npx hardhat lz:oft:send --network base-sepolia --to arbitrum-sepolia --amount 1000000000000000000
```

### Workflow 2: Adding a New Chain

1. **Update hardhat.config.ts**:
```typescript
networks: {
    // Existing networks...
    'new-chain': {
        eid: EndpointId.NEW_CHAIN_V2_MAINNET,
        url: process.env.RPC_URL_NEW_CHAIN,
        accounts,
    },
}
```

2. **Update layerzero.config.ts**:
```typescript
const newChainContract: OmniPointHardhat = {
    eid: EndpointId.NEW_CHAIN_V2_MAINNET,
    contractName: 'MyOFT',
}

// Add to contracts array
contracts: [
    { contract: existingContract1 },
    { contract: existingContract2 },
    { contract: newChainContract },  // Add new
]

// Add pathways to existing contracts
const pathways: TwoWayConfig[] = [
    // Existing pathways...
    [existingContract1, newChainContract, ...],
    [existingContract2, newChainContract, ...],
]
```

3. **Deploy and wire**:
```bash
# Deploy only to new network
npx hardhat deploy --network new-chain --tags MyOFT

# Wire all pathways (including new ones)
npx hardhat lz:oapp:wire --oapp-config layerzero.config.ts
```

### Workflow 3: Updating Configuration

If you need to change DVNs, confirmations, or enforced options:

1. Update `layerzero.config.ts` with new configuration
2. Run wire again - it will only update changed values:
```bash
npx hardhat lz:oapp:wire --oapp-config layerzero.config.ts
```

## Environment Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `MNEMONIC` | Wallet mnemonic phrase | `word1 word2 ... word12` |
| `PRIVATE_KEY` | Alternative to mnemonic | `0xabc123...` |
| `RPC_URL_<NETWORK>` | RPC endpoint per network | `https://rpc.example.com` |

### .env Example

```bash
# Authentication (choose one)
MNEMONIC="your twelve word mnemonic phrase goes here"
# PRIVATE_KEY=0x...

# RPC URLs
RPC_URL_BASE_SEPOLIA=https://base-sepolia.gateway.tenderly.co
RPC_URL_ARB_SEPOLIA=https://arbitrum-sepolia.gateway.tenderly.co
```

## See Also

- [DEBUGGING.md](./DEBUGGING.md) - Troubleshooting guide
- [CHEATSHEET.md](./CHEATSHEET.md) - Quick reference
- [examples/oft/](./examples/oft/) - OFT example with full config
- [Official Documentation](https://docs.layerzero.network/)
