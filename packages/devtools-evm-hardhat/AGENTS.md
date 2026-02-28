# AGENTS.md - @layerzerolabs/devtools-evm-hardhat

## Build Commands

```bash
pnpm build --filter @layerzerolabs/devtools-evm-hardhat
```

## Test Commands

```bash
pnpm test:local --filter @layerzerolabs/devtools-evm-hardhat
```

## Lint Commands

```bash
pnpm lint:fix --filter @layerzerolabs/devtools-evm-hardhat
```

## Type Check

```bash
pnpm typecheck --filter @layerzerolabs/devtools-evm-hardhat
```

## Key Files

- `src/tasks/deploy.ts` - lz:deploy task
- `src/runtime.ts` - HRE utilities
- `src/contracts.ts` - Contract factories

## Files Safe to Modify

- `src/`
- `test/`
- `package.json`
- `tsconfig.json`

## After Changes

```bash
pnpm changeset
```
