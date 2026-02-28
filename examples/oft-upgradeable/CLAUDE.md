# CLAUDE.md - OFT Upgradeable Example

## What This Example Is

A reference implementation of an **Upgradeable OFT** using the proxy pattern - allows upgrading contract logic without changing the contract address.

## Key Files

| File | Purpose |
|------|---------|
| `contracts/MyOFT.sol` | Upgradeable OFT implementation |
| `layerzero.config.ts` | Pathway configuration |
| `deploy/MyOFT.ts` | Proxy deployment script |

## Quick Start

```bash
cp .env.example .env
pnpm install && pnpm compile
npx hardhat lz:deploy
npx hardhat lz:oapp:wire --oapp-config layerzero.config.ts
```

## Common Tasks

| Command | Purpose |
|---------|---------|
| `pnpm compile` | Compile contracts |
| `npx hardhat lz:deploy` | Deploy proxy + implementation |
| `npx hardhat lz:oapp:wire` | Wire pathways |

## What Makes This Example Different

- **Proxy pattern**: Uses OpenZeppelin upgradeable contracts
- `initialize()` instead of constructor
- Can upgrade implementation without redeploying

## Upgrade Pattern

```solidity
// Uses UUPS proxy pattern
import { OFTUpgradeable } from "@layerzerolabs/oft-evm-upgradeable";

contract MyOFT is OFTUpgradeable {
    function initialize(...) external initializer {
        __OFT_init(_name, _symbol, _lzEndpoint, _delegate);
    }
}
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Already initialized" | Proxy already set up |
| Upgrade fails | Ensure upgrade is storage-compatible |

## Related Examples

- `oft/` - Non-upgradeable OFT
- `oapp-evm-upgradeable` package
