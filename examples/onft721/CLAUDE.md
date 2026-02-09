# CLAUDE.md - ONFT721 Example

## What This Example Is

A reference implementation of an **Omnichain Non-Fungible Token (ONFT721)** - an NFT standard that can be transferred across multiple blockchains.

## Key Files

| File | Purpose |
|------|---------|
| `contracts/MyONFT721.sol` | ONFT721 contract |
| `layerzero.config.ts` | Pathway configuration |
| `hardhat.config.ts` | Network definitions |
| `deploy/MyONFT721.ts` | Deployment script |

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
| `npx hardhat lz:deploy` | Deploy ONFT721 |
| `npx hardhat lz:oapp:wire` | Wire pathways |

## What Makes This Example Different

- **NFT transfers**: Move ERC721 tokens across chains
- Token ID preserved across chains
- Burn on source, mint on destination

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Token doesn't exist" | Ensure token was minted on source chain |
| "Not owner" | Only token owner can initiate transfer |

## Related Examples

- `onft721-zksync/` - zkSync-specific ONFT721
- `oft/` - Fungible token version
