# CLAUDE.md - Native OFT Adapter Example

## What This Example Is

A reference implementation of a **Native OFT Adapter** - wraps native ETH (or chain's native token) for cross-chain transfers.

## Key Files

| File | Purpose |
|------|---------|
| `contracts/MyNativeOFTAdapter.sol` | Native token adapter |
| `layerzero.config.ts` | Pathway configuration |
| `hardhat.config.ts` | Network definitions |

## Quick Start

```bash
cp .env.example .env
pnpm install && pnpm compile
npx hardhat lz:deploy
npx hardhat lz:oapp:wire --oapp-config layerzero.config.ts
```

## How It Works

```
Source Chain (ETH):
User sends ETH → Adapter wraps to WETH → Locks WETH

Destination Chain:
Receives message → Mints wrapped ETH representation
```

## What Makes This Example Different

- **Native token support**: Wraps ETH directly (no ERC20 needed)
- Handles WETH wrapping/unwrapping automatically
- Useful for native gas token bridges

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Insufficient ETH" | Send ETH with the transaction |
| "WETH address wrong" | Configure correct WETH for chain |

## Related Examples

- `oft-adapter/` - ERC20 adapter
- `mint-burn-oft-adapter/` - Mint/burn pattern
