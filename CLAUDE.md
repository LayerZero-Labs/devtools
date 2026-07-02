# CLAUDE.md - DevTools SDK

This directory contains the **public SDK and tooling** for building on LayerZero.

## Quick Context

DevTools is a **monorepo** containing packages and examples for building omnichain applications with LayerZero. The main workflow is:

1. **Deploy** contracts to multiple chains using `npx hardhat lz:deploy`
2. **Wire** pathways between chains using `npx hardhat lz:oapp:wire`
3. **Send** cross-chain messages or tokens

**Key Insight**: Hardhat here is used as a **task orchestration system**, not just a Solidity compiler. Most LayerZero functionality is exposed as Hardhat tasks.

## Purpose

DevTools provides:
- Reusable packages for OApp/OFT development
- Example implementations as reference
- Deployment and configuration tooling
- Testing utilities

## Directory Structure

```
devtools/
├── packages/           # Reusable libraries
│   ├── toolbox-hardhat/    # Main entry point - import this
│   ├── devtools/           # Core types (OmniPoint, OmniGraph)
│   ├── devtools-evm-hardhat/ # Hardhat integration
│   ├── ua-devtools-evm-hardhat/ # OApp/OFT tasks
│   ├── oft-evm/            # OFT contracts & SDK
│   ├── oapp-evm/           # OApp contracts & SDK
│   ├── onft-evm/           # ONFT contracts & SDK
│   └── ...
│
├── examples/           # Reference implementations
│   ├── oapp/           # OApp example (start here for messaging)
│   ├── oft/            # OFT example (start here for tokens)
│   ├── oft-adapter/    # Wrap existing tokens
│   └── ...
│
└── tests/              # Integration tests
```

## Package Naming Convention

Packages follow `[domain-]<element>[-modifier]`:

| Package | Description |
|---------|-------------|
| `devtools` | Core types, no chain specifics |
| `devtools-evm` | EVM-specific, no framework |
| `devtools-evm-hardhat` | EVM + Hardhat integration |
| `ua-devtools-evm-hardhat` | User Application (OApp/OFT) tasks |
| `oft-evm` | OFT contracts and types |
| `toolbox-hardhat` | **Main entry point** - aggregates all Hardhat tools |

**Rule of thumb**: Most users should `import {} from '@layerzerolabs/toolbox-hardhat'`

## Common User Questions

| Question | Answer |
|----------|--------|
| "How do I start a new OFT?" | Use `npx create-lz-oapp@latest` or clone `examples/oft` |
| "Where is `layerzero.config.ts` documented?" | See `WORKFLOW.md` and `examples/oft/layerzero.config.ts` |
| "What tasks are available?" | Run `npx hardhat --help` with toolbox-hardhat imported |
| "How do I wire contracts?" | `npx hardhat lz:oapp:wire --oapp-config layerzero.config.ts` |
| "What is `eid`?" | Endpoint ID - unique identifier for each chain in LayerZero |
| "How do I check my config?" | `npx hardhat lz:oapp:config:get --oapp-config layerzero.config.ts` |
| "How do I deploy?" | `npx hardhat lz:deploy` (uses hardhat-deploy under the hood) |

## Key Files to Check

| Task | Check These Files |
|------|-------------------|
| Understanding deployment | `examples/oft/deploy/MyOFT.ts`, `packages/devtools-evm-hardhat/src/tasks/deploy.ts` |
| Understanding wiring | `packages/ua-devtools-evm-hardhat/src/tasks/oapp/wire/` |
| Understanding config | `examples/oft/layerzero.config.ts`, `packages/metadata-tools/` |
| Finding task implementations | `packages/ua-devtools-evm-hardhat/src/tasks/` |
| Understanding types | `packages/devtools/src/` (OmniPoint, OmniGraph, etc.) |

## Development Commands

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test:local     # Fast local tests
pnpm test:ci        # Full CI test suite
pnpm test:user      # E2E user flow tests

# Linting
pnpm lint:fix

# Create changeset for version bump
pnpm changeset
```

## Package Manager

- **pnpm v8.15.6** - Required version
- **Turbo** - Monorepo task runner (see `turbo.json`)

## Key Patterns

### The OmniGraph Model

LayerZero configuration uses an **OmniGraph** - a graph of contracts and connections:

```typescript
// layerzero.config.ts exports an async function
export default async function() {
    return {
        contracts: [        // OmniNode[] - contracts on each chain
            { contract: baseContract },
            { contract: arbitrumContract },
        ],
        connections: [...]  // OmniEdge[] - pathways between contracts
    }
}
```

**Why async?** The config fetches on-chain metadata (DVN addresses, default configs) at runtime.

### Creating an OFT

```typescript
// See examples/oft/ for complete implementation
// 1. Deploy with hardhat-deploy
// 2. Configure in layerzero.config.ts
// 3. Wire with: npx hardhat lz:oapp:wire --oapp-config layerzero.config.ts
```

### Creating an OApp

```typescript
// See examples/oapp/ for complete implementation
// Implement _lzReceive for incoming messages
// Use _lzSend for outgoing messages
```

## Extending SDK

1. Create new package in `packages/`
2. Follow existing package structure
3. Add to `pnpm-workspace.yaml`
4. Reference from examples if needed

## Testing Strategy

- **Unit tests**: Per-package in `packages/*/test/`
- **Integration tests**: In `tests/` directory
- **Example tests**: Each example has its own test suite

## Relationship to Other Repos

- **Implements**: Interfaces from `core/layerzero-v2/`
- **Consumed by**: `core/monorepo-internal/` for deployments
- **References**: Contract addresses from `core/address-book/`

## Warnings

1. **Run `pnpm changeset`** when modifying packages
2. **Check examples/** for reference before implementing
3. **AGENTS.md exists** - see it for CI/agent-specific guidance
4. **Version compatibility** - ensure package versions align
5. **Config is async** - `layerzero.config.ts` must export an async function
