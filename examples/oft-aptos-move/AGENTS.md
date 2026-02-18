# AGENTS.md - OFT Aptos Move Example

## Prerequisites

- Aptos CLI
- Move compiler

## Build Commands

```bash
# Move
aptos move compile

# EVM contracts (if applicable)
pnpm install
pnpm compile
```

## Test Commands

```bash
aptos move test
pnpm test:local
```

## Deployment Commands

```bash
# Move
aptos move publish

# EVM
npx hardhat lz:deploy
```

## Wiring Commands

```bash
npx hardhat lz:oapp:wire --oapp-config layerzero.config.ts
```

## Files Safe to Modify

- `sources/` (Move)
- `contracts/` (EVM)
- `layerzero.config.ts`
- `Move.toml`
- `hardhat.config.ts`
