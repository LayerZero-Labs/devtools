use crate::*;
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(params: InitComposerParams)]
pub struct InitComposer<'info> {
    /// The Composer configuration account, initialized as a PDA.
    #[account(
        init,
        payer = payer,
        space = Composer::SIZE,
        seeds = [COMPOSER_SEED, params.oft.as_ref()],
        bump
    )]
    pub composer: Account<'info, Composer>,

    /// The LzComposeTypesAccounts account, storing extra addresses required for lz_compose_types.
    #[account(
        init,
        payer = payer,
        space = LzComposeTypesAccounts::SIZE,
        seeds = [LZ_COMPOSE_TYPES_SEED, composer.key().as_ref()],
        bump
    )]
    pub lz_compose_types_accounts: Account<'info, LzComposeTypesAccounts>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
pub struct InitComposerParams {
    pub id: u8,
    pub oft: Pubkey,
    pub endpoint_program: Pubkey,
}

impl InitComposer<'_> {
    /// Processes the init_composer instruction by writing the provided values to the Composer account.
    pub fn apply(ctx: &mut Context<InitComposer>, params: &InitComposerParams) -> Result<()> {
        let composer = &mut ctx.accounts.composer;
        composer.oft = params.oft;
        composer.endpoint_program = params.endpoint_program;
        composer.bump = ctx.bumps.composer;

        // Initialize lz_compose_types_accounts with the composer address.
        let lz_accounts = &mut ctx.accounts.lz_compose_types_accounts;
        lz_accounts.composer = composer.key();
        // Other fields in LzComposeTypesAccounts can be set as needed.
        Ok(())
    }
}
