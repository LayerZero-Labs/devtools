## Build and deploy

### Builds the contracts
```bash
pnpm run lz:sdk:move:build --lz-config movement.layerzero.config.ts --named-addresses oft=$ACCOUNT_ADDRESS,oft_admin=$ACCOUNT_ADDRESS --move-deploy-script deploy/MyMovementOFTFA.ts
```

### Checks for build, builds if not, then deploys the contracts, sets the delegate and initializes

```bash
pnpm run lz:sdk:move:deploy --lz-config movement.layerzero.config.ts --named-addresses oft=$ACCOUNT_ADDRESS,oft_admin=$ACCOUNT_ADDRESS --move-deploy-script deploy/MyMovementOFTFA.ts
```

## Init - Not OFT Agnostic
```bash
pnpm run lz:sdk:move:init --lz-config movement.layerzero.config.ts --move-deploy-script deploy/MyMovementOFTFA.ts
```

## Wire 
```bash
pnpm run lz:sdk:evm:wire --lz-config movement.layerzero.config.ts
```

```bash
pnpm run lz:sdk:move:wire --lz-config movement.layerzero.config.ts
```
