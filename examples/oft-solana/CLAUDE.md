# CLAUDE.md - OFT Solana Example

## What This Example Is

A reference implementation of **OFT on Solana** - cross-chain token transfers between Solana and EVM chains.

## Key Files

| File | Purpose |
|------|---------|
| `programs/` | Solana program (Rust/Anchor) |
| `contracts/` | EVM contracts (if multi-VM) |
| `layerzero.config.ts` | Pathway configuration |
| `Anchor.toml` | Anchor configuration |

## Prerequisites

- Rust toolchain
- Anchor CLI (`anchor --version`)
- Solana CLI (`solana --version`)

## Quick Start

```bash
# Setup
cp .env.example .env

# Build Solana program
anchor build

# Build EVM (if applicable)
pnpm compile

# Deploy
# (Solana deployment is more complex - see README)
```

## Common Tasks

| Command | Purpose |
|---------|---------|
| `anchor build` | Build Solana program |
| `anchor test` | Run Anchor tests |
| `pnpm compile` | Compile EVM contracts |

## What Makes This Example Different

- **Multi-VM**: Bridges Solana and EVM ecosystems
- **Rust/Anchor**: Solana programs in Rust
- Different deployment flow than EVM-only examples
- Token mint authority considerations

## Solana-Specific Concepts

| Concept | Description |
|---------|-------------|
| Program | Solana's version of a smart contract |
| PDA | Program Derived Address |
| Token Mint | SPL token definition |
| ATA | Associated Token Account |

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Program not found" | Deploy program first with `anchor deploy` |
| "Invalid mint authority" | Ensure OFT program has mint authority |
| Anchor build fails | Check Rust toolchain version |

## Related Examples

- `oapp-solana/` - OApp messaging for Solana
- `oft/` - EVM-only OFT
