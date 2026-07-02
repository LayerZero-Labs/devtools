# AGENTS.md - @layerzerolabs/oapp-evm

## Build Commands

```bash
pnpm build --filter @layerzerolabs/oapp-evm
```

## Test Commands

```bash
pnpm test:local --filter @layerzerolabs/oapp-evm
```

## Lint Commands

```bash
pnpm lint:fix --filter @layerzerolabs/oapp-evm
```

## Compile Contracts

```bash
forge build
# or via hardhat in examples
```

## Key Contract Files

- `contracts/oapp/OApp.sol` - Base OApp
- `contracts/oapp/OAppSender.sol` - Send-only
- `contracts/oapp/OAppReceiver.sol` - Receive-only
- `contracts/oapp/OAppCore.sol` - Core logic

## Files Safe to Modify

- `contracts/`
- `src/`
- `test/`
- `package.json`

## After Changes

```bash
pnpm changeset
```
