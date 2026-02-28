# CLAUDE.md - OFT Aptos Move Example

## What This Example Is

A reference implementation of **OFT on Aptos** using Move language - cross-chain token transfers between Aptos and EVM chains.

## Key Files

| File | Purpose |
|------|---------|
| `sources/` | Move source files |
| `Move.toml` | Move package configuration |
| `contracts/` | EVM contracts (for multi-VM) |
| `layerzero.config.ts` | Pathway configuration |

## Prerequisites

- Aptos CLI (`aptos --version`)
- Move compiler

## Quick Start

```bash
cp .env.example .env

# Build Move
aptos move compile

# Build EVM (if applicable)
pnpm compile
```

## Common Tasks

| Command | Purpose |
|---------|---------|
| `aptos move compile` | Compile Move modules |
| `aptos move test` | Run Move tests |
| `pnpm compile` | Compile EVM contracts |

## What Makes This Example Different

- **Multi-VM**: Bridges Aptos and EVM ecosystems
- **Move language**: Aptos-native smart contracts
- Separate wire commands for Move vs EVM

## Move-Specific Concepts

| Concept | Description |
|---------|-------------|
| Module | Move's version of a contract |
| Resource | Move's storage type |
| Capability | Access control pattern |

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Compile fails | Check Move.toml dependencies |
| "Module not found" | Publish module first |

## Related Examples

- `oapp-aptos-move/` - OApp messaging for Aptos
- `oft-adapter-aptos-move/` - Adapter pattern for Aptos
- `oft/` - EVM-only OFT
