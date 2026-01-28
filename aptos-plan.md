# Plan: Aptos Devtools Packages for OmniGraph Wire Support

## Background: The Problem

The original Aptos integration was implemented incorrectly:

1. **Separate config file**: Uses `move.layerzero.config.ts` instead of standard `layerzero.config.ts`
2. **No devtools packages**: No `devtools-aptos`, `protocol-devtools-aptos`, or `ua-devtools-aptos` packages exist
3. **Custom architecture**: Does not follow the OmniGraph pattern used by EVM, Solana, Sui, and Starknet
4. **No `lz:oapp:wire` support**: Cannot wire Aptos OFTs using the standard wire command

This created confusion and inconsistency in the LayerZero ecosystem. **We need to properly implement Aptos following the same pattern as Sui and Starknet.**

---

## ⚠️ CRITICAL CONSTRAINTS

**This is NOT negotiable:**

1. **OFTs MUST be connected using `lz:oapp:wire`** - This is the LayerZero devtools convention. No alternative approaches, scripts, or workarounds are acceptable.

2. **The devtools packages MUST work** - If `lz:oapp:wire` fails, the solution is to FIX THE DEVTOOLS PACKAGES, not to find a different way to wire OFTs.

3. **No workarounds** - Do not:
   - Write custom scripts to wire OFTs
   - Use direct contract calls bypassing devtools
   - Suggest manual transaction construction
   - Propose any solution that doesn't use `lz:oapp:wire`

4. **Use standard `layerzero.config.ts`** - Aptos contracts MUST be configured in the same file as EVM/Sui/Starknet, not in a separate `move.layerzero.config.ts`

---

## Goal

**Make `lz:oapp:wire` work for Aptos OFTs.**

The command that MUST succeed:
```bash
pnpm -C examples/oft-main exec hardhat lz:oapp:wire --oapp-config layerzero.config.ts
```

This command must successfully:
1. Read Aptos OFT configurations from `layerzero.config.ts`
2. Use the devtools-aptos package to create signers
3. Use the ua-devtools-aptos package to configure OFTs
4. Wire all pathways (Aptos↔EVM, Aptos↔Sui, Aptos↔Starknet)

---

## Success Criteria

| Criterion | Verification |
|-----------|--------------|
| `lz:oapp:wire` completes without errors | Exit code 0, no exceptions |
| Aptos OFT is wired to EVM OFTs | Peers are set bidirectionally |
| Aptos OFT is wired to Sui OFT | Peers are set bidirectionally |
| Aptos OFT is wired to Starknet OFT | Peers are set bidirectionally |
| Cross-chain send works | LayerZero Scan shows DELIVERED status |

**Verification command:**
```bash
# After wire completes, verify a cross-chain send
curl -s "https://scan.layerzero-api.com/v1/messages/tx/{txHash}" | jq '.messages[0].status'
# Expected: "DELIVERED"
```

---

## Required Packages to Create

Following the Sui/Starknet pattern, we need THREE new packages:

### 1. `@layerzerolabs/devtools-aptos`

| Component | Purpose |
|-----------|---------|
| `src/connection/factory.ts` | Create Aptos client connections |
| `src/connection/types.ts` | Connection type definitions |
| `src/transactions/signer.ts` | Aptos transaction signing |
| `src/transactions/serde.ts` | Transaction serialization |
| `src/omnigraph/sdk.ts` | Base OmniSDK for Aptos |
| `src/common/addresses.ts` | Address utilities (Aptos uses 32-byte addresses) |

**Must Export:**
- `createConnectionFactory`
- `createSignerFactory` / `AptosSigner`
- `OmniSDK` base class

### 2. `@layerzerolabs/protocol-devtools-aptos`

| Component | Purpose |
|-----------|---------|
| `src/endpointv2/sdk.ts` | EndpointV2 SDK (delegates, libraries, configs) |
| `src/uln302/sdk.ts` | ULN302 SDK (DVN configs, executor configs) |
| `src/addresses.ts` | Protocol contract addresses |

**Must Export:**
- `EndpointV2` class implementing `IEndpointV2`
- `Uln302` class implementing `IUln302`

### 3. `@layerzerolabs/ua-devtools-aptos`

| Component | Purpose |
|-----------|---------|
| `src/oft/sdk.ts` | OFT SDK (setPeer, getPeer, send, etc.) |
| `src/oft/factory.ts` | OFT factory for creating SDK instances |
| `src/oft/config.ts` | OFT configuration types |

**Must Export:**
- `OFT` class implementing `IOApp`
- `createOFTFactory`

---

## Aptos-Specific Considerations

### Address Format
- Aptos uses **32-byte addresses** (like Sui)
- Format: `0x` + 64 hex characters
- Example: `0x756f8ab056688d22687740f4a9aeec3b361170b28d08b719e28c4d38eed1043e`

### Transaction Model
- Aptos uses **Move** language (same as Sui)
- Transactions are built, signed, then submitted
- Entry functions follow pattern: `module::function`

### Account Model
- Aptos accounts have a single private key
- No account abstraction like Starknet
- Uses Ed25519 signatures

### RPC/SDK
- Use `@aptos-labs/ts-sdk` for Aptos interactions
- Existing package: `@layerzerolabs/lz-movevm-sdk-v2` has some utilities

### Gas Model
- Aptos uses "gas units" similar to EVM
- Typical lzReceive gas: 5,000-10,000 units

---

## Implementation Phases

### Phase 1: Create Package Structure

```bash
# Create the three packages (copy from Sui as template)
cp -r packages/devtools-sui packages/devtools-aptos
cp -r packages/protocol-devtools-sui packages/protocol-devtools-aptos
cp -r packages/ua-devtools-sui packages/ua-devtools-aptos

# Update package.json in each:
# - Change name to @layerzerolabs/devtools-aptos, etc.
# - Update dependencies (remove Sui SDK, add Aptos SDK)
# - Remove CHANGELOG.md (will be auto-generated)
```

### Phase 2: Implement devtools-aptos

#### 2.1 Connection Factory
```typescript
// src/connection/factory.ts
import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk'

export const createConnectionFactory = (urlFactory = createRpcUrlFactory()) => {
    return async (eid: EndpointId): Promise<Aptos> => {
        const url = await urlFactory(eid)
        const config = new AptosConfig({ fullnode: url })
        return new Aptos(config)
    }
}
```

#### 2.2 Signer
```typescript
// src/transactions/signer.ts
import { Account, Ed25519PrivateKey } from '@aptos-labs/ts-sdk'

export class AptosSigner implements OmniSigner {
    constructor(
        private readonly aptos: Aptos,
        private readonly account: Account
    ) {}

    async signAndSend(transaction: OmniTransaction): Promise<OmniTransactionResponse> {
        const txn = await this.aptos.transaction.build.simple({
            sender: this.account.accountAddress,
            data: JSON.parse(transaction.data),
        })
        const signed = await this.aptos.signAndSubmitTransaction({
            signer: this.account,
            transaction: txn,
        })
        return { transactionHash: signed.hash }
    }
}
```

### Phase 3: Implement protocol-devtools-aptos

#### 3.1 EndpointV2 SDK
Implement `IEndpointV2` interface:
- `getDelegate()` / `isDelegate()`
- `getSendLibrary()` / `getReceiveLibrary()`
- `setSendLibrary()` / `setReceiveLibrary()`
- `setConfig()` / `getConfig()`

#### 3.2 ULN302 SDK
Implement `IUln302` interface:
- `getUlnConfig()` / `setUlnConfig()`
- `getExecutorConfig()` / `setExecutorConfig()`

### Phase 4: Implement ua-devtools-aptos

#### 4.1 OFT SDK
Implement `IOApp` interface:
- `getPeer()` / `setPeer()` / `hasPeer()`
- `getEndpointSDK()`
- `setDelegate()`

Key considerations:
- Address normalization (EVM 20-byte → Aptos 32-byte)
- Use `areBytes32Equal()` for peer comparison

### Phase 5: Register in Wire Task

#### 5.1 Add SDK Factory (`packages/devtools-evm-hardhat/src/utils.ts`)
```typescript
import { createOFTFactory as createAptosOFTFactory } from '@layerzerolabs/ua-devtools-aptos'

// In createDefaultSdkFactory:
case ChainType.APTOS:
    return createAptosOFTFactory(createAptosConnectionFactory())
```

#### 5.2 Add Signer Factory (`packages/devtools-evm-hardhat/src/tasks/oapp/wire.ts`)
```typescript
import { createSignerFactory as createAptosSignerFactory } from '@layerzerolabs/devtools-aptos'

// In signer factory switch:
case ChainType.APTOS:
    return createAptosSignerFactory(/* ... */)
```

### Phase 6: Update oft-main Example

#### 6.1 Add Aptos to layerzero.config.ts
```typescript
const INCLUDE_APTOS = true

const APTOS_ENFORCED_OPTIONS: OAppEnforcedOption[] = [
    {
        msgType: 1,
        optionType: ExecutorOptionType.LZ_RECEIVE,
        gas: 5000,
        value: 0,
    },
]

// Load deployment
const aptosDeployment = loadJsonOptional<AptosDeployment>('./aptos/deploy.json')
const aptosContract: OmniPointHardhat | null =
    INCLUDE_APTOS && aptosDeployment?.oftAddress
        ? {
              eid: EndpointId.APTOS_V2_MAINNET,
              address: aptosDeployment.oftAddress,
          }
        : null
```

#### 6.2 Add to package.json
```json
{
  "devDependencies": {
    "@layerzerolabs/devtools-aptos": "workspace:^",
    "@layerzerolabs/protocol-devtools-aptos": "workspace:^",
    "@layerzerolabs/ua-devtools-aptos": "workspace:^"
  }
}
```

### Phase 7: Test Wire Command

```bash
pnpm -C examples/oft-main exec hardhat lz:oapp:wire --oapp-config layerzero.config.ts
```

Expected output:
```
✓ Setting peer for Aptos OFT -> Arbitrum OFT
✓ Setting peer for Arbitrum OFT -> Aptos OFT
✓ Setting peer for Aptos OFT -> Sui OFT
✓ Setting peer for Sui OFT -> Aptos OFT
...
Done.
```

### Phase 8: Test Send Transaction

```bash
npx hardhat lz:oft:send --src-eid 30108 --dst-eid 30110 --amount 1 --to <ADDRESS>
```

---

## Files to Create/Modify

### New Packages
| Package | Files |
|---------|-------|
| `packages/devtools-aptos/` | Full package structure |
| `packages/protocol-devtools-aptos/` | Full package structure |
| `packages/ua-devtools-aptos/` | Full package structure |

### Wire Task Integration
| File | Change |
|------|--------|
| `packages/devtools-evm-hardhat/src/utils.ts` | Add Aptos SDK factory |
| `packages/devtools-evm-hardhat/src/tasks/oapp/wire.ts` | Add Aptos signer factory |
| `packages/devtools/src/common/bytes.ts` | Ensure APTOS case in denormalizePeer |

### Example Updates
| File | Change |
|------|--------|
| `examples/oft-main/layerzero.config.ts` | Add Aptos contract and pathways |
| `examples/oft-main/package.json` | Add Aptos devtools dependencies |
| `examples/oft-main/tasks/aptos/sendAptos.ts` | Add Aptos send task |

---

## Lessons Learned from Sui/Starknet (Apply Proactively)

1. **Transaction serialization**: Use `serialize()` not `build()` - set sender during signing
2. **Address normalization**: Pad shorter addresses to 32 bytes with leading zeros
3. **Address comparison**: Use `areBytes32Equal()` for all peer/library comparisons
4. **Missing config handling**: Return empty defaults instead of throwing errors
5. **Move call results**: Ensure all returned values are consumed
6. **RPC factory**: Read from `process.env.RPC_URL_APTOS`

---

## Environment Variables Required

```bash
# Aptos
APTOS_PRIVATE_KEY=<your-private-key>
RPC_URL_APTOS=https://fullnode.mainnet.aptoslabs.com/v1
# or for testnet: https://fullnode.testnet.aptoslabs.com/v1
```

---

## Testing Checklist

Before considering Aptos devtools complete:

- [ ] All three packages build without errors
- [ ] Package exports are correct (test with `node -e "require(...)"`)
- [ ] Signer factory is registered in wire.ts
- [ ] SDK factory is registered in utils.ts
- [ ] Address normalization handles EVM/Sui/Starknet addresses
- [ ] `hasPeer()` uses `areBytes32Equal()`
- [ ] Missing config returns defaults
- [ ] `lz:oapp:wire` completes without errors
- [ ] Peers are set bidirectionally for all pathways
- [ ] Cross-chain send works and is DELIVERED

---

## Summary

This plan converts Aptos from a non-standard "move.layerzero.config.ts" pattern to the proper OmniGraph devtools pattern, enabling:

1. Standard `lz:oapp:wire` support
2. Consistent configuration in `layerzero.config.ts`
3. Full multi-VM pathway support (Aptos↔EVM, Aptos↔Sui, Aptos↔Starknet)
4. Send/receive transaction support

**The end result: Aptos works exactly like Sui, Starknet, and EVM - no special handling required.**
