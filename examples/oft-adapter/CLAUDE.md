# CLAUDE.md - OFT Adapter Example

## What This Example Is

A reference implementation of an **OFT Adapter** - a pattern for making an **existing ERC20 token** cross-chain compatible without modifying the original token contract.

## Key Files

| File | Purpose |
|------|---------|
| `contracts/MyOFTAdapter.sol` | Adapter wrapping an existing ERC20 |
| `contracts/mocks/MyERC20Mock.sol` | Mock ERC20 for testing |
| `layerzero.config.ts` | Pathway configuration |
| `hardhat.config.ts` | Network definitions |
| `deploy/MyOFTAdapter.ts` | Deployment script |

## Quick Start

```bash
# 1. Setup
cp .env.example .env
# Set MNEMONIC, PRIVATE_KEY, and RPC URLs

# 2. Build
pnpm install
pnpm compile

# 3. Deploy
npx hardhat lz:deploy

# 4. Wire pathways
npx hardhat lz:oapp:wire --oapp-config layerzero.config.ts
```

## How OFT Adapter Works

```
Source Chain (has existing ERC20):
┌─────────────────┐     ┌──────────────────┐
│  Existing ERC20 │ ←── │  OFT Adapter     │
│  (token locked) │     │  (lock/unlock)   │
└─────────────────┘     └──────────────────┘
                               │
                               │ LayerZero Message
                               ▼
Destination Chain:
┌──────────────────┐
│  OFT             │
│  (mint/burn)     │
└──────────────────┘
```

**On source chain**: Adapter locks tokens when sending, unlocks when receiving
**On destination chains**: Regular OFT mints when receiving, burns when sending

## Common Tasks

| Command | Purpose |
|---------|---------|
| `pnpm compile` | Compile contracts |
| `npx hardhat lz:deploy` | Deploy adapter and OFT |
| `npx hardhat lz:oapp:wire` | Wire pathways |
| `npx hardhat lz:oapp:config:get` | Verify configuration |

## Configuration

### Deploy Script Pattern
```typescript
// Source chain: Deploy adapter pointing to existing token
const adapter = await deploy('MyOFTAdapter', {
    args: [existingTokenAddress, lzEndpoint, owner],
})

// Destination chains: Deploy regular OFT
const oft = await deploy('MyOFT', {
    args: [name, symbol, lzEndpoint, owner],
})
```

### layerzero.config.ts
```typescript
// Source chain uses OFTAdapter
const sourceAdapter: OmniPointHardhat = {
    eid: EndpointId.ETH_MAINNET,
    contractName: 'MyOFTAdapter',
}

// Destination chains use OFT
const destOft: OmniPointHardhat = {
    eid: EndpointId.ARBITRUM_MAINNET,
    contractName: 'MyOFT',
}
```

## What Makes This Example Different

- **Wraps existing tokens**: No need to redeploy or migrate tokens
- **Lock/unlock on source**: Tokens are escrowed, not burned
- **Mint/burn on destinations**: New OFT representation on other chains
- Useful for established tokens like USDC, WETH wrappers

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Insufficient allowance" | User must `approve()` adapter before sending |
| Token stuck in adapter | Check if destination has matching OFT deployed |
| "Not an OFT" on dest | Ensure dest has OFT (not adapter) deployed |

## Related Examples

- `oft/` - Native OFT (mint/burn everywhere)
- `mint-burn-oft-adapter/` - Alternative adapter pattern
- `native-oft-adapter/` - Wrap native ETH
