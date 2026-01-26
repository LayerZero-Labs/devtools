# Plan: Fix Devtools VM Packages for Sui and Starknet Wire Support

## ⚠️ CRITICAL CONSTRAINTS

**This is NOT negotiable:**

1. **OFTs MUST be connected using `lz:oapp:wire`** - This is the LayerZero devtools convention. No alternative approaches, scripts, or workarounds are acceptable.

2. **The devtools packages MUST work** - If `lz:oapp:wire` fails, the solution is to FIX THE DEVTOOLS PACKAGES, not to find a different way to wire OFTs.

3. **No workarounds** - Do not:
   - Write custom scripts to wire OFTs
   - Use direct contract calls bypassing devtools
   - Suggest manual transaction construction
   - Propose any solution that doesn't use `lz:oapp:wire`

---

## Goal

**Make `lz:oapp:wire` work for Sui and Starknet OFTs.**

The command that MUST succeed:
```bash
pnpm -C examples/oft-main exec hardhat lz:oapp:wire --oapp-config layerzero.config.ts
```

This command must successfully:
1. Read Sui and Starknet OFT configurations from `layerzero.config.ts`
2. Use the devtools-sui and devtools-starknet packages to create signers
3. Use the ua-devtools-sui and ua-devtools-starknet packages to configure OFTs
4. Wire all pathways (Sui↔EVM, Starknet↔EVM)

---

## Success Criteria

| Criterion | Verification |
|-----------|--------------|
| `lz:oapp:wire` completes without errors | Exit code 0, no exceptions |
| Sui OFT is wired to EVM OFTs | Peers are set bidirectionally |
| Starknet OFT is wired to EVM OFTs | Peers are set bidirectionally |
| Cross-chain send works | LayerZero Scan shows DELIVERED status |

**Verification command:**
```bash
# After wire completes, verify a cross-chain send
curl -s "https://scan.layerzero-api.com/v1/messages/tx/{txHash}" | jq '.messages[0].status'
# Expected: "DELIVERED"
```

---

## Required Devtools Packages (MUST ALL WORK)

### Sui Packages
| Package | Purpose | Must Export |
|---------|---------|-------------|
| `@layerzerolabs/devtools-sui` | Sui signer/provider | `SuiSigner`, `createSuiSignerFactory` |
| `@layerzerolabs/ua-devtools-sui` | Sui OFT SDK | `OFT`, `createOFTFactory` |
| `@layerzerolabs/protocol-devtools-sui` | Sui endpoint SDK | `EndpointV2` |

### Starknet Packages
| Package | Purpose | Must Export |
|---------|---------|-------------|
| `@layerzerolabs/devtools-starknet` | Starknet signer/provider | `StarknetSigner`, `createStarknetSignerFactory` |
| `@layerzerolabs/ua-devtools-starknet` | Starknet OFT SDK | `OFT`, `createOFTFactory` |
| `@layerzerolabs/protocol-devtools-starknet` | Starknet endpoint SDK | `EndpointV2` |

**If any of these packages fail to build, export correctly, or function during `lz:oapp:wire`, FIX THE PACKAGE.**

---

## Current State Analysis

### What Works
| Component | Sui | Starknet |
|-----------|-----|----------|
| SDK Package (ua-devtools-*) | ✅ Exists | ✅ Exists |
| Signer Package (devtools-*) | ✅ Exists | ✅ Exists |
| SDK Factory in `utils.ts` | ✅ Line 72 | ✅ Line 73 |
| Signer Factory in `wire.ts` | ✅ Lines 226-233 | ✅ Lines 234-238 |
| Deploy artifacts | ✅ Has oftPackageId | ✅ Has oftAddress |

### What's Missing/Broken
| Issue | Location | Action Required |
|-------|----------|-----------------|
| Starknet not in config | `layerzero.config.ts` | Add Starknet contract definition |
| Packages may not build | `packages/devtools-sui/` etc. | Fix build errors |
| Symlinks may be broken | `node_modules/` | Ensure workspace links work |

---

## Implementation Phases

### Phase 0: Ensure All VM Packages Build

**This is the foundation. Nothing else matters if packages don't build.**

#### Step 0.1: Build Sui Packages
```bash
pnpm turbo run build --filter @layerzerolabs/devtools-sui
pnpm turbo run build --filter @layerzerolabs/ua-devtools-sui
pnpm turbo run build --filter @layerzerolabs/protocol-devtools-sui
```

**If any build fails: FIX THE BUILD. Do not proceed until all Sui packages build.**

#### Step 0.2: Build Starknet Packages
```bash
pnpm turbo run build --filter @layerzerolabs/devtools-starknet
pnpm turbo run build --filter @layerzerolabs/ua-devtools-starknet
pnpm turbo run build --filter @layerzerolabs/protocol-devtools-starknet
```

**If any build fails: FIX THE BUILD. Do not proceed until all Starknet packages build.**

#### Step 0.3: Verify Exports
```bash
cd examples/oft-main
node -e "const sui = require('@layerzerolabs/devtools-sui'); console.log('Sui exports:', Object.keys(sui))"
node -e "const starknet = require('@layerzerolabs/devtools-starknet'); console.log('Starknet exports:', Object.keys(starknet))"
node -e "const uaSui = require('@layerzerolabs/ua-devtools-sui'); console.log('UA Sui exports:', Object.keys(uaSui))"
node -e "const uaStarknet = require('@layerzerolabs/ua-devtools-starknet'); console.log('UA Starknet exports:', Object.keys(uaStarknet))"
```

**If exports are missing: FIX THE PACKAGE EXPORTS.**

---

### Phase 1: Ensure oft-main Uses Workspace Packages

#### Step 1.1: Check package.json Dependencies
```bash
grep -E "devtools-sui|devtools-starknet|ua-devtools-sui|ua-devtools-starknet" examples/oft-main/package.json
```

Required entries in `examples/oft-main/package.json`:
```json
{
  "devDependencies": {
    "@layerzerolabs/devtools-sui": "workspace:^",
    "@layerzerolabs/devtools-starknet": "workspace:^",
    "@layerzerolabs/ua-devtools-sui": "workspace:^",
    "@layerzerolabs/ua-devtools-starknet": "workspace:^",
    "@layerzerolabs/protocol-devtools-sui": "workspace:^",
    "@layerzerolabs/protocol-devtools-starknet": "workspace:^"
  }
}
```

#### Step 1.2: Reinstall Dependencies
```bash
pnpm install
```

#### Step 1.3: Verify Symlinks
```bash
ls -la examples/oft-main/node_modules/@layerzerolabs/ | grep -E "sui|starknet"
```

Should show symlinks to local packages, NOT npm registry versions.

---

### Phase 2: Add Starknet to layerzero.config.ts

#### Step 2.1: Read Current Config
Understand existing Sui configuration pattern in `examples/oft-main/layerzero.config.ts`.

#### Step 2.2: Add Starknet Contract
Add Starknet OFT contract definition following the same pattern as Sui.

Required additions:
1. Import Starknet endpoint ID
2. Define Starknet contract with address from deploy artifacts
3. Add enforced options for Starknet pathways
4. Add connection pathways for Starknet↔EVM

---

### Phase 3: Validate Environment

#### Step 3.1: Check Required Environment Variables
```bash
# Sui
echo "SUI_MNEMONIC: ${SUI_MNEMONIC:+set}"

# Starknet
echo "STARKNET_PRIVATE_KEY: ${STARKNET_PRIVATE_KEY:+set}"
echo "STARKNET_ACCOUNT_ADDRESS: ${STARKNET_ACCOUNT_ADDRESS:+set}"

# EVM
echo "PRIVATE_KEY: ${PRIVATE_KEY:+set}"
```

All must be set for `lz:oapp:wire` to work.

---

### Phase 4: Run lz:oapp:wire

**This is the moment of truth.**

```bash
pnpm -C examples/oft-main exec hardhat lz:oapp:wire --oapp-config layerzero.config.ts
```

#### If it fails:

1. **Read the error message carefully**
2. **Identify which package/component failed**
3. **Fix that specific issue in the devtools package**
4. **Rebuild the package**
5. **Try again**

**DO NOT look for workarounds. FIX THE DEVTOOLS.**

---

## Debugging Guide

### Common Errors and Solutions

| Error | Likely Cause | Fix |
|-------|--------------|-----|
| `Cannot find module '@layerzerolabs/devtools-sui'` | Package not built or not linked | Build package, run `pnpm install` |
| `createSuiSignerFactory is not a function` | Missing export | Add export to package's index.ts |
| `Invalid Sui address` | Deploy artifact issue | Check `deployments/sui-mainnet/OFT.json` |
| `Starknet provider error` | RPC or signer issue | Check env vars, fix devtools-starknet |
| `Cannot read property 'setPeer'` | OFT SDK issue | Fix ua-devtools-sui/starknet |

### Debug Logging
```bash
DEBUG=* pnpm -C examples/oft-main exec hardhat lz:oapp:wire --oapp-config layerzero.config.ts
```

---

## Files That May Need Modification

### Devtools Packages (FIX THESE IF BROKEN)
- `packages/devtools-sui/src/index.ts` - Sui signer exports
- `packages/devtools-starknet/src/index.ts` - Starknet signer exports
- `packages/ua-devtools-sui/src/index.ts` - Sui OFT SDK exports
- `packages/ua-devtools-starknet/src/index.ts` - Starknet OFT SDK exports
- `packages/devtools-evm-hardhat/src/tasks/oapp/wire.ts` - Wire task VM integration
- `packages/devtools-evm-hardhat/src/utils.ts` - SDK factory registration

### Example Configuration
- `examples/oft-main/layerzero.config.ts` - Add Starknet configuration
- `examples/oft-main/package.json` - Add workspace dependencies
- `examples/oft-main/.env` - Environment variables

---

## Summary

**The only acceptable outcome is:**

```bash
$ pnpm -C examples/oft-main exec hardhat lz:oapp:wire --oapp-config layerzero.config.ts

✓ Setting peer for Sui OFT -> Ethereum OFT
✓ Setting peer for Ethereum OFT -> Sui OFT
✓ Setting peer for Starknet OFT -> Ethereum OFT
✓ Setting peer for Ethereum OFT -> Starknet OFT
...
Done.
```

**If this doesn't work, FIX THE DEVTOOLS PACKAGES until it does.**

---

## Lessons Learned: Sui Devtools Painpoints

The following issues were discovered while making `lz:oapp:wire` work for Sui. These notes should help catch similar issues earlier in future package design.

### 1. Transaction Serialization vs Building

**Problem:** Sui's `Transaction.build()` requires a sender address, but the SDK creates transactions before knowing who will sign them.

**Error:** `Missing transaction sender`

**Fix:** Use `transaction.serialize()` instead of `transaction.build()` in `createTransaction()`. The sender is set later during signing.

**Package:** `packages/devtools-sui/src/omnigraph/sdk.ts`

```typescript
// WRONG: Requires sender at build time
const bytes = await transaction.build({ client: this.client })

// CORRECT: Serialize without sender, set sender during signing
const serialized = transaction.serialize()
```

**Design Principle:** SDK methods should create transaction representations that can be signed by any signer later. Don't require execution context during transaction creation.

---

### 2. Transaction Reconstruction During Signing

**Problem:** The signer receives serialized transaction data but needs to reconstruct, set sender, then build.

**Fix:** Update signer to use `Transaction.from()` to reconstruct, then `setSender()` before building.

**Package:** `packages/devtools-sui/src/transactions/signer.ts`

```typescript
async signAndSend(transaction: OmniTransaction): Promise<OmniTransactionResponse> {
    const suiTransaction = Transaction.from(transaction.data)
    suiTransaction.setSender(this.signer.toSuiAddress())
    // Now build and execute
}
```

**Design Principle:** Signers should handle all execution context (sender, gas, etc.) at signing time.

---

### 3. Address Length Normalization (EVM ↔ Sui)

**Problem:** EVM addresses are 20 bytes, but Sui expects 32-byte `bytes32` for peer addresses.

**Error:** `Move abort in bytes32::from_bytes` (code 1)

**Fix:** Pad EVM addresses with leading zeros to 32 bytes in `setPeer()`.

**Package:** `packages/ua-devtools-sui/src/oft/sdk.ts`

```typescript
if (rawBytes.length === 20) {
    // Pad EVM address (20 bytes) to 32 bytes with leading zeros
    peerBytes = new Uint8Array(32)
    peerBytes.set(rawBytes, 32 - rawBytes.length) // Right-align
}
```

**Design Principle:** Always normalize addresses to the target chain's expected format at the boundary (in SDK methods that write to chain).

---

### 4. Address Comparison Must Be Normalized

**Problem:** `hasPeer()` compared a 32-byte padded address from chain with a 20-byte EVM address, always returning `false`.

**Result:** Unnecessary `setPeer` transactions generated on every wire run.

**Fix:** Use `areBytes32Equal()` which normalizes both addresses before comparison.

**Package:** `packages/ua-devtools-sui/src/oft/sdk.ts`

```typescript
// WRONG: Direct comparison fails due to length mismatch
return (peer ?? null) === (_address ?? null)

// CORRECT: Normalize both to bytes32 before comparing
return areBytes32Equal(peer, _address)
```

**Design Principle:** All address comparisons should normalize to a common format. Use utility functions like `areBytes32Equal()` consistently.

---

### 5. Move Call Results Must Be Consumed

**Problem:** Sui Move functions return `Call<Param, Result>` objects that MUST be consumed. Unused results cause transaction failure.

**Error:** `UnusedValueWithoutDrop { result_idx: 0 }`

**Fix:** Call `populateSetConfigTransaction()` after `setConfigMoveCall()` to consume the result.

**Package:** `packages/protocol-devtools-sui/src/endpointv2/sdk.ts`

```typescript
// setConfigMoveCall returns Call<MessageLibSetConfigParam, Void>
const setConfigCall = await this.getOApp(oapp).setConfigMoveCall(tx, ...)

// MUST consume the result with populateSetConfigTransaction
await this.getEndpoint().populateSetConfigTransaction(tx, setConfigCall)
```

**Design Principle:** When wrapping Sui SDK methods, always check if the underlying Move function returns a value that needs consumption. Document these requirements clearly.

---

### 6. Graceful Handling of Missing Configuration

**Problem:** Querying config that doesn't exist throws Move abort errors instead of returning empty/default values.

**Error:** `Move abort in send_uln::*` or similar

**Fix:** Catch Move abort errors and return empty config objects.

**Package:** `packages/protocol-devtools-sui/src/uln302/sdk.ts`

```typescript
async getAppUlnConfig(...): Promise<Uln302UlnConfig> {
    try {
        return await this.getUln().getOAppSendUlnConfig(...)
    } catch (error) {
        if (this.isMissingSuiConfig(error)) {
            return { confirmations: 0n, requiredDVNs: [], ... }
        }
        throw error
    }
}
```

**Design Principle:** SDK "get" methods should return sensible defaults for missing data rather than throwing. This allows wire tasks to detect what needs configuration.

---

### 7. Enforced Options Order in Config

**Problem:** The pathway config tuple `[contractA, contractB, ..., [optionsA, optionsB]]` means:
- `optionsA` = options when sending FROM A TO B
- `optionsB` = options when sending FROM B TO A

The naming should reflect the DESTINATION, not the source.

**Mistake Made:**
```typescript
// WRONG: Named by source chain
[EVM_ENFORCED_OPTIONS, SUI_ENFORCED_OPTIONS]  // Confusing!

// CORRECT: Named by destination chain
[SUI_ENFORCED_OPTIONS, EVM_ENFORCED_OPTIONS]  // Arb→Sui uses SUI options
```

**Result:** First Sui→EVM transaction failed with 5000 gas (Sui gas) instead of 80000 (EVM gas).

**Design Principle:** Name enforced options by DESTINATION chain (e.g., `TO_SUI_OPTIONS`, `TO_EVM_OPTIONS`) to make the pathway tuple order intuitive.

---

### 8. RPC URL Factory Must Use Environment Variables

**Problem:** `createConnectionFactory()` with no arguments uses a default factory that throws.

**Fix:** Always pass `createRpcUrlFactory()` which reads from `process.env.RPC_URL_SUI`.

**Package:** `packages/devtools-sui/src/connection/factory.ts` (usage in examples)

```typescript
// WRONG: Uses default factory that throws
const connectionFactory = createConnectionFactory()

// CORRECT: Uses factory that reads env vars
const connectionFactory = createConnectionFactory(createRpcUrlFactory())
```

**Design Principle:** Connection factories should have sensible defaults that read from standard environment variables.

---

## Testing Checklist for New VM Packages

Before considering a VM devtools package complete, verify:

- [ ] `createTransaction()` works without sender context
- [ ] Signer properly reconstructs and signs transactions
- [ ] Address normalization handles all source chain formats
- [ ] Address comparison uses normalized comparison
- [ ] All Move call results are properly consumed
- [ ] Missing config returns defaults, not errors
- [ ] Connection factory reads from environment variables
- [ ] Example enforced options use correct naming convention

---

## Verified Working: Sui OFT Wire + Send

**Status:** ✅ COMPLETE

| Test | Result |
|------|--------|
| `lz:oapp:wire` completes | ✅ No transactions needed (fully configured) |
| Sui→EVM send | ✅ DELIVERED in 12 seconds |
| EVM→Sui send | ✅ DELIVERED in 25 seconds |
| Token balances correct | ✅ Sui: 0.5, Arbitrum: 99,998.9 |

**LayerZero Scan Links:**
- Sui→Arbitrum: https://layerzeroscan.com/tx/BD3vzbMTsYkHMPRRLMdCgdoNyc3JgMPK4aboMyy4gn8N
- Arbitrum→Sui: https://layerzeroscan.com/tx/0x142ac09cb71a53846c6cd4650e214df175fae461415090290ed482335786d2e7
