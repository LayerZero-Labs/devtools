# CLAUDE.md - OFT Example

## What This Example Is

A reference implementation of an **Omnichain Fungible Token (OFT)** - a token that can be transferred across multiple blockchains while maintaining a unified total supply.

## Key Files

| File | Purpose |
|------|---------|
| `contracts/MyOFT.sol` | OFT contract inheriting from `@layerzerolabs/oft-evm` |
| `layerzero.config.ts` | Pathway configuration (which chains connect) |
| `hardhat.config.ts` | Network definitions with `eid` mapping |
| `deploy/MyOFT.ts` | Deployment script using hardhat-deploy |
| `.env.example` | Environment variables template |

## Quick Start

```bash
# 1. Setup
cp .env.example .env
# Set MNEMONIC or PRIVATE_KEY and RPC URLs

# 2. Build
pnpm install
pnpm compile

# 3. Deploy (to all networks in hardhat.config.ts)
npx hardhat lz:deploy

# 4. Wire pathways
npx hardhat lz:oapp:wire --oapp-config layerzero.config.ts

# 5. Verify configuration
npx hardhat lz:oapp:config:get --oapp-config layerzero.config.ts
```

## Common Tasks

| Command | Purpose |
|---------|---------|
| `pnpm compile` | Compile Solidity contracts |
| `npx hardhat lz:deploy` | Deploy to configured networks |
| `npx hardhat lz:oapp:wire` | Set peers, DVN config, enforced options |
| `npx hardhat lz:oapp:config:get` | Verify current on-chain configuration |
| `npx hardhat lz:oapp:peers:get` | Check peer relationships |

## Understanding the Config

### hardhat.config.ts
Defines networks with LayerZero Endpoint IDs:
```typescript
networks: {
    'base-sepolia': {
        eid: EndpointId.BASESEP_V2_TESTNET,
        url: process.env.RPC_URL_BASE_SEPOLIA,
        accounts,
    },
}
```

### layerzero.config.ts
Defines the omnichain topology:
```typescript
const pathways: TwoWayConfig[] = [
    [
        baseContract,        // Chain A
        arbitrumContract,    // Chain B
        [['LayerZero Labs'], []],  // DVNs
        [1, 1],              // Confirmations
        [EVM_ENFORCED_OPTIONS, EVM_ENFORCED_OPTIONS],
    ],
]
```

## What Makes This Example Different

- **Native OFT**: Token is created fresh on all chains (mint/burn model)
- Uses `generateConnectionsConfig()` to auto-generate bidirectional pathways
- Pre-configured for Base Sepolia and Arbitrum Sepolia testnets

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Peer not set" | Run `lz:oapp:wire` command |
| "InvalidNonce" | Check if pathway is properly wired in both directions |
| "Insufficient gas" | Increase `gas` value in `EVM_ENFORCED_OPTIONS` |
| Deploy fails | Ensure wallet has testnet ETH on both chains |

## Related Examples

- `oft-adapter/` - Wrap an existing ERC20 token
- `oft-upgradeable/` - Upgradeable OFT pattern
- `native-oft-adapter/` - Wrap native ETH
