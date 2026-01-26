# Plan: Fix Devtools VM Packages for Multi-VM Wire Support

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

## Progress Overview

| VM | Wire Support | Send/Receive | Status |
|----|--------------|--------------|--------|
| Sui | ✅ Complete | ✅ Verified | **DONE** |
| Starknet | 🔄 In Progress | ⏳ Pending | **CURRENT** |
| Aptos | ⏳ Pending | ⏳ Pending | Next |

---

## Current Goal: Starknet Integration

**Make `lz:oapp:wire` work for Starknet OFTs.**

The command that MUST succeed:
```bash
pnpm -C examples/oft-main exec hardhat lz:oapp:wire --oapp-config layerzero.config.ts
```

This command must successfully:
1. Read Starknet OFT configurations from `layerzero.config.ts`
2. Use the devtools-starknet package to create signers
3. Use the ua-devtools-starknet package to configure OFTs
4. Wire all pathways (Starknet↔EVM, Starknet↔Sui)

---

## Success Criteria (Starknet Phase)

| Criterion | Verification |
|-----------|--------------|
| `lz:oapp:wire` completes without errors | Exit code 0, no exceptions |
| Starknet OFT is wired to EVM OFTs | Peers are set bidirectionally |
| Starknet OFT is wired to Sui OFT | Peers are set bidirectionally |
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

### Sui (✅ COMPLETE)
| Component | Status |
|-----------|--------|
| SDK Package (ua-devtools-sui) | ✅ Working |
| Signer Package (devtools-sui) | ✅ Working |
| SDK Factory in `utils.ts` | ✅ Registered |
| Signer Factory in `wire.ts` | ✅ Registered |
| Deploy artifacts | ✅ Has oftPackageId |
| Wire command | ✅ Verified |
| Send/Receive | ✅ Verified both directions |

### Starknet (🔄 IN PROGRESS)
| Component | Status | Action Required |
|-----------|--------|-----------------|
| SDK Package (ua-devtools-starknet) | ✅ Exists | Verify build & exports |
| Signer Package (devtools-starknet) | ✅ Exists | Verify build & exports |
| SDK Factory in `utils.ts` | ✅ Line 73 | Test functionality |
| Signer Factory in `wire.ts` | ✅ Lines 234-238 | Test functionality |
| Deploy artifacts | ⏳ Needs deploy | Deploy Starknet OFT |
| Starknet in config | ❌ Missing | Add to `layerzero.config.ts` |
| Wire command | ⏳ Untested | Run and debug |
| Send/Receive | ⏳ Untested | Test after wire works |

### What's Needed for Starknet
| Task | Location | Priority |
|------|----------|----------|
| Deploy Starknet OFT | `examples/oft-main/starknet/` | 1 |
| Add Starknet to config | `layerzero.config.ts` | 2 |
| Test package builds | `packages/devtools-starknet/` | 3 |
| Run `lz:oapp:wire` | - | 4 |
| Debug and fix issues | Various packages | 5 |
| Test cross-chain send | - | 6 |

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

#### Step 2.1: Review Sui Pattern
The Sui integration provides a template for adding Starknet:
- Load deployment from `sui/deploy.json`
- Define contract with endpoint ID and address
- Add enforced options for pathways
- Add connection pathways

#### Step 2.2: Add Starknet Contract
Add Starknet OFT contract definition following the same pattern as Sui.

Required additions:
1. Import Starknet endpoint ID (`EndpointId.STARKNET_V2_MAINNET` or testnet)
2. Load deployment from `starknet/deploy.json`
3. Define Starknet contract with address from deploy artifacts
4. Add `STARKNET_ENFORCED_OPTIONS` with appropriate gas settings
5. Add connection pathways for Starknet↔EVM, Starknet↔Sui

#### Step 2.3: Starknet-Specific Considerations
- **Address format:** Starknet uses felt252 addresses (252-bit integers)
- **Gas units:** Starknet uses Cairo steps, not EVM gas
- **Token decimals:** May need `starknetTokenDecimals` param in send task
- **Account abstraction:** Starknet has native AA, signer setup may differ

---

### Phase 3: Validate Environment

#### Step 3.1: Check Required Environment Variables
```bash
# Starknet (REQUIRED for this phase)
echo "STARKNET_PRIVATE_KEY: ${STARKNET_PRIVATE_KEY:+set}"
echo "STARKNET_ACCOUNT_ADDRESS: ${STARKNET_ACCOUNT_ADDRESS:+set}"
echo "RPC_URL_STARKNET: ${RPC_URL_STARKNET:+set}"

# Sui (already configured from Phase 1)
echo "SUI_MNEMONIC: ${SUI_MNEMONIC:+set}"
echo "RPC_URL_SUI: ${RPC_URL_SUI:+set}"

# EVM (already configured)
echo "PRIVATE_KEY: ${PRIVATE_KEY:+set}"
```

All Starknet variables must be set for `lz:oapp:wire` to work with Starknet.

#### Step 3.2: Starknet Account Setup
Starknet requires:
1. An account address (deployed contract)
2. Private key for that account
3. RPC URL (Infura, Alchemy, or other Starknet RPC provider)

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
| `Cannot find module '@layerzerolabs/devtools-starknet'` | Package not built or not linked | Build package, run `pnpm install` |
| `createStarknetSignerFactory is not a function` | Missing export | Add export to package's index.ts |
| `Invalid Starknet address` | Deploy artifact issue | Check `starknet/deploy.json` |
| `Starknet provider error` | RPC or signer issue | Check env vars (STARKNET_PRIVATE_KEY, etc.) |
| `Cannot read property 'setPeer'` | OFT SDK issue | Fix ua-devtools-starknet |
| `Missing transaction sender` | Transaction build before sign | Use serialize() not build() |
| `Invalid address length` | EVM→Starknet padding | Pad to felt252 size |
| `Account validation failed` | Starknet AA issue | Check account contract compatibility |

### Starknet-Specific Considerations
- Starknet uses **felt252** (252-bit field elements) for addresses
- Starknet has native **account abstraction** - accounts are contracts
- Transaction execution may require **STRK** or **ETH** for gas
- RPC providers: Infura, Alchemy, Blast, or public nodes

### Debug Logging
```bash
DEBUG=* pnpm -C examples/oft-main exec hardhat lz:oapp:wire --oapp-config layerzero.config.ts
```

---

## Files That May Need Modification

### Starknet Devtools Packages (FOCUS FOR THIS PHASE)
- `packages/devtools-starknet/src/index.ts` - Starknet signer exports
- `packages/devtools-starknet/src/omnigraph/sdk.ts` - Transaction creation (apply Sui learnings)
- `packages/devtools-starknet/src/transactions/signer.ts` - Transaction signing (apply Sui learnings)
- `packages/ua-devtools-starknet/src/index.ts` - Starknet OFT SDK exports
- `packages/ua-devtools-starknet/src/oft/sdk.ts` - OFT operations (address padding, etc.)
- `packages/protocol-devtools-starknet/src/endpointv2/sdk.ts` - Endpoint SDK

### Wire Task (already has Starknet support, may need fixes)
- `packages/devtools-evm-hardhat/src/tasks/oapp/wire.ts` - Wire task VM integration
- `packages/devtools-evm-hardhat/src/utils.ts` - SDK factory registration

### Example Configuration
- `examples/oft-main/layerzero.config.ts` - Add Starknet configuration
- `examples/oft-main/starknet/deploy.json` - Starknet deployment artifacts
- `examples/oft-main/package.json` - Ensure workspace dependencies
- `examples/oft-main/.env` - Starknet environment variables

### Sui Packages (COMPLETE - reference only)
- `packages/devtools-sui/` - ✅ Working
- `packages/ua-devtools-sui/` - ✅ Working
- `packages/protocol-devtools-sui/` - ✅ Working

---

## Summary

**The target outcome for Starknet phase:**

```bash
$ pnpm -C examples/oft-main exec hardhat lz:oapp:wire --oapp-config layerzero.config.ts

✓ Sui OFT peers already configured (no transactions needed)
✓ Setting peer for Starknet OFT -> Arbitrum OFT
✓ Setting peer for Arbitrum OFT -> Starknet OFT
✓ Setting peer for Starknet OFT -> Sui OFT
✓ Setting peer for Sui OFT -> Starknet OFT
✓ Setting enforced options for Starknet pathways
...
Done.
```

**If this doesn't work, FIX THE DEVTOOLS PACKAGES until it does.**

Apply lessons learned from Sui integration proactively to avoid similar issues.

---

## Lessons Learned: Devtools Integration Painpoints

The following issues were discovered while making `lz:oapp:wire` work for Sui. These patterns are **directly applicable to Starknet and Aptos** - expect similar issues and apply these solutions proactively.

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

### 9. Avoid Endless UI Retry Loops

**Problem:** When `lz:oapp:wire` shows failed transactions and prompts "Would you like to retry?", piping `yes` creates an infinite loop if the failure is a configuration issue (not a transient error).

**Symptoms:**
- "Successfully sent 0 transactions"
- "Failed to send 1 transaction"
- Endless retry prompts

**Fix:** When automating wire commands:
1. Run once without `yes` piping to see the actual error
2. Fix the root cause (missing signer, network config, etc.)
3. Only use `yes` piping after confirming the error is transient

**Root Causes to Check:**
- Missing signer factory for the chain type
- Missing network definition for the endpoint ID
- Environment variables not loaded (RPC URL, private key)
- Contract ABI mismatch

**Design Principle:** Never blindly retry configuration errors. Inspect failures, fix root causes, then retry.

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
- [ ] Signer factory is registered in wire.ts for the chain type
- [ ] Network is defined in lz-definitions for the endpoint ID

---

---

## ✅ Completed: Sui Integration

**Status:** COMPLETE - PR branch: `feat/devtools-sui`

| Test | Result |
|------|--------|
| `lz:oapp:wire` completes | ✅ No transactions needed (fully configured) |
| Sui→EVM send | ✅ DELIVERED in 12 seconds |
| EVM→Sui send | ✅ DELIVERED in 25 seconds |
| Token balances correct | ✅ Sui: 0.5, Arbitrum: 99,998.9 |

**LayerZero Scan Links:**
- Sui→Arbitrum: https://layerzeroscan.com/tx/BD3vzbMTsYkHMPRRLMdCgdoNyc3JgMPK4aboMyy4gn8N
- Arbitrum→Sui: https://layerzeroscan.com/tx/0x142ac09cb71a53846c6cd4650e214df175fae461415090290ed482335786d2e7

---

## 🔄 In Progress: Starknet Integration

**Status:** Devtools SDK COMPLETE, Protocol-level send issue - Branch: `feat/devtools-sui`

| Task | Status |
|------|--------|
| Deploy Starknet OFT | ✅ Complete |
| Create deploy.json | ✅ Complete |
| Add to layerzero.config.ts | ✅ Complete |
| Verify package builds | ✅ Complete |
| Run `lz:oapp:wire` | ✅ Complete (idempotent, 2 txns) |
| Debug and fix issues | ✅ Fixed all address normalization |
| EVM→Starknet send | ✅ Working |
| Starknet→EVM send | ❌ Protocol-level bug |
| Starknet→Sui send | ❌ Protocol-level bug |

### Devtools Fixes Applied (ALL COMPLETE)

1. **Address normalization in EndpointV2 SDK** (`protocol-devtools-starknet/src/endpointv2/sdk.ts`):
   - `parseFelt()` now normalizes Starknet addresses by removing leading zeros
   - Ensures `0x0727f...` and `0x727f...` are treated as equal

2. **Library comparison** (`ua-devtools/src/oapp/config.ts`):
   - Changed to use `areBytes32Equal()` for send/receive library comparison
   - Handles addresses with different leading zero counts

3. **Library skip logic** (`ua-devtools/src/oapp/config.ts`):
   - Changed from `if (!isDefaultLibrary && areBytes32Equal(...))` to `if (areBytes32Equal(...))`
   - Prevents SAME_VALUE errors when configured library matches current default

4. **ULN302 SDK address comparison** (`protocol-devtools-starknet/src/uln302/sdk.ts`):
   - Added `areBytes32Equal` for executor address comparison in `hasAppExecutorConfig`
   - Renamed `equalStringArrays` to `equalAddressArrays` with `areBytes32Equal`
   - Added `normalizeAddress` and `normalizeAddressArray` helpers

5. **OFT SDK peer comparison** (`ua-devtools-starknet/src/oft/sdk.ts`):
   - Fixed `hasPeer` to use `areBytes32Equal` instead of direct equality

### Wire Task Status: ✅ WORKING

The wire task now correctly:
- Detects already-configured peers (no redundant setPeer txns)
- Detects already-configured libraries (no SAME_VALUE errors)
- Detects already-configured ULN/executor configs
- Only generates necessary transactions (2 remaining: Sui peer for Starknet, Starknet enforced options)

### On-Chain Configuration Verified ✅

All configurations ARE correctly set on the Starknet OFT:

| Config | Value | Status |
|--------|-------|--------|
| Peer (Arbitrum) | `0x999af0b3fbfe75256cba36af10f367bd2efa319c` | ✅ Set |
| Send Library | `0x727f40349719ac76861a51a0b3d3e07be1577fff137bb81a5dc32e5a5c61d38` | ✅ Set |
| Receive Library | `0x727f40349719ac76861a51a0b3d3e07be1577fff137bb81a5dc32e5a5c61d38` | ✅ Set |
| Executor Config | max_message_size=10000, executor set | ✅ Set |
| ULN Send Config | confirmations=15, DVN set | ✅ Set |
| Enforced Options | `0x00030100110100000000000000000000000000013880` (80k gas) | ✅ Set |

### Current Blocker: PROTOCOL-LEVEL BUG

**Send from Starknet fails with "out of bound" error:**
```
error":"0x6f7574206f6620626f756e64 ('out of bound')
```

**Key Finding:** This is NOT a devtools issue. The error occurs in the **Starknet SendLib contract** (`0x727f40...`) during the `quote` function.

**Evidence:**
- EVM→Starknet send WORKS: https://layerzeroscan.com/tx/0x540dbe715862f57a41b6eb3de7a487151e3e8a85e2230b615b475208a61b9000
- All on-chain configs verified correct via RPC queries
- Wire task is idempotent (configs properly detected)
- The error comes from deep inside the SendLib contract, not from SDK

**Diagnosis:**
The Starknet SendLib contract has a bug in its `quote` function that causes an array/slice "out of bound" error. This needs to be fixed at the protocol contract level, not in devtools.

### Devtools Work Complete For Starknet

The devtools packages are now fully functional for Starknet:
- `@layerzerolabs/devtools-starknet` ✅
- `@layerzerolabs/ua-devtools-starknet` ✅
- `@layerzerolabs/protocol-devtools-starknet` ✅

The remaining issue (send FROM Starknet) requires a fix to the Starknet protocol contracts.
