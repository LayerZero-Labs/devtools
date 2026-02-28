# CLAUDE.md - Omni-Call Example

## What This Example Is

A reference implementation of **Omni-Call** - cross-chain function calls where you can invoke functions on contracts across chains.

## Key Files

| File | Purpose |
|------|---------|
| `contracts/OmniCall.sol` | Cross-chain call contract |
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

- **Function calls**: Execute arbitrary function calls cross-chain
- More flexible than OFT (not just token transfers)
- General-purpose cross-chain execution

## Use Cases

- Cross-chain governance
- Multi-chain protocol coordination
- Arbitrary message execution

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Call fails | Check target function exists on destination |
| "Invalid selector" | Verify function signature matches |

## Related Examples

- `oapp/` - Basic messaging
- `oapp-read/` - Read-only operations
