# CLAUDE.md - View Pure Read Example

## What This Example Is

A reference implementation of **reading view/pure functions** from other chains - demonstrates calling read-only functions cross-chain.

## Key Files

| File | Purpose |
|------|---------|
| `contracts/ViewPureReader.sol` | View function reader |
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

- **View/pure functions**: Read-only contract calls
- No state changes on destination
- Efficient data retrieval

## Use Cases

- Reading token balances across chains
- Querying contract state
- Cross-chain data aggregation

## Related Examples

- `oapp-read/` - Basic OApp Read
- `uniswap-read/` - Real-world read example
