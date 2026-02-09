# CLAUDE.md - OFT Hyperliquid Example

## What This Example Is

A reference implementation of an **OFT on Hyperliquid** - cross-chain token transfers with the Hyperliquid L1.

## Key Files

| File | Purpose |
|------|---------|
| `contracts/` | OFT contracts |
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

- **Hyperliquid integration**: Specific to Hyperliquid L1
- Configured for Hyperliquid's environment

## Related Examples

- `oft/` - Standard EVM OFT
- `oft-adapter/` - Adapter pattern
