# CLAUDE.md - Uniswap Read Example

## What This Example Is

A reference implementation demonstrating **OApp Read with Uniswap** - reading Uniswap pool data from other chains.

## Key Files

| File | Purpose |
|------|---------|
| `contracts/UniswapReader.sol` | Uniswap data reader |
| `layerzero.config.ts` | Read channel configuration |
| `hardhat.config.ts` | Network definitions |

## Quick Start

```bash
cp .env.example .env
pnpm install && pnpm compile
npx hardhat lz:deploy
npx hardhat lz:read:wire --oapp-config layerzero.config.ts
```

## What Makes This Example Different

- **Real-world read use case**: Practical Uniswap integration
- Demonstrates reading DEX data cross-chain
- Read channels for efficient data queries

## Use Cases

- Cross-chain price feeds
- Multi-chain DEX aggregation
- Arbitrage detection

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Pool not found" | Verify Uniswap pool address |
| Read fails | Check read channel configuration |

## Related Examples

- `oapp-read/` - Basic OApp Read
- `view-pure-read/` - View/pure function reads
