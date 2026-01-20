# CLAUDE.md - OFT EVM-Solana-Move Example

## What This Example Is

A reference implementation of **multi-VM OFT** - demonstrates token transfers across EVM, Solana, and Move (Aptos) chains simultaneously.

## Key Files

| File | Purpose |
|------|---------|
| `contracts/` | EVM contracts (Solidity) |
| `programs/` | Solana programs (Rust/Anchor) |
| `sources/` | Move modules |
| `layerzero.config.ts` | Multi-VM pathway configuration |

## Prerequisites

- Node.js + pnpm (EVM)
- Rust + Anchor (Solana)
- Aptos CLI (Move)

## Quick Start

```bash
cp .env.example .env

# Build all platforms
pnpm compile           # EVM
anchor build          # Solana
aptos move compile    # Move
```

## What Makes This Example Different

- **Three VMs**: EVM + Solana + Move in one example
- Complex multi-VM pathway configuration
- Shows unified token across heterogeneous chains

## Related Examples

- `oft/` - EVM-only OFT
- `oft-solana/` - Solana OFT
- `oft-aptos-move/` - Aptos OFT
