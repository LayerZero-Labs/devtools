# AGENTS.md - OApp Read Example

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
# Note: Uses lz:read:wire instead of lz:oapp:wire
npx hardhat lz:read:wire --oapp-config layerzero.config.ts
```

## Verification Commands

```bash
npx hardhat lz:read:config:get --oapp-config layerzero.config.ts
```

## Files Safe to Modify

- `contracts/`
- `layerzero.config.ts`
- `hardhat.config.ts`
- `deploy/`
- `tasks/`
- `test/`
