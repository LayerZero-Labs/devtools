# CLAUDE.md - OApp Read Example

## What This Example Is

A reference implementation of **OApp Read** - a pattern for reading data from other chains without sending a full cross-chain message.

## Key Files

| File | Purpose |
|------|---------|
| `contracts/MyOAppRead.sol` | OApp Read contract |
| `layerzero.config.ts` | Read channel configuration |
| `hardhat.config.ts` | Network definitions |

## Quick Start

```bash
cp .env.example .env
pnpm install && pnpm compile
npx hardhat lz:deploy
npx hardhat lz:read:wire --oapp-config layerzero.config.ts
```

## Common Tasks

| Command | Purpose |
|---------|---------|
| `pnpm compile` | Compile contracts |
| `npx hardhat lz:deploy` | Deploy OApp Read |
| `npx hardhat lz:read:wire` | Wire read channels |
| `npx hardhat lz:read:config:get` | Check read configuration |

## What Makes This Example Different

- **Read-only operations**: Query data from other chains
- Uses **read channels** instead of full messaging pathways
- Different wire task: `lz:read:wire` instead of `lz:oapp:wire`

## Read vs Send

| Feature | OApp (Send) | OApp Read |
|---------|-------------|-----------|
| Purpose | Execute actions | Query data |
| Gas cost | Higher | Lower |
| Finality | Requires DVN verification | Lighter verification |
| Wire task | `lz:oapp:wire` | `lz:read:wire` |

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Channel not configured" | Run `lz:read:wire` |
| Read fails | Check read channel configuration |

## Related Examples

- `oapp/` - Full OApp messaging
- `uniswap-read/` - Real-world read example
- `view-pure-read/` - View/pure function reads
