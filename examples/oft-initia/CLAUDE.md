# CLAUDE.md - OFT Initia Example

## What This Example Is

A reference implementation of an **OFT on Initia** - native cross-chain token on the Initia blockchain.

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

- **Initia-specific**: Configured for Initia blockchain
- Native mint/burn OFT

## Related Examples

- `oft-adapter-initia/` - Adapter pattern
- `oft/` - Standard EVM OFT
