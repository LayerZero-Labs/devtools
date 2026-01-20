# CLAUDE.md - OApp Example

## What This Example Is

A reference implementation of an **Omnichain Application (OApp)** - the base pattern for cross-chain messaging in LayerZero. OApp is the foundation that OFT, ONFT, and other standards build upon.

## Key Files

| File | Purpose |
|------|---------|
| `contracts/MyOApp.sol` | OApp contract with `_lzSend` and `_lzReceive` |
| `contracts/mocks/MyOAppMock.sol` | Mock for testing |
| `layerzero.config.ts` | Pathway configuration |
| `hardhat.config.ts` | Network definitions with `eid` mapping |
| `deploy/MyOApp.ts` | Deployment script |

## Quick Start

```bash
# 1. Setup
cp .env.example .env
# Set MNEMONIC or PRIVATE_KEY and RPC URLs

# 2. Build
pnpm install
pnpm compile

# 3. Deploy
npx hardhat lz:deploy

# 4. Wire pathways
npx hardhat lz:oapp:wire --oapp-config layerzero.config.ts

# 5. Verify configuration
npx hardhat lz:oapp:config:get --oapp-config layerzero.config.ts
```

## Common Tasks

| Command | Purpose |
|---------|---------|
| `pnpm compile` | Compile Solidity contracts |
| `npx hardhat lz:deploy` | Deploy to configured networks |
| `npx hardhat lz:oapp:wire` | Set peers and configuration |
| `npx hardhat lz:oapp:config:get` | Check current configuration |
| `pnpm test` | Run local tests |

## Understanding OApp

### Sending Messages
```solidity
// In your contract
function sendMessage(uint32 _dstEid, string memory _message) external payable {
    bytes memory payload = abi.encode(_message);
    _lzSend(_dstEid, payload, _options, MessagingFee(msg.value, 0), payable(msg.sender));
}
```

### Receiving Messages
```solidity
// Override _lzReceive
function _lzReceive(
    Origin calldata _origin,
    bytes32 _guid,
    bytes calldata _message,
    address _executor,
    bytes calldata _extraData
) internal override {
    string memory message = abi.decode(_message, (string));
    // Handle the message
}
```

## What Makes This Example Different

- **Raw messaging pattern**: Direct `_lzSend`/`_lzReceive` implementation
- Foundation for understanding how OFT/ONFT work internally
- Demonstrates custom message encoding/decoding

## Configuration

### hardhat.config.ts
```typescript
networks: {
    'base-sepolia': {
        eid: EndpointId.BASESEP_V2_TESTNET,
        url: process.env.RPC_URL_BASE_SEPOLIA,
        accounts,
    },
}
```

### layerzero.config.ts
```typescript
const pathways: TwoWayConfig[] = [
    [
        baseContract,
        arbitrumContract,
        [['LayerZero Labs'], []],  // Required DVNs, optional DVNs
        [1, 1],                     // Confirmations per direction
        [EVM_ENFORCED_OPTIONS, EVM_ENFORCED_OPTIONS],
    ],
]
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "LZ_InvalidPath" | Peer not set - run `lz:oapp:wire` |
| Message not received | Check DVN verification status on LayerZero Scan |
| "LZ_InsufficientFee" | Quote the fee with `quote()` before sending |

## Related Examples

- `oapp-read/` - Read data from other chains
- `omni-call/` - Cross-chain function calls
- `oft/` - Token transfers (builds on OApp)
