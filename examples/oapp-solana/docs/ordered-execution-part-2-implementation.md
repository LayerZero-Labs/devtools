# Implementing Ordered Execution in OApp: Part 1, Implementation for MyOApp Example

Before proceeding, ensure that you have gone through [the overview](./ordered-execution-part-1-overview.md)

The following is an example of how ordered execution can be implemented in the MyOApp app:

### 1. State Structures

In `programs/counter/src/state/store.rs`, amend the `Store` struct to include an `ordered_nonce` boolean field.

```rust
pub struct Store {
    // ... other fields
    pub ordered_nonce: bool,  // <-- add this - flag to enable/disable ordered execution
}
```

Modify `programs/counter/src/instructions/init_store.rs` to accept `ordered_nonce` in the params:

```rust
#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
pub struct InitStoreParams {
    pub admin: Pubkey,
    pub endpoint: Pubkey,
    pub ordered_nonce: bool, // <-- add this
}
```

Use the `params.ordered_nonce` value in InitStore's `apply` in the same file:

```rust
//...
ctx.accounts.store.endpoint_program = params.endpoint; // existing line
ctx.accounts.store.ordered_nonce = params.ordered_nonce; // <-- add this
ctx.accounts.store.string = "Nothing received yet.".to_string(); // existing line
//...
```

Create a file at `programs/counter/src/state/nonce.rs` with the following contents to define the Nonce account structure:

```rust
use crate::*;

// This is just one possible implementation of the Nonce account
#[account]
pub struct Nonce {
    pub bump: u8,
    pub max_received_nonce: u64,
}

impl Nonce {
    pub const SIZE: usize = 8 + std::mem::size_of::<Self>();
}
```

Add the struct into `programs/counter/src/state/mod.rs`:

```rust
//...
mod nonce;
//...
pub use nonce::*;
//...
```

Declare the `NONCE_SEED` variable in `programs/counter/src/lib.rs`:

```rust
const NONCE_SEED: &[u8] = b"Nonce";
```

### 2. NextNonce Implementation

Create a file for the NextNonce instruction at `programs/counter/src/instructions/next_nonce.rs` with the following contents:

```rust
use crate::*;

#[derive(Accounts)]
#[instruction(params: NextNonceParams)]
pub struct NextNonce<'info> {
    #[account(
        seeds = [STORE_SEED],
        bump = store.bump,
        constraint = params.receiver == store.key()
    )]
    pub store: Account<'info, Store>,
    #[account(
        seeds = [NONCE_SEED, &params.receiver.as_ref(), &params.src_eid.to_be_bytes(), &params.sender],
        bump = nonce_account.bump
    )]
    pub nonce_account: Account<'info, Nonce>,
}

impl NextNonce<'_> {
    pub fn apply(ctx: &Context<NextNonce>, _params: &NextNonceParams) -> Result<u64> {
        if ctx.accounts.store.ordered_nonce {
            return Ok(ctx.accounts.nonce_account.max_received_nonce + 1);
        }
        return Ok(0); // path nonce starts from 1. if 0 it means that there is no specific nonce enforcement
    }
}

#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
pub struct NextNonceParams {
    pub src_eid: u32,
    pub sender: [u8; 32],
    pub receiver: Pubkey,
}
```

Add the instruction into `programs/counter/src/instructions/mod.rs`

```rust
// ...
pub mod next_nonce;
//...
pub use next_nonce::*;
// ...
```

Register the instruction handler in `programs/counter/src/lib.rs`:

```rust
// existing methods
pub fn next_nonce(ctx: Context<NextNonce>, params: NextNonceParams) -> Result<u64> {
    NextNonce::apply(&ctx, &params)
}
// existing methods
```

### 3. Message Receiving Logic

Amend `programs/counter/src/instructions/lz_receive.rs` to the following:

```rust
use crate::*;
use anchor_lang::prelude::*;
use oapp::{
    endpoint::{
        cpi::accounts::Clear,
        instructions::ClearParams,
        ConstructCPIContext, ID as ENDPOINT_ID,
    },
    LzReceiveParams,
};

#[derive(Accounts)]
#[instruction(params: LzReceiveParams)]
pub struct LzReceive<'info> {
    #[account(mut, seeds = [STORE_SEED], bump = store.bump)]
    pub store: Account<'info, Store>,
    #[account(
        seeds = [PEER_SEED, &store.key().to_bytes(), &params.src_eid.to_be_bytes()],
        bump = peer.bump,
        constraint = params.sender == peer.address
    )]
    pub peer: Account<'info, Peer>,
    #[account(
        mut,
        seeds = [NONCE_SEED, &store.key().to_bytes(), &params.src_eid.to_be_bytes(), &params.sender],
        bump = nonce_account.bump
    )]
    pub nonce_account: Account<'info, Nonce>,
}

impl LzReceive<'_> {
    pub fn apply(ctx: &mut Context<LzReceive>, params: &LzReceiveParams) -> Result<()> {
        let seeds: &[&[u8]] =
            &[STORE_SEED, &[ctx.accounts.store.bump]];
        // the first 9 accounts are for clear()
        let accounts_for_clear = &ctx.remaining_accounts[0..Clear::MIN_ACCOUNTS_LEN];
        let _ = oapp::endpoint_cpi::clear(
            ENDPOINT_ID,
            ctx.accounts.store.key(),
            accounts_for_clear,
            seeds,
            ClearParams {
                receiver: ctx.accounts.store.key(),
                src_eid: params.src_eid,
                sender: params.sender,
                nonce: params.nonce,
                guid: params.guid,
                message: params.message.clone(),
            },
        )?;

        accept_nonce(&ctx.accounts.store, &mut ctx.accounts.nonce_account, params.nonce)?;

        let string_value = msg_codec::decode(&params.message);
        let count = &mut ctx.accounts.store;
        count.string = string_value;

        Ok(())
    }
}

fn accept_nonce<'info>(
    store_acc: &Account<'info, Store>,
    nonce_acc: &mut Account<'info, Nonce>,
    nonce: u64,
) -> Result<()> {
    let current_nonce = nonce_acc.max_received_nonce;
    if store_acc.ordered_nonce {
        require!(nonce == current_nonce + 1, CounterError::InvalidNonce);
    }
    // update the max nonce anyway. once the ordered mode is turned on, missing early nonces will be rejected
    if nonce > current_nonce {
        nonce_acc.max_received_nonce = nonce;
    }
    Ok(())
}

```

Changes:

- Define an `accept_nonce` function
- Include `nonce_account` in the accounts list
- Call `accept_nonce` before committing the change

Amend `programs/counter/src/errors.rs` to include `InvalidNonce`:

```rust
use anchor_lang::prelude::error_code;

#[error_code]
pub enum CounterError {
    InvalidMessageType,
    InvalidNonce,
}

```

### 4. Account Derivation in Type instruction

Amend `programs/counter/src/instructions/lz_receive_types.rs` to the following:

```rust
use crate::*;
use oapp::endpoint_cpi::{get_accounts_for_clear, get_accounts_for_send_compose, LzAccount};
use oapp::{endpoint::ID as ENDPOINT_ID, LzReceiveParams};

/// LzReceiveTypes instruction provides a list of accounts that are used in the LzReceive
/// instruction. The list of accounts required by this LzReceiveTypes instruction can be found
/// from the specific PDA account that is generated by the LZ_RECEIVE_TYPES_SEED.
#[derive(Accounts)]
pub struct LzReceiveTypes<'info> {
    #[account(seeds = [STORE_SEED], bump = store.bump)]
    pub store: Account<'info, Store>,
}

impl LzReceiveTypes<'_> {
    /// The list of accounts should follow the rules below:
    /// 1. Include all the accounts that are used in the LzReceive instruction, including the
    /// accounts that are used by the Endpoint program.
    /// 2. Set the account is a signer with ZERO address if the LzReceive instruction needs a payer
    /// to pay fee, like rent.
    /// 3. Set the account is writable if the LzReceive instruction needs to modify the account.
    pub fn apply(
        ctx: &Context<LzReceiveTypes>,
        params: &LzReceiveParams,
    ) -> Result<Vec<LzAccount>> {
        // There are two accounts that are used in the LzReceive instruction,
        // except those accounts for endpoint program.
        // The first account is the count account, that is the fixed one.
        let store = ctx.accounts.store.key();

        // The second account is the peer account, we find it by the params.src_eid.
        let peer_seeds = [PEER_SEED, &store.to_bytes(), &params.src_eid.to_be_bytes()];
        let (peer, _) = Pubkey::find_program_address(&peer_seeds, ctx.program_id);

        // The third account is the nonce account, we find it by the params.src_eid and params.sender.
        let nonce_seeds =
            [NONCE_SEED, &store.to_bytes(), &params.src_eid.to_be_bytes(), &params.sender];
        let (nonce_account, _) = Pubkey::find_program_address(&nonce_seeds, ctx.program_id);

        let mut accounts = vec![
            // count
            LzAccount { pubkey: store, is_signer: false, is_writable: true },
            // peer
            LzAccount { pubkey: peer, is_signer: false, is_writable: false },
            // nonce_account
            LzAccount { pubkey: nonce_account, is_signer: false, is_writable: true },
        ];

        // append the accounts for the clear ix
        let accounts_for_clear = get_accounts_for_clear(
            ENDPOINT_ID,
            &store,
            params.src_eid,
            &params.sender,
            params.nonce,
        );
        accounts.extend(accounts_for_clear);

        // if the message type is composed, we need to append the accounts for the composing ix
        let is_composed = msg_codec::msg_type(&params.message) == msg_codec::COMPOSED_TYPE;
        if is_composed {
            let accounts_for_composing = get_accounts_for_send_compose(
                ENDPOINT_ID,
                &store,
                &store, // self
                &params.guid,
                0,
                &params.message,
            );
            accounts.extend(accounts_for_composing);
        }

        Ok(accounts)
    }
}
```

Changes:

- `LzAccount { pubkey: nonce_account, is_signer: false, is_writable: true },` added into the `accounts` vec.
- to find the `nonce_account` address, we do `let (nonce_account, _) = Pubkey::find_program_address(&nonce_seeds, ctx.program_id);`
- we define the `nonce_seeds` with `let nonce_seeds = [NONCE_SEED, &store.to_bytes(), &params.src_eid.to_be_bytes(), &params.sender];`

### 5. Enable skipping of `inbound_nonce` when needed:

Create the instruction at `programs/counter/src/instructions/skip_inbound_nonce.rs`:

```rust
use oapp::endpoint::{instructions::SkipParams, ID as ENDPOINT_ID};

use crate::*;

#[derive(Accounts)]
#[instruction(params: SkipInboundNonceParams)]
pub struct SkipInboundNonce<'info> {
    #[account(address = store.admin)]
    pub admin: Signer<'info>,
    #[account(seeds = [STORE_SEED], bump = store.bump)]
    pub store: Account<'info, Store>,
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
        let seeds: &[&[u8]] =
            &[STORE_SEED, &[ctx.accounts.store.bump]];

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
        if ctx.accounts.store.ordered_nonce {
            ctx.accounts.nonce_account.max_received_nonce += 1;
        }
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

Add the instruction into `programs/counter/src/instructions/mod.rs`:

```rust
//...
pub mod skip_inbound_nonce;
//...
pub use skip_inbound_nonce::*;
//...
```

Register the instruction handler in `programs/counter/src/lib.rs`:

```rust
//...
pub fn skip_inbound_nonce(
    mut ctx: Context<SkipInboundNonce>,
    params: SkipInboundNonceParams,
) -> Result<()> {
    SkipInboundNonce::apply(&mut ctx, &params)
}
//...
```

### 6. Allow for toggling of ordered execution

Create the instruction definition at `programs/counter/src/instructions/set_ordered_nonce.rs`:

```rust
use crate::*;

#[derive(Accounts)]
#[instruction(params: SetOrderedNonceParams)]
pub struct SetOrderedNonce<'info> {
    #[account(address = store.admin)]
    pub admin: Signer<'info>,
    #[account(mut, seeds = [STORE_SEED], bump = store.bump)]
    pub store: Account<'info, Store>,
}

impl SetOrderedNonce<'_> {
    pub fn apply(ctx: &mut Context<SetOrderedNonce>, params: &SetOrderedNonceParams) -> Result<()> {
        ctx.accounts.store.ordered_nonce = params.ordered_nonce;
        Ok(())
    }
}

#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
pub struct SetOrderedNonceParams {
    pub ordered_nonce: bool,
}
```

Add the instruction into `programs/counter/src/instructions/mod.rs`:

```rust
//...
pub mod set_ordered_nonce;
//...
pub use set_ordered_nonce::*;
//...
```

Register the instruction handler in `programs/counter/src/lib.rs`;

```rust
pub fn set_ordered_nonce(
    mut ctx: Context<SetOrderedNonce>,
    params: SetOrderedNonceParams,
) -> Result<()> {
    SetOrderedNonce::apply(&mut ctx, &params)
}
```

### 6. Amend `set_peer` to init `nonce_account`:

```rust
use crate::*;
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(params: SetPeerParams)]
pub struct SetPeer<'info> {
    #[account(mut, address = store.admin)]
    pub admin: Signer<'info>,
    #[account(
        init_if_needed,
        payer = admin,
        space = Peer::SIZE,
        seeds = [PEER_SEED, &store.key().to_bytes(), &params.remote_eid.to_be_bytes()],
        bump
    )]
    pub peer: Account<'info, Peer>,
    #[account(
        init_if_needed,
        payer = admin,
        space = Nonce::SIZE,
        seeds = [NONCE_SEED, &store.key().to_bytes(), &params.remote_eid.to_be_bytes(), &params.peer_address],
        bump
    )]
    pub nonce_account: Account<'info, Nonce>, // <-- add this
    #[account(seeds = [STORE_SEED], bump = store.bump)]
    pub store: Account<'info, Store>,
    pub system_program: Program<'info, System>,
}

impl SetPeer<'_> {
    pub fn apply(ctx: &mut Context<SetPeer>, params: &SetPeerParams) -> Result<()> {
        ctx.accounts.peer.address = params.peer_address;
        ctx.accounts.peer.bump = ctx.bumps.peer;
        ctx.accounts.nonce_account.bump = ctx.bumps.nonce_account; // <-- add this
        Ok(())
    }
}

#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
pub struct SetPeerParams {
    pub remote_eid: u32,
    pub peer_address: [u8; 32],
}
```

Changes summary:

- add `nonce_account` into accounts list
- save `nonce_account`'s bump in the `apply`

### 7. Amend scripts

In `tasks/common/send.ts`, amend the `options` construction in both `sendFromEvm` and `sendFromSolana`:

```typescript
const options = Options.newOptions()
  .addExecutorLzReceiveOption(100_000, 0) // adjust gas if necessary
  .addExecutorOrderedExecutionOption() // <-- add this line
  .toBytes();
```

In `lib/client/omnicounter.ts`, add in `orderedNonce` as a param like so:

```typescript
// note: orderedNonce added as a second param
initStore(payer: Signer, admin: PublicKey, orderedNonce: boolean): WrappedInstruction {
    const [oapp] = this.pda.oapp()
    const remainingAccounts = this.endpointSDK.getRegisterOappIxAccountMetaForCPI(payer.publicKey, oapp)
    return instructions
        .initStore(
            { payer: payer, programs: this.programRepo },
            {
                payer,
                count: oapp,
                lzReceiveTypesAccounts: this.pda.lzReceiveTypesAccounts()[0],
                lzComposeTypesAccounts: this.pda.lzComposeTypesAccounts()[0],

                // args
                admin: admin,
                endpoint: this.endpointSDK.programId,
                orderedNonce, // <-- add this
                string: '',
            }
        )
        .addRemainingAccounts(remainingAccounts).items[0]
}
```

Also in ``lib/client/omnicounter.ts`, add:

```typescript
setOrderedNonce(admin: Signer, orderedNonce: boolean): WrappedInstruction {
    return instructions.setOrderedNonce(
        { programs: this.programRepo },
        {
            admin,
            count: this.pda.oapp(),
            orderedNonce,
        }
    ).items[0]
}
```

In `tasks/solana/oappCreate.ts`, add `orderedNonce` value when calling `initStore`:

```typescript
let orderedNonce = true;
const txBuilder = transactionBuilder().add(
  counter.initStore(umiWalletSigner, umiWalletSigner.publicKey, orderedNonce),
);
```

This example shows how the MyOApp app implements the required components while adding application-specific logic (like the `ordered_nonce` flag for toggling the feature).
