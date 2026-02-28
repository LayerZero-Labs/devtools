# AGENTS.md - @layerzerolabs/oft-evm

## Build Commands

```bash
pnpm build --filter @layerzerolabs/oft-evm
```

## Test Commands

```bash
pnpm test:local --filter @layerzerolabs/oft-evm
```

## Lint Commands

```bash
pnpm lint:fix --filter @layerzerolabs/oft-evm
```

## Compile Contracts

```bash
forge build
# or via hardhat in examples
```

## Key Contract Files

- `contracts/OFT.sol` - Base OFT
- `contracts/OFTAdapter.sol` - ERC20 adapter
- `contracts/OFTCore.sol` - Core logic

## Files Safe to Modify

- `contracts/`
- `src/`
- `test/`
- `package.json`

## After Changes

```bash
pnpm changeset
```
