# CLAUDE.md - @layerzerolabs/ua-devtools-evm-hardhat

## Package Purpose

Provides **Hardhat tasks for OApp and OFT operations** - wiring pathways, checking configuration, and managing cross-chain application state.

## Key Exports

This package primarily provides Hardhat tasks (auto-registered when imported).

## Tasks Provided

### Core Wiring Tasks

| Task | Description |
|------|-------------|
| `lz:oapp:wire` | Main wiring task - sets peers, DVN config, enforced options |
| `lz:oapp:config:get` | Get current on-chain configuration |
| `lz:oapp:config:get:default` | Get LayerZero default configuration |
| `lz:oapp:config:get:executor` | Get executor configuration |
| `lz:oapp:peers:get` | Get peer relationships |
| `lz:oapp:enforced:opts:get` | Get enforced options |
| `lz:oapp:config:init` | Initialize a new layerzero.config.ts |

### OApp Read Tasks

| Task | Description |
|------|-------------|
| `lz:read:wire` | Wire OApp Read configurations |
| `lz:read:config:get` | Get OApp Read configuration |
| `lz:read:config:get:channel` | Get channel configuration |

### Utility Tasks

| Task | Description |
|------|-------------|
| `lz:errors:decode` | Decode LayerZero error messages |
| `lz:errors:list` | List known LayerZero errors |
| `lz:ownable:transfer:ownership` | Transfer contract ownership |

## When to Use

- Configuring OApp/OFT deployments
- Checking current on-chain state
- Debugging configuration mismatches
- Transferring ownership

## Task Implementation Location

```
src/tasks/
├── oapp/
│   ├── wire/           # lz:oapp:wire implementation
│   ├── config.get.ts   # lz:oapp:config:get
│   ├── peers.get.ts    # lz:oapp:peers:get
│   └── ...
├── errors/
│   ├── decode.ts       # lz:errors:decode
│   └── list.ts         # lz:errors:list
└── ownable/
    └── transfer.ownership.ts
```

## Common Usage

```bash
# Wire all pathways from config
npx hardhat lz:oapp:wire --oapp-config layerzero.config.ts

# Check current configuration
npx hardhat lz:oapp:config:get --oapp-config layerzero.config.ts

# Check peer setup
npx hardhat lz:oapp:peers:get --oapp-config layerzero.config.ts

# Decode an error
npx hardhat lz:errors:decode --error 0x12345678
```

## Dependencies

- `@layerzerolabs/ua-devtools-evm` - Core UA (User Application) logic
- `@layerzerolabs/devtools-evm-hardhat` - Hardhat integration utilities
- `@layerzerolabs/devtools` - Core types

## Testing

```bash
pnpm test:local --filter @layerzerolabs/ua-devtools-evm-hardhat
```
