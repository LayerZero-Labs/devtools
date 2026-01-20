# CLAUDE.md - OFT Solana Composer Library Example

## What This Example Is

A reference implementation of **OFT Composer for Solana** - compose additional logic after OFT transfers on Solana.

## Key Files

| File | Purpose |
|------|---------|
| `programs/` | Solana composer programs |
| `Anchor.toml` | Anchor configuration |
| `layerzero.config.ts` | Pathway configuration |

## Prerequisites

- Rust toolchain
- Anchor CLI
- Solana CLI

## Quick Start

```bash
cp .env.example .env
anchor build
```

## What Makes This Example Different

- **Solana compose pattern**: Post-transfer hooks on Solana
- Anchor-based implementation
- Bridges EVM compose patterns to Solana

## Related Examples

- `oft-solana/` - Basic Solana OFT
- `oft-composer-library/` - EVM version
