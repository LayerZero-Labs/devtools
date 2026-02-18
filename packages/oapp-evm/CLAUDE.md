# CLAUDE.md - @layerzerolabs/oapp-evm

## Package Purpose

Provides the **OApp (Omnichain Application) Solidity contracts** for EVM chains - the foundational pattern for cross-chain messaging in LayerZero.

## Key Exports

### Contracts (Solidity)

| Contract | Purpose |
|----------|---------|
| `OApp.sol` | Base OApp - full send/receive |
| `OAppSender.sol` | Send-only OApp |
| `OAppReceiver.sol` | Receive-only OApp |
| `OAppCore.sol` | Core logic (endpoint, delegate, peers) |

### TypeScript

```typescript
import {
    // Types for configuration
    OAppOmniGraphHardhat,
    OAppFactory,
} from '@layerzerolabs/oapp-evm'
```

## When to Use

- Building custom cross-chain applications
- Creating messaging protocols
- Understanding how OFT/ONFT work internally

## Contract Inheritance

```
          OAppCore (endpoint, peers)
         ┌────┴────┐
         │         │
   OAppSender  OAppReceiver
         │         │
         └────┬────┘
              │
            OApp
```

## Usage in Solidity

### Basic OApp

```solidity
import { OApp } from "@layerzerolabs/oapp-evm/contracts/oapp/OApp.sol";

contract MyOApp is OApp {
    constructor(
        address _endpoint,
        address _delegate
    ) OApp(_endpoint, _delegate) {}

    // Implement _lzReceive to handle incoming messages
    function _lzReceive(
        Origin calldata _origin,
        bytes32 _guid,
        bytes calldata _payload,
        address _executor,
        bytes calldata _extraData
    ) internal override {
        // Handle message
    }
}
```

### Sending Messages

```solidity
function sendMessage(uint32 _dstEid, bytes memory _payload) external payable {
    _lzSend(
        _dstEid,
        _payload,
        _options,
        MessagingFee(msg.value, 0),
        payable(msg.sender)
    );
}
```

### Quoting Fees

```solidity
function quote(
    uint32 _dstEid,
    bytes memory _payload,
    bytes memory _options
) external view returns (MessagingFee memory) {
    return _quote(_dstEid, _payload, _options, false);
}
```

## Message Lifecycle

```
Source Chain:
1. User calls your send function
2. _lzSend() submits to Endpoint
3. Endpoint emits PacketSent event

LayerZero Network:
4. DVNs verify the message
5. Executor picks up for delivery

Destination Chain:
6. Executor calls lzReceive on Endpoint
7. Endpoint calls your _lzReceive()
```

## Key Concepts

### Peer Setup
```solidity
// Each OApp must know its counterpart on other chains
setPeer(dstEid, peer)  // Sets peers[dstEid] = peer
```

### Endpoint Delegates
```solidity
// Delegate can configure the OApp via Endpoint
setDelegate(delegate)
```

## Key Functions

| Function | Purpose |
|----------|---------|
| `_lzSend()` | Send cross-chain message |
| `_lzReceive()` | Handle incoming message (override this) |
| `_quote()` | Get fee quote |
| `setPeer()` | Set peer on destination chain |
| `setDelegate()` | Set delegate address |

## Dependencies

- `@layerzerolabs/lz-evm-protocol-v2` - Endpoint interfaces
- `@openzeppelin/contracts` - Ownable

## Testing

```bash
pnpm test:local --filter @layerzerolabs/oapp-evm
```

## Related Packages

- `oft-evm` - Token transfers (builds on OApp)
- `onft-evm` - NFT transfers (builds on OApp)
- `oapp-evm-upgradeable` - Upgradeable variants
