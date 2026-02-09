# CLAUDE.md - OFT Adapter Initia Example

## What This Example Is

A reference implementation of an **OFT Adapter for Initia** - enables cross-chain token transfers with the Initia blockchain.

## Key Files

| File | Purpose |
|------|---------|
| `contracts/` | Smart contracts |
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

- **Initia integration**: Specific to Initia blockchain
- Adapter pattern for existing Initia tokens

## Related Examples

- `oft-initia/` - Native OFT on Initia
- `oft-adapter/` - Standard EVM adapter
