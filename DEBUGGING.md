# LayerZero Debugging Guide

This guide helps troubleshoot common issues when deploying and operating LayerZero applications.

## Message Lifecycle

Understanding where messages can get stuck:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        Message Lifecycle & Failure Points                     │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  Source Chain                                              Destination Chain  │
│  ────────────                                              ─────────────────  │
│                                                                               │
│  1. User calls send()                                                         │
│     │                                                                         │
│     ▼                                                                         │
│  2. OApp._lzSend() ─────────────────────────┐                                 │
│     │                                        │                                │
│     │  ❌ FAIL: Insufficient fee             │                                │
│     │  ❌ FAIL: Peer not set                 │                                │
│     │  ❌ FAIL: Invalid options              │                                │
│     │                                        │                                │
│     ▼                                        │                                │
│  3. Endpoint.send()                          │                                │
│     │                                        │                                │
│     │  ❌ FAIL: Config not set               │                                │
│     │                                        │                                │
│     ▼                                        │                                │
│  4. PacketSent event emitted                 │                                │
│     │                                        │                                │
│     │  ══════════════════════════════════════│══════════════════════         │
│     │           Off-chain (DVN verification) │                                │
│     │  ══════════════════════════════════════│══════════════════════         │
│     │                                        │                                │
│     │  ⏳ STUCK: DVN not verifying           │                                │
│     │  ⏳ STUCK: Confirmations pending       │                                │
│     │                                        │                                │
│     ▼                                        ▼                                │
│  5. ────────────────────────────────────► Executor picks up                  │
│                                              │                                │
│                                              │  ❌ FAIL: Executor gas too low │
│                                              │                                │
│                                              ▼                                │
│                                           6. Endpoint.lzReceive()            │
│                                              │                                │
│                                              │  ❌ FAIL: _lzReceive reverts   │
│                                              │  ❌ FAIL: Out of gas           │
│                                              │                                │
│                                              ▼                                │
│                                           7. Message delivered ✓             │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Diagnostic Tools

### Check Peer Configuration

```bash
# See all peer relationships
npx hardhat lz:oapp:peers:get --oapp-config layerzero.config.ts
```

Expected output:
```
┌─────────────────┬─────────────────┬────────────────────────────────────────────┐
│ From            │ To              │ Peer Address                               │
├─────────────────┼─────────────────┼────────────────────────────────────────────┤
│ base-sepolia    │ arbitrum-sepolia│ 0x1234...5678                              │
│ arbitrum-sepolia│ base-sepolia    │ 0xabcd...efgh                              │
└─────────────────┴─────────────────┴────────────────────────────────────────────┘
```

**Issue**: If peer is `0x0000...0000`, the pathway is not wired.

### Check Full Configuration

```bash
# See complete on-chain configuration
npx hardhat lz:oapp:config:get --oapp-config layerzero.config.ts
```

This shows:
- Send library configuration (DVNs, confirmations)
- Receive library configuration
- Enforced options

### Compare with Defaults

```bash
# See what LayerZero defaults are
npx hardhat lz:oapp:config:get:default --oapp-config layerzero.config.ts
```

### Decode Error Messages

```bash
# Decode a revert error
npx hardhat lz:errors:decode --error 0x12345678

# List all known errors
npx hardhat lz:errors:list
```

## Common Issues

### Issue: "Peer not set" / LZ_InvalidPath

**Symptom**: Transaction reverts with `LZ_InvalidPath` or similar

**Cause**: `setPeer()` was not called

**Solution**:
```bash
# Run wire task
npx hardhat lz:oapp:wire --oapp-config layerzero.config.ts

# Verify peers
npx hardhat lz:oapp:peers:get --oapp-config layerzero.config.ts
```

### Issue: "InvalidNonce"

**Symptom**: Message delivery fails with nonce error

**Cause**: Messages delivered out of order or duplicate delivery attempt

**Solution**:
1. Check LayerZero Scan for message status
2. If stuck, may need to clear nonce via recovery mechanism
3. Ensure you're not sending from the same address simultaneously

### Issue: Message Stuck / Not Delivered

**Symptom**: `PacketSent` event on source but no delivery on destination

**Possible Causes**:

1. **DVN not verifying**
   - Check DVN configuration matches for both chains
   - Verify DVN is operational

2. **Confirmations not reached**
   - Check required confirmation count
   - Wait for block confirmations

3. **Executor gas too low**
   - Check `enforcedOptions` gas settings
   - Increase gas in configuration

**Diagnostic Steps**:
```bash
# 1. Get the source transaction hash
# 2. Look up on LayerZero Scan: https://layerzeroscan.com/tx/<hash>
# 3. Check status: "Inflight", "Delivered", "Failed"
```

### Issue: DVN Not Verifying

**Symptom**: Message shows "Waiting for DVN" on LayerZero Scan

**Possible Causes**:
- DVN configuration mismatch between chains
- Required DVN is not operational on that route
- Insufficient confirmations on source chain

**Solution**:
```bash
# Check your DVN configuration
npx hardhat lz:oapp:config:get --oapp-config layerzero.config.ts

# Compare send config (source) with receive config (destination)
# DVNs must match!
```

### Issue: "_lzReceive Reverts"

**Symptom**: Message verified but execution fails

**Possible Causes**:
- Insufficient gas in executor options
- Bug in your `_lzReceive` implementation
- External call in `_lzReceive` failing

**Solution**:
1. Increase gas in `enforcedOptions`:
```typescript
const EVM_ENFORCED_OPTIONS: OAppEnforcedOption[] = [
    {
        msgType: 1,
        optionType: ExecutorOptionType.LZ_RECEIVE,
        gas: 200000,  // Increase this
        value: 0,
    },
]
```

2. Test `_lzReceive` locally with mock data
3. Check for external calls that might fail

### Issue: "Insufficient Fee"

**Symptom**: Send transaction reverts with fee error

**Cause**: Not enough native token sent for gas

**Solution**:
```typescript
// Quote the fee first
const fee = await oft.quoteSend(params, false)

// Send with the quoted fee (add buffer for gas price fluctuation)
await oft.send(params, fee, { value: fee.nativeFee * 110n / 100n })
```

### Issue: Deploy Fails

**Symptom**: `lz:deploy` fails on a network

**Possible Causes**:
- Missing RPC URL in `.env`
- Insufficient balance on deployer
- Network not in `hardhat.config.ts`

**Diagnostic**:
```bash
# Check network connectivity
npx hardhat test --network <network-name>

# Check balance
cast balance <your-address> --rpc-url <rpc-url>
```

### Issue: Wire Task Generates No Transactions

**Symptom**: `lz:oapp:wire` completes but says "0 transactions"

**Possible Causes**:
- Configuration already matches on-chain state
- Config file not properly loaded

**Diagnostic**:
```bash
# Check if config matches
npx hardhat lz:oapp:config:get --oapp-config layerzero.config.ts
```

## LayerZero Scan Integration

[LayerZero Scan](https://layerzeroscan.com/) is the primary tool for tracking cross-chain messages.

### Using LayerZero Scan

1. **Find your transaction**: Search by source transaction hash
2. **Check status**:
   - `Inflight`: Message sent, awaiting DVN verification
   - `Delivered`: Successfully delivered to destination
   - `Failed`: Delivery attempted but failed

3. **View details**:
   - Source chain and transaction
   - Destination chain and transaction
   - DVN verification status
   - Executor delivery status

### Common Scan Statuses

| Status | Meaning | Action |
|--------|---------|--------|
| `Inflight` | Awaiting verification | Wait, or check DVN config |
| `Delivered` | Complete | None needed |
| `Failed` | Delivery reverted | Check gas, check `_lzReceive` |
| `Blocked` | Nonce issue | May need recovery |

## Chain-Specific Issues

### Solana

| Issue | Solution |
|-------|----------|
| "Account not found" | Initialize accounts before sending |
| "Invalid mint authority" | Ensure program has mint authority |
| PDA derivation fails | Check seed derivation matches |

### Aptos/Move

| Issue | Solution |
|-------|----------|
| "Module not published" | Publish with `aptos move publish` |
| "Capability not found" | Check resource permissions |
| Type argument mismatch | Verify generic types |

### zkSync

| Issue | Solution |
|-------|----------|
| Bytecode mismatch | Use zkSync-specific compiler |
| Verification fails | Use zkSync explorer, not Etherscan |

## Reading Wire Task Output

The wire task provides detailed output:

```
Generating transactions for OApp configuration...

Network: base-sepolia
  ┌─ setPeer(arbitrum-sepolia) → 0x1234...
  ├─ setConfig(send, uln302) → 0x5678...
  ├─ setConfig(receive, uln302) → 0xabcd...
  └─ setEnforcedOptions → 0xefgh...

Network: arbitrum-sepolia
  ┌─ setPeer(base-sepolia) → 0x1234...
  ├─ setConfig(send, uln302) → 0x5678...
  ├─ setConfig(receive, uln302) → 0xabcd...
  └─ setEnforcedOptions → 0xefgh...

Total: 8 transactions
```

If a transaction fails, the task will show the error and stop.

## Getting Help

1. **Check documentation**: https://docs.layerzero.network/
2. **Search existing issues**: https://github.com/LayerZero-Labs/devtools/issues
3. **Discord**: LayerZero Discord server
4. **LayerZero Scan**: https://layerzeroscan.com/

## See Also

- [WORKFLOW.md](./WORKFLOW.md) - Deployment workflow guide
- [CHEATSHEET.md](./CHEATSHEET.md) - Quick reference
- [Official Documentation](https://docs.layerzero.network/)
