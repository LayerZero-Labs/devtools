# CLAUDE.md - ONFT721 zkSync Example

## What This Example Is

A reference implementation of **ONFT721 on zkSync** - cross-chain NFT transfers optimized for zkSync Era.

## Key Files

| File | Purpose |
|------|---------|
| `contracts/MyONFT721.sol` | ONFT721 for zkSync |
| `layerzero.config.ts` | Pathway configuration |
| `hardhat.config.ts` | zkSync network config |

## Quick Start

```bash
cp .env.example .env
pnpm install && pnpm compile
npx hardhat lz:deploy
npx hardhat lz:oapp:wire --oapp-config layerzero.config.ts
```

## What Makes This Example Different

- **zkSync-specific**: Uses zkSync compiler settings
- zkSync Era deployment process
- Different verification flow

## zkSync Considerations

- Uses `@matterlabs/hardhat-zksync-solc`
- Different bytecode format
- Verification through zkSync explorer

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Compile fails | Ensure zkSync plugin configured |
| Deploy fails | Check zkSync-specific wallet setup |

## Related Examples

- `onft721/` - Standard ONFT721
- `oft/` - Fungible token version
