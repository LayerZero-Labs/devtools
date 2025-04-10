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
        seeds = [LZ_COMPOSE_TYPES_SEED, payer.key().as_ref(), &[params.id]],
        bump
    )]
    pub composer: Account<'info, Composer>,

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
        Ok(())
    }
}
