# AGENTS.md - @layerzerolabs/ua-devtools-evm-hardhat

## Build Commands

```bash
pnpm build --filter @layerzerolabs/ua-devtools-evm-hardhat
```

## Test Commands

```bash
pnpm test:local --filter @layerzerolabs/ua-devtools-evm-hardhat
```

## Lint Commands

```bash
pnpm lint:fix --filter @layerzerolabs/ua-devtools-evm-hardhat
```

## Type Check

```bash
pnpm typecheck --filter @layerzerolabs/ua-devtools-evm-hardhat
```

## Key Task Files

- `src/tasks/oapp/wire/` - Wire task implementation
- `src/tasks/oapp/config.get.ts` - Config get task
- `src/tasks/oapp/peers.get.ts` - Peers get task
- `src/tasks/errors/` - Error handling tasks

## Files Safe to Modify

- `src/`
- `test/`
- `package.json`
- `tsconfig.json`

## After Changes

```bash
pnpm changeset
```
