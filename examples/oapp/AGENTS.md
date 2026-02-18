# AGENTS.md - OApp Example

## Build Commands

```bash
pnpm install
pnpm compile
```

## Test Commands

```bash
pnpm test
pnpm test:local
```

## Deployment Commands

```bash
npx hardhat lz:deploy
```

## Wiring Commands

```bash
npx hardhat lz:oapp:wire --oapp-config layerzero.config.ts
```

## Verification Commands

```bash
npx hardhat lz:oapp:config:get --oapp-config layerzero.config.ts
npx hardhat lz:oapp:peers:get --oapp-config layerzero.config.ts
```

## Files Safe to Modify

- `contracts/`
- `layerzero.config.ts`
- `hardhat.config.ts`
- `deploy/`
- `tasks/`
- `test/`

## Files to Avoid Modifying

- `node_modules/`
- `cache/`
- `artifacts/`
- `deployments/` (generated)
