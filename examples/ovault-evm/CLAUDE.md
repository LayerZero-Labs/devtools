# CLAUDE.md - OVault EVM Example

## What This Example Is

A reference implementation of **OVault** - an omnichain vault pattern for cross-chain asset management.

## Key Files

| File | Purpose |
|------|---------|
| `contracts/OVault.sol` | Omnichain vault contract |
| `layerzero.config.ts` | Pathway configuration |
| `hardhat.config.ts` | Network definitions |

## Quick Start

```bash
cp .env.example .env
pnpm install && pnpm compile
npx hardhat lz:deploy
npx hardhat lz:oapp:wire --oapp-config layerzero.config.ts
```

## What Makes This Example Different

- **Vault pattern**: Cross-chain asset custody
- Deposit on one chain, manage across chains
- Useful for multi-chain DeFi protocols

## Use Cases

- Cross-chain yield aggregation
- Multi-chain treasury management
- Omnichain lending protocols

## Related Examples

- `oapp/` - Basic messaging
- `oft/` - Token transfers
