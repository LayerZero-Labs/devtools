# AGENTS.md - @layerzerolabs/toolbox-hardhat

## Build Commands

```bash
pnpm build --filter @layerzerolabs/toolbox-hardhat
```

## Test Commands

```bash
pnpm test:local --filter @layerzerolabs/toolbox-hardhat
```

## Lint Commands

```bash
pnpm lint:fix --filter @layerzerolabs/toolbox-hardhat
```

## Type Check

```bash
pnpm typecheck --filter @layerzerolabs/toolbox-hardhat
```

## Files Safe to Modify

- `src/`
- `test/`
- `package.json`
- `tsconfig.json`

## After Changes

```bash
pnpm changeset
```
