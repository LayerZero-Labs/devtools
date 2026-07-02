# CLAUDE.md - Examples Directory

This directory contains **reference implementations** for building omnichain applications with LayerZero.

## Quick Start

For external developers, the recommended path is:

```bash
# Create a new project from an example
npx create-lz-oapp@latest

# Or clone this repo and use an example directly
cd examples/oft
pnpm install
pnpm compile
```

## Example Categories

| Category | Examples | Use Case |
|----------|----------|----------|
| **OFT (Tokens)** | `oft`, `oft-adapter`, `oft-upgradeable`, `oft-alt` | Cross-chain fungible tokens |
| **OApp (Messaging)** | `oapp`, `oapp-read`, `omni-call` | Cross-chain message passing |
| **ONFT (NFTs)** | `onft721`, `onft721-zksync` | Cross-chain non-fungible tokens |
| **Multi-VM** | `oft-solana`, `oapp-solana`, `oft-aptos-move`, `oapp-aptos-move` | Solana, Aptos integration |
| **Specialized** | `oft-hyperliquid`, `oft-initia`, `oft-tron` | Chain-specific implementations |

## Start Here

| Goal | Example |
|------|---------|
| Deploy a new cross-chain token | `oft/` |
| Wrap an existing ERC20 | `oft-adapter/` |
| Build custom cross-chain messaging | `oapp/` |
| Read data from other chains | `oapp-read/` |
| Cross-chain NFT | `onft721/` |
| Solana integration | `oft-solana/` or `oapp-solana/` |
| Aptos/Move integration | `oft-aptos-move/` or `oapp-aptos-move/` |

## Common Files in Each Example

| File | Purpose |
|------|---------|
| `hardhat.config.ts` | Network definitions with `eid` (Endpoint ID) mapping |
| `layerzero.config.ts` | Pathway configuration - defines which chains connect |
| `contracts/` | Solidity smart contracts |
| `deploy/` | Hardhat-deploy scripts |
| `tasks/` | Custom Hardhat tasks (if any) |
| `.env.example` | Environment variables template |

## Standard Workflow (EVM Examples)

```bash
# 1. Setup
cp .env.example .env
# Edit .env with MNEMONIC or PRIVATE_KEY and RPC URLs

# 2. Build
pnpm install
pnpm compile

# 3. Deploy to all configured chains
npx hardhat lz:deploy

# 4. Wire pathways (setPeer, setConfig, setEnforcedOptions)
npx hardhat lz:oapp:wire --oapp-config layerzero.config.ts

# 5. Verify configuration
npx hardhat lz:oapp:config:get --oapp-config layerzero.config.ts

# 6. Send test message/token (example-specific task)
npx hardhat lz:oft:send --network source-network ...
```

## Understanding layerzero.config.ts

The config file defines an **OmniGraph** - the network topology of your application:

```typescript
// Key concepts:
// - contracts: Which contracts on which chains
// - connections: Pathways between contracts (setPeer, DVN config, etc.)

export default async function() {
    const connections = await generateConnectionsConfig(pathways)
    return {
        contracts: [
            { contract: baseContract },      // OmniNode
            { contract: arbitrumContract },  // OmniNode
        ],
        connections,  // OmniEdge[] - generated from pathways
    }
}
```

## Platform-Specific Notes

### Solana Examples (`oft-solana`, `oapp-solana`)
- Requires Rust and Anchor toolchain
- Uses `anchor build` for program compilation
- EVM wiring commands work alongside Solana-specific tasks

### Aptos/Move Examples (`oft-aptos-move`, `oapp-aptos-move`)
- Requires Aptos CLI
- Move contracts in `sources/` directory
- Separate wire commands for EVM and Move components

### ZkSync Examples (`onft721-zksync`)
- Uses zkSync-specific compiler settings
- Additional verification steps required

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "MNEMONIC not found" | Copy `.env.example` to `.env` and set credentials |
| "Cannot find network" | Ensure network is defined in `hardhat.config.ts` with `eid` |
| "Peer not set" | Run `npx hardhat lz:oapp:wire --oapp-config layerzero.config.ts` |
| "Config mismatch" | Check with `npx hardhat lz:oapp:config:get` |
| Build fails | Run `pnpm install` then `pnpm compile` from monorepo root |

## Adding a New Example

1. Copy an existing similar example
2. Update `package.json` name and dependencies
3. Update `hardhat.config.ts` networks
4. Update `layerzero.config.ts` pathways
5. Add example to root `pnpm-workspace.yaml`
6. Run `pnpm install` from monorepo root
