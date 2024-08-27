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
        seeds = [REMOTE_SEED, &count.key().to_bytes(), &params.src_eid.to_be_bytes()],
        bump = remote.bump,
        constraint = params.sender == remote.address
    )]
    pub remote: Account<'info, Remote>,
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
