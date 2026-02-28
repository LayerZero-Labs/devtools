# CLAUDE.md - @layerzerolabs/oft-evm

## Package Purpose

Provides the **OFT (Omnichain Fungible Token) Solidity contracts** for EVM chains - the standard for cross-chain token transfers in LayerZero.

## Key Exports

### Contracts (Solidity)

| Contract | Purpose |
|----------|---------|
| `OFT.sol` | Base OFT - mint/burn token |
| `OFTAdapter.sol` | Adapter for existing ERC20 tokens |
| `OFTCore.sol` | Core logic (inherited by OFT) |

### TypeScript

```typescript
import {
    // Types
    OFTFactory,
    OFTOmniGraphHardhat,
} from '@layerzerolabs/oft-evm'
```

## When to Use

- Creating a new cross-chain token
- Wrapping an existing ERC20 for cross-chain transfers
- Building custom OFT variants

## Contract Inheritance

```
            OApp (messaging base)
              │
              ▼
           OFTCore
        ┌────┴────┐
        │         │
       OFT    OFTAdapter
  (mint/burn)  (lock/unlock)
```

## OFT vs OFTAdapter

| Feature | OFT | OFTAdapter |
|---------|-----|------------|
| Token creation | New token | Wraps existing |
| Source chain behavior | Burn | Lock |
| Destination chain behavior | Mint | Mint (new OFT) |
| Use case | New tokens | Existing tokens |

## Usage in Solidity

### Creating an OFT

```solidity
import { OFT } from "@layerzerolabs/oft-evm/contracts/OFT.sol";

contract MyOFT is OFT {
    constructor(
        string memory _name,
        string memory _symbol,
        address _lzEndpoint,
        address _delegate
    ) OFT(_name, _symbol, _lzEndpoint, _delegate) {}
}
```

### Creating an OFT Adapter

```solidity
import { OFTAdapter } from "@layerzerolabs/oft-evm/contracts/OFTAdapter.sol";

contract MyOFTAdapter is OFTAdapter {
    constructor(
        address _token,           // Existing ERC20
        address _lzEndpoint,
        address _delegate
    ) OFTAdapter(_token, _lzEndpoint, _delegate) {}
}
```

## Cross-Chain Transfer Flow

```
1. User calls send() on source OFT
2. OFT burns tokens (or locks if adapter)
3. LayerZero message sent via _lzSend()
4. DVNs verify the message
5. Executor delivers to destination
6. Destination OFT receives via _lzReceive()
7. Destination OFT mints tokens (or unlocks if source adapter)
```

## Key Functions

| Function | Purpose |
|----------|---------|
| `send()` | Initiate cross-chain transfer |
| `quoteSend()` | Get fee quote for transfer |
| `_debit()` | Internal - burn/lock tokens |
| `_credit()` | Internal - mint/unlock tokens |

## Dependencies

- `@layerzerolabs/oapp-evm` - OApp base contracts
- `@openzeppelin/contracts` - ERC20, Ownable

## Testing

```bash
pnpm test:local --filter @layerzerolabs/oft-evm
```

## Related Packages

- `oft-evm-upgradeable` - Upgradeable OFT variants
- `oft-alt-evm` - Alternative OFT implementation
- `oapp-evm` - Base messaging contracts
