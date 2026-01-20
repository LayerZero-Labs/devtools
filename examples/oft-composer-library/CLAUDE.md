# CLAUDE.md - OFT Composer Library Example

## What This Example Is

A reference implementation of an **OFT Composer** - allows composing additional logic on top of OFT transfers (e.g., swap after receive).

## Key Files

| File | Purpose |
|------|---------|
| `contracts/` | Composer contracts |
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

- **Compose pattern**: Execute additional logic after OFT transfer
- Chain actions together (transfer → swap → stake)
- Builds on OFT with lzCompose

## Use Cases

- Transfer then swap on destination
- Transfer then stake
- Multi-step cross-chain workflows

## Compose Flow

```
Source → OFT Send → Destination OFT Receive → Composer Callback
```

## Related Examples

- `oft/` - Basic OFT
- `oft-solana-composer-library/` - Solana version
