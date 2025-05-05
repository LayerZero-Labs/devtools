use crate::*;
use anchor_lang::prelude::*;
use oapp::{
    endpoint::{
        cpi::accounts::Clear,
        instructions::{ClearParams, SendComposeParams},
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
