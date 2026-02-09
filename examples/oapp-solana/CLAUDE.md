# CLAUDE.md - OApp Solana Example

## What This Example Is

A reference implementation of **OApp on Solana** - cross-chain messaging between Solana and EVM chains.

## Key Files

| File | Purpose |
|------|---------|
| `programs/` | Solana program (Rust/Anchor) |
| `contracts/` | EVM contracts (if multi-VM) |
| `layerzero.config.ts` | Pathway configuration |
| `Anchor.toml` | Anchor configuration |

## Prerequisites

- Rust toolchain
- Anchor CLI
- Solana CLI

## Quick Start

```bash
cp .env.example .env
anchor build
# See README for full deployment steps
```

## Common Tasks

| Command | Purpose |
|---------|---------|
| `anchor build` | Build Solana program |
| `anchor test` | Run Anchor tests |

## What Makes This Example Different

- **Solana messaging**: Cross-chain messages to/from Solana
- **Anchor framework**: Uses Anchor for Solana development
- Foundation for Solana OFT

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Build fails | Check Anchor/Rust versions |
| "Account not found" | Initialize accounts first |

## Related Examples

- `oft-solana/` - Token transfers
- `oapp/` - EVM-only OApp
