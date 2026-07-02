# CLAUDE.md - LzApp Migration Example

## What This Example Is

A reference for **migrating from LayerZero V1 to V2** - demonstrates how to upgrade existing LzApp contracts to the new OApp standard.

## Key Files

| File | Purpose |
|------|---------|
| `contracts/` | Migration contracts |
| `layerzero.config.ts` | V2 pathway configuration |
| `hardhat.config.ts` | Network definitions |

## Quick Start

```bash
cp .env.example .env
pnpm install && pnpm compile
npx hardhat lz:deploy
npx hardhat lz:oapp:wire --oapp-config layerzero.config.ts
```

## What Makes This Example Different

- **V1 → V2 migration**: Shows upgrade path
- Maps old LzApp patterns to new OApp patterns
- Useful for teams with existing V1 deployments

## Migration Changes

| V1 (LzApp) | V2 (OApp) |
|------------|-----------|
| `_lzSend` | `_lzSend` (similar) |
| `_blockingLzReceive` | `_lzReceive` |
| `trustedRemote` | `peers` |
| `setTrustedRemote` | `setPeer` |

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Peer not found" | Use `setPeer` instead of `setTrustedRemote` |
| Config incompatible | Update to V2 config format |

## Related Examples

- `oapp/` - Standard V2 OApp
- `oft/` - Standard V2 OFT
