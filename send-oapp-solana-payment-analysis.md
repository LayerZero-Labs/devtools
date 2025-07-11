# Send-OApp: Who Pays for Send Transactions from Solana

## Overview
In the `examples/oapp-solana` project (which is the "send-oapp" example), when sending cross-chain messages from Solana, there are **multiple layers of fees** that need to be paid by different entities.

## Payment Structure

### 1. Solana Transaction Fees (Gas)
**Who Pays**: The **transaction submitter** (the user initiating the send)

**What This Covers**:
- Base transaction fee for the Solana transaction
- Compute unit costs (priority fees)
- Account creation/modification fees

**Code Reference**: In `examples/oapp-solana/tasks/solana/index.ts`, the `addComputeUnitInstructions` function handles compute unit pricing:

```typescript
const { computeUnitPrice, computeUnits } = await getComputeUnitPriceAndLimit(
    connection,
    txBuilder.getInstructions(),
    umiWalletSigner,
    lookupTableAccount,
    transactionType
)
```

The transaction is signed and submitted by the user's wallet (`umiWalletSigner`), making them responsible for all Solana network fees.

### 2. LayerZero Cross-Chain Messaging Fee (Native Fee)
**Who Pays**: The **transaction submitter** (the user initiating the send)

**What This Covers**:
- LayerZero protocol fees for cross-chain message delivery
- Relayer fees for executing the message on the destination chain
- Security fees for message verification

**Code Reference**: In `examples/oapp-solana/tasks/common/send.ts`:

```typescript
// Quote the cross-chain messaging fee
const { nativeFee } = await myoappInstance.quote(umi.rpc, umiWalletSigner.publicKey, {
    dstEid,
    message,
    options,
    payInLzToken: false,
})

console.log('🔖 Native fee quoted:', nativeFee.toString())

// Send the message with the native fee
let txBuilder = transactionBuilder().add(
    await myoappInstance.send(umi.rpc, umiWalletSigner.publicKey, {
        dstEid,
        message,
        options,
        nativeFee, // User pays this fee
    })
)
```

### 3. How the Payment Works

1. **Fee Quotation**: The system first calls `quote()` to determine the required `nativeFee` for the cross-chain message
2. **Transaction Building**: The `send()` instruction is built with the quoted `nativeFee`
3. **Fee Transfer**: When the transaction executes, the `nativeFee` is transferred from the user's account to the LayerZero protocol
4. **Solana Fees**: Standard Solana transaction fees (gas) are also deducted from the user's account

## Key Insights

### The User Pays Everything
- **Solana gas fees**: Paid by the transaction submitter
- **LayerZero messaging fees**: Paid by the transaction submitter
- **Priority fees**: Paid by the transaction submitter (configurable via `computeUnitPriceScaleFactor`)

### Fee Estimation
The system estimates compute units needed for the transaction type:
```typescript
const TransactionCuEstimates: Record<TransactionType, number> = {
    [TransactionType.SendMessage]: 230_000, // Estimated compute units for send messages
    // ... other transaction types
}
```

### Wallet Requirements
The user's Solana wallet must have sufficient SOL to cover:
1. The quoted `nativeFee` for LayerZero messaging
2. Solana transaction fees (base fee + compute units)
3. Any priority fees to ensure transaction inclusion

## Example Flow

1. User calls: `npx hardhat lz:oapp:send --from-eid 40168 --dst-eid 40232 --message "Hello"`
2. System quotes the cross-chain fee (e.g., 0.001 SOL)
3. System estimates compute units needed (230,000 CU)
4. User's wallet signs and submits the transaction
5. User pays: LayerZero fee + Solana gas + priority fees
6. Message is sent cross-chain

## Summary
In the send-oapp example, the **user who initiates the send transaction pays all fees** - both the Solana network fees and the LayerZero cross-chain messaging fees. This is a "pay-per-use" model where the message sender bears the full cost of cross-chain communication.