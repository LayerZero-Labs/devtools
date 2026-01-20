# CLAUDE.md - OFT Adapter Aptos Move Example

## What This Example Is

A reference implementation of an **OFT Adapter on Aptos** - wraps an existing Aptos token for cross-chain transfers.

## Key Files

| File | Purpose |
|------|---------|
| `sources/` | Move adapter modules |
| `Move.toml` | Move package configuration |
| `contracts/` | EVM contracts (for multi-VM) |
| `layerzero.config.ts` | Pathway configuration |

## Prerequisites

- Aptos CLI
- Move compiler

## Quick Start

```bash
cp .env.example .env
aptos move compile
pnpm compile  # For EVM side
```

## What Makes This Example Different

- **Aptos adapter pattern**: Lock/unlock on Aptos
- Bridges existing Aptos tokens to EVM

## Related Examples

- `oft-aptos-move/` - Native OFT on Aptos
- `oft-adapter/` - EVM adapter pattern
