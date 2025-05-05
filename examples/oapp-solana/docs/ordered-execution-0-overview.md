# Implementing Ordered Execution in OApp

## Overview

This document outlines how to implement [ordered message execution](https://docs.layerzero.network/v2/developers/evm/oapp/message-design-patterns#message-ordering) in a LayerZero OApp on Solana. Ordered execution ensures that messages from a specific source are processed in the exact sequence they were sent, preventing out-of-order execution which can lead to inconsistent states. For a walkthrough on exact code changes given the MyOApp example, refer to [./ordered-execution-1-implementation.md](./ordered-execution-1-implementation.md). You are highly recommended to go through this document first.

## Key Implementation Requirements

To implement ordered execution, an OApp must implement several essential components:

### 1. The `next_nonce` Instruction

The cornerstone of ordered execution is the `next_nonce` instruction. This instruction allows offchain executor to determine the next expected nonce for a message from a specific source. All other related instructions exist primarily to support this functionality.

**Required Implementation**:

```rust
use crate::*;

#[derive(Accounts)]
#[instruction(params: NextNonceParams)]
pub struct NextNonce<'info> {
    pub oapp: UncheckedAccount<'info>,
    #[account(
        seeds = [NONCE_SEED, &params.receiver.as_ref(), &params.src_eid.to_be_bytes(), &params.sender],
        bump = nonce_account.bump
    )]
    pub nonce_account: Account<'info, Nonce>,
}

impl NextNonce<'_> {
    pub fn apply(ctx: &Context<NextNonce>, _params: &NextNonceParams) -> Result<u64> {
        return Ok(ctx.accounts.nonce_account.max_received_nonce + 1);
        // return Ok(0); // path nonce starts from 1. if 0 it means that there is no specific nonce enforcement
    }
}

#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
pub struct NextNonceParams {
    pub src_eid: u32,
    pub sender: [u8; 32],
    pub receiver: Pubkey,
}
```

**Critical Requirements**:

1. The `NextNonceParams` struct must be defined exactly as shown, with fields in this precise order. This structure cannot be modified as offchain executor relies on this exact definition.
2. The `next_nonce` instruction structure must include exactly 2 accounts in this specific order:

   - First account: OApp PDA (receiver) - can be an unchecked account if not used
   - Second account: Nonce account PDA

3. The instruction must return `Result<u64>` with the next expected nonce value.

### 2. Nonce Account

#### 2.1 PDA Seed Structure

The Nonce account PDA must use these specific seeds in this exact order:

```rust
seeds = [NONCE_SEED, &params.receiver.as_ref(), &params.src_eid.to_be_bytes(), &params.sender]
```

Where:

- `NONCE_SEED` is a constant byte array (e.g., b"Nonce")
- `params.receiver` is the receiver's (OApp) public key (32 bytes)
- `params.src_eid` is the source endpoint ID (as bytes)
- `params.sender` is the sender's (OApp) address (32 bytes)

**Critical Note**: This precise seed structure is essential for the offchain executor to derive the nonce account correctly. Any changes to this structure would prevent offchain executor from calling the `next_nonce` instruction properly.

#### 2.2 Account Structure

The internal structure of the Nonce account is flexible. The only requirement is that it must store a value representing the current maximum nonce. How this value is stored and what additional fields exist in the account is up to the OApp implementation.

For example, your Nonce account might look like:

```rust
pub struct Nonce {
    // You can include any fields needed for your application
    // The only requirement is to have a field storing the max nonce
    pub max_received_nonce: u64,  // This field name can be different in your implementation
}
```

What matters is that the `next_nonce` instruction can read the current maximum nonce value, increment it, and return it as a `u64`.

### 3. The `skip_inbound_nonce` Instruction

This instruction allows administrators to handle missing messages by advancing the nonce counter:

```rust
use oapp::endpoint::{instructions::SkipParams, ID as ENDPOINT_ID};

use crate::*;

#[derive(Accounts)]
#[instruction(params: SkipInboundNonceParams)]
pub struct SkipInboundNonce<'info> {
    // .... Add additional accounts as needed for your OApp
    #[account(
        mut,
        seeds = [NONCE_SEED, &params.receiver.as_ref(), &params.src_eid.to_be_bytes(), &params.sender],
        bump = nonce_account.bump
    )]
    pub nonce_account: Account<'info, Nonce>,
}

impl SkipInboundNonce<'_> {
    pub fn apply(
        ctx: &mut Context<SkipInboundNonce>,
        params: &SkipInboundNonceParams,
    ) -> Result<()> {
        // .... OApp-specific business logic
        let _ = oapp::endpoint_cpi::skip_nonce(
            ENDPOINT_ID,
            ctx.remaining_accounts,
            seeds,
            SkipParams {
                receiver: params.receiver,
                src_eid: params.src_eid,
                sender: params.sender,
                nonce: params.nonce,
            },
        )?;

        // Update the max nonce value in your Nonce account
        // This line will vary based on your Nonce account's structure
        ctx.accounts.nonce_account.max_received_nonce += 1;

        return Ok(());
    }
}

#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
pub struct SkipInboundNonceParams {
    pub receiver: Pubkey,
    pub src_eid: u32,
    pub sender: [u8; 32],
    pub nonce: u64,
}
```

**Implementation Requirements**:

1. Must call the endpoint's `skip_nonce` CPI
2. Must update the maximum nonce value in the nonce account

### 4. Nonce Validation in `lz_receive`

Your OApp must validate and update nonces in the `lz_receive` instruction. This is typically done with a helper function similar to:

```rust
fn accept_nonce<'info>(nonce_acc: &mut Account<'info, Nonce>, nonce: u64) -> Result<()> {
    // Access your nonce account's maximum nonce value
    // This might look different depending on your Nonce account structure
    let current_nonce = nonce_acc.max_received_nonce;

    // enforce strict ordering
    require!(nonce == current_nonce + 1, ErrorCode::InvalidNonce);

    // Always update the max nonce if the new one is greater
    if nonce > current_nonce {
        nonce_acc.max_received_nonce = nonce;
    }

    Ok(())
}
```

**Critical Note**: This function must be called in the `lz_receive` instruction to ensure the nonce state is correctly maintained. Without proper nonce updates, the `next_nonce` instruction would return incorrect values, leading to message delivery failures or out-of-order execution.

## Implementation Steps

Here are the general steps needed to implement ordered execution in your OApp:

1. **Create Nonce Account Structure**:

   - Define a Nonce account structure with a field to store the maximum received nonce
   - The specific structure is flexible as long as it can store the max nonce value

2. **Implement Required Instructions**:

   - Implement `next_nonce` with the exact parameter and account structure
   - Implement `skip_inbound_nonce` for administrative recovery

3. **Update Message Receiving Logic**:

   - Add nonce validation to your `lz_receive` implementation
   - Ensure your `lz_receive` instruction validates and updates nonces
   - Add proper error handling for invalid nonces

4. **Add Account Derivation in Types Instruction**:
   - Update your `lz_receive_types` instruction to include the nonce account with the proper seed derivation

## Offchain Workflow with LayerZero

When a message includes the `ExecutorOrderedExecutionOption`, the LayerZero Executor will call the `next_nonce` instruction before delivering a message to determine if it should be executed. The Executor checks if the message's nonce matches the next expected nonce (returned by `next_nonce`). If it matches or if ordered execution is disabled (when `next_nonce` returns 0), the message is delivered immediately. Otherwise, the message is queued for later delivery.

> Reference: https://docs.layerzero.network/v2/developers/evm/oapp/message-design-patterns#message-ordering
