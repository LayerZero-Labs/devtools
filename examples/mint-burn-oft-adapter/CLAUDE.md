# CLAUDE.md - Mint-Burn OFT Adapter Example

## What This Example Is

A reference implementation of a **Mint-Burn OFT Adapter** - an alternative adapter pattern where the adapter has mint/burn authority over the existing token.

## Key Files

| File | Purpose |
|------|---------|
| `contracts/MyMintBurnOFTAdapter.sol` | Adapter with mint/burn |
| `layerzero.config.ts` | Pathway configuration |
| `hardhat.config.ts` | Network definitions |

## Quick Start

```bash
cp .env.example .env
pnpm install && pnpm compile
npx hardhat lz:deploy
npx hardhat lz:oapp:wire --oapp-config layerzero.config.ts
```

## How It Differs from Standard Adapter

| Feature | OFT Adapter | Mint-Burn Adapter |
|---------|-------------|-------------------|
| Source action | Lock tokens | Burn tokens |
| Receive action | Unlock tokens | Mint tokens |
| Token supply | Constant on source | Can decrease on source |
| Requirement | None | Adapter needs mint/burn rights |

## What Makes This Example Different

- **Mint/burn authority**: Adapter can mint and burn the wrapped token
- No locked tokens in adapter contract
- Requires token to support external minting/burning

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Not minter" | Grant adapter MINTER_ROLE on token |
| "Not burner" | Grant adapter BURNER_ROLE on token |

## Related Examples

- `oft-adapter/` - Standard lock/unlock adapter
- `native-oft-adapter/` - Native ETH adapter
