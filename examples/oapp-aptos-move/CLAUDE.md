# CLAUDE.md - OApp Aptos Move Example

## What This Example Is

A reference implementation of **OApp on Aptos** using Move - cross-chain messaging between Aptos and EVM chains.

## Key Files

| File | Purpose |
|------|---------|
| `sources/` | Move source files |
| `Move.toml` | Move package configuration |
| `layerzero.config.ts` | Pathway configuration |

## Prerequisites

- Aptos CLI
- Move compiler

## Quick Start

```bash
cp .env.example .env
aptos move compile
```

## Common Tasks

| Command | Purpose |
|---------|---------|
| `aptos move compile` | Compile Move modules |
| `aptos move test` | Run Move tests |

## What Makes This Example Different

- **Aptos messaging**: Cross-chain messages to/from Aptos
- **Move language**: Uses Move for smart contracts
- Foundation for Aptos OFT

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Compile fails | Check Aptos CLI version |
| "Capability missing" | Check resource permissions |

## Related Examples

- `oft-aptos-move/` - Token transfers
- `oapp/` - EVM-only OApp
