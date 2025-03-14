use crate::*;
use anchor_lang::prelude::*;
use oapp::{
    endpoint::{instructions::ClearComposeParams, ID as ENDPOINT_ID},
    LzComposeParams,
};

#[derive(Accounts)]
pub struct LzCompose<'info> {
    #[account(mut, seeds = [COUNT_SEED, &count.id.to_be_bytes()], bump = count.bump)]
    pub count: Account<'info, Count>,
}

impl LzCompose<'_> {
    pub fn apply(ctx: &mut Context<LzCompose>, params: &LzComposeParams) -> Result<()> {
        ctx.accounts.count.composed_count += 1;

        let seeds: &[&[u8]] =
            &[COUNT_SEED, &ctx.accounts.count.id.to_be_bytes(), &[ctx.accounts.count.bump]];
        let params = ClearComposeParams {
            from: params.from,
            guid: params.guid,
            index: params.index,
            message: params.message.clone(),
        };
        oapp::endpoint_cpi::clear_compose(
            ENDPOINT_ID,
            ctx.accounts.count.key(),
            &ctx.remaining_accounts,
            seeds,
            params,
        )
    }
}
