# CLAUDE.md - OFT Tron Example

## What This Example Is

A reference implementation of **OFT on Tron** - cross-chain token transfers with the Tron blockchain.

## Key Files

| File | Purpose |
|------|---------|
| `contracts/` | Tron-compatible contracts |
| `layerzero.config.ts` | Pathway configuration |
| Configuration files | Tron-specific setup |

## Prerequisites

- TronBox or compatible tooling
- Tron wallet setup

## Quick Start

```bash
cp .env.example .env
pnpm install
# See README for Tron-specific deployment
```

## What Makes This Example Different

- **Tron integration**: Specific to Tron blockchain
- TRC20 token standard
- Tron-specific deployment flow

## Tron Considerations

- Different address format (base58)
- TronBox for development
- Energy/bandwidth for transactions

## Related Examples

- `oft/` - Standard EVM OFT
- Multi-VM examples for other chains
