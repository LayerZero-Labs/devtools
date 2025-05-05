use crate::*;
use anchor_lang::prelude::*;
use oapp::{
    endpoint::{instructions::ClearComposeParams, ID as ENDPOINT_ID},
    LzComposeParams,
};

#[derive(Accounts)]
pub struct LzCompose<'info> {
    #[account(mut, seeds = [STORE_SEED], bump = store.bump)]
    pub store: Account<'info, Store>,
}

impl LzCompose<'_> {
    pub fn apply(ctx: &mut Context<LzCompose>, params: &LzComposeParams) -> Result<()> {
        ctx.accounts.store.composed_count += 1;

        let seeds: &[&[u8]] =
            &[STORE_SEED, &[ctx.accounts.store.bump]];
        let params = ClearComposeParams {
            from: params.from,
            guid: params.guid,
            index: params.index,
            message: params.message.clone(),
        };
        oapp::endpoint_cpi::clear_compose(
            ENDPOINT_ID,
            ctx.accounts.store.key(),
            &ctx.remaining_accounts,
            seeds,
            params,
        )
    }
}
