# CLAUDE.md - OFT Alt Example

## What This Example Is

A reference implementation of an **Alternative OFT** - an OFT variant using the alternative LayerZero transport mechanism.

## Key Files

| File | Purpose |
|------|---------|
| `contracts/MyOFTAlt.sol` | Alternative OFT contract |
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

- **Alternative transport**: Uses different transport mechanism
- May have different gas characteristics
- See `oapp-alt-evm` package for details

## Related Examples

- `oft/` - Standard OFT
- `oft-upgradeable/` - Upgradeable pattern
