# AGENTS.md - OFT Solana Example

## Prerequisites

- Rust toolchain
- Anchor CLI
- Solana CLI

## Build Commands

```bash
# Solana program
anchor build

# EVM contracts (if applicable)
pnpm install
pnpm compile
```

## Test Commands

```bash
anchor test
pnpm test:local
```

## Deployment Commands

```bash
# Solana
anchor deploy

# EVM
npx hardhat lz:deploy
```

## Wiring Commands

```bash
npx hardhat lz:oapp:wire --oapp-config layerzero.config.ts
```

## Files Safe to Modify

- `programs/` (Solana)
- `contracts/` (EVM)
- `layerzero.config.ts`
- `Anchor.toml`
- `hardhat.config.ts`
