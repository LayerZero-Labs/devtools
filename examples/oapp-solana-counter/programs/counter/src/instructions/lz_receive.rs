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
    #[account(mut, seeds = [COUNT_SEED, &count.id.to_be_bytes()], bump = count.bump)]
    pub count: Account<'info, Count>,
    #[account(
        seeds = [PEER_SEED, &count.key().to_bytes(), &params.src_eid.to_be_bytes()],
        bump = peer.bump,
        constraint = params.sender == peer.address
    )]
    pub peer: Account<'info, Peer>,
    #[account(
        mut,
        seeds = [NONCE_SEED, &count.key().to_bytes(), &params.src_eid.to_be_bytes(), &params.sender],
        bump = nonce_account.bump
    )]
    pub nonce_account: Account<'info, Nonce>,
}

impl LzReceive<'_> {
    pub fn apply(ctx: &mut Context<LzReceive>, params: &LzReceiveParams) -> Result<()> {
        let seeds: &[&[u8]] =
            &[COUNT_SEED, &ctx.accounts.count.id.to_be_bytes(), &[ctx.accounts.count.bump]];

        // the first 9 accounts are for clear()
        let accounts_for_clear = &ctx.remaining_accounts[0..Clear::MIN_ACCOUNTS_LEN];
        let _ = oapp::endpoint_cpi::clear(
            ENDPOINT_ID,
            ctx.accounts.count.key(),
            accounts_for_clear,
            seeds,
            ClearParams {
                receiver: ctx.accounts.count.key(),
                src_eid: params.src_eid,
                sender: params.sender,
                nonce: params.nonce,
                guid: params.guid,
                message: params.message.clone(),
            },
        )?;

        accept_nonce(&ctx.accounts.count, &mut ctx.accounts.nonce_account, params.nonce)?;

        let msg_type = msg_codec::msg_type(&params.message);
        match msg_type {
            msg_codec::VANILLA_TYPE => ctx.accounts.count.count += 1,
            msg_codec::COMPOSED_TYPE => {
                ctx.accounts.count.count += 1;

                oapp::endpoint_cpi::send_compose(
                    ENDPOINT_ID,
                    ctx.accounts.count.key(),
                    &ctx.remaining_accounts[Clear::MIN_ACCOUNTS_LEN..],
                    seeds,
                    SendComposeParams {
                        to: ctx.accounts.count.key(), // self
                        guid: params.guid,
                        index: 0,
                        message: params.message.clone(),
                    },
                )?;
            },
            // ABA_TYPE & COMPOSED_ABA_TYPE are not supported
            _ => return Err(CounterError::InvalidMessageType.into()),
        }
        Ok(())
    }
}

fn accept_nonce<'info>(
    count_acc: &Account<'info, Count>,
    nonce_acc: &mut Account<'info, Nonce>,
    nonce: u64,
) -> Result<()> {
    let current_nonce = nonce_acc.max_received_nonce;
    if count_acc.ordered_nonce {
        require!(nonce == current_nonce + 1, CounterError::InvalidNonce);
    }
    // update the max nonce anyway. once the ordered mode is turned on, missing early nonces will be rejected
    if nonce > current_nonce {
        nonce_acc.max_received_nonce = nonce;
    }
    Ok(())
}
