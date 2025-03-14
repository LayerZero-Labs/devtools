use crate::*;
use oapp::endpoint::{instructions::RegisterOAppParams, ID as ENDPOINT_ID};

#[derive(Accounts)]
#[instruction(params: InitCountParams)]
pub struct InitCount<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        init,
        payer = payer,
        space = Count::SIZE,
        seeds = [COUNT_SEED, &params.id.to_be_bytes()],
        bump
    )]
    pub count: Account<'info, Count>,
    #[account(
        init,
        payer = payer,
        space = LzReceiveTypesAccounts::SIZE,
        seeds = [LZ_RECEIVE_TYPES_SEED, &count.key().to_bytes()],
        bump
    )]
    pub lz_receive_types_accounts: Account<'info, LzReceiveTypesAccounts>,
    #[account(
        init,
        payer = payer,
        space = LzComposeTypesAccounts::SIZE,
        seeds = [LZ_COMPOSE_TYPES_SEED, &count.key().to_bytes()],
        bump
    )]
    pub lz_compose_types_accounts: Account<'info, LzComposeTypesAccounts>,
    pub system_program: Program<'info, System>,
}

impl InitCount<'_> {
    pub fn apply(ctx: &mut Context<InitCount>, params: &InitCountParams) -> Result<()> {
        ctx.accounts.count.id = params.id;
        ctx.accounts.count.admin = params.admin;
        ctx.accounts.count.bump = ctx.bumps.count;
        ctx.accounts.count.endpoint_program = params.endpoint;
        ctx.accounts.count.ordered_nonce = params.ordered_nonce;

        ctx.accounts.lz_receive_types_accounts.count = ctx.accounts.count.key();
        ctx.accounts.lz_compose_types_accounts.count = ctx.accounts.count.key();

        // calling endpoint cpi
        let register_params = RegisterOAppParams { delegate: ctx.accounts.count.admin };
        let seeds: &[&[u8]] = &[COUNT_SEED, &[ctx.accounts.count.id], &[ctx.accounts.count.bump]];
        oapp::endpoint_cpi::register_oapp(
            ENDPOINT_ID,
            ctx.accounts.count.key(),
            ctx.remaining_accounts,
            seeds,
            register_params,
        )?;

        Ok(())
    }
}

#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
pub struct InitCountParams {
    pub id: u8,
    pub admin: Pubkey,
    pub endpoint: Pubkey,
    pub ordered_nonce: bool,
}
