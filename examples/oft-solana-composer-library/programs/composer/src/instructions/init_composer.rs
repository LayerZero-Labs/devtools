use crate::*;
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(params: InitComposerParams)]
pub struct InitComposer<'info> {
    /// PDA holding all our static pubkeys.
    #[account(
        init, payer = payer,
        space  = Composer::SIZE,
        seeds  = [COMPOSER_SEED, params.oft_pda.as_ref()],
        bump
    )]
    pub composer: Account<'info, Composer>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
pub struct InitComposerParams {
    pub oft_pda: Pubkey,
    pub endpoint_pda: Pubkey,
    pub endpoint_program: Pubkey,
    pub token_program: Pubkey,
    pub token_program_2022: Pubkey,
    pub clmm_program: Pubkey,
    pub amm_config: Pubkey,
    pub pool_state: Pubkey,
    pub input_vault: Pubkey,
    pub output_vault: Pubkey,
    pub input_vault_mint: Pubkey,
    pub output_vault_mint: Pubkey,
    pub observation_state: Pubkey,
    pub tick_bitmap: Pubkey,
    pub tick_array_lower: Pubkey,
    pub tick_array_current: Pubkey,
    pub tick_array_upper: Pubkey,
    pub input_token_account: Pubkey,
    pub output_token_account: Pubkey,
}

impl InitComposer<'_> {
    pub fn apply(ctx: &mut Context<InitComposer>, params: &InitComposerParams) -> Result<()> {
        let c = &mut ctx.accounts.composer;
        c.oft_pda           = params.oft_pda;
        c.endpoint_pda      = params.endpoint_pda;
        c.bump              = ctx.bumps.composer;
        c.endpoint_program  = params.endpoint_program;
        c.token_program     = params.token_program;
        c.token_program_2022= params.token_program_2022;
        c.clmm_program      = params.clmm_program;
        c.amm_config        = params.amm_config;
        c.pool_state        = params.pool_state;
        c.input_vault       = params.input_vault;
        c.output_vault      = params.output_vault;
        c.observation_state = params.observation_state;
        c.tick_bitmap       = params.tick_bitmap;
        c.tick_array_lower  = params.tick_array_lower;
        c.tick_array_current= params.tick_array_current;
        c.tick_array_upper  = params.tick_array_upper;
        c.input_token_account  = params.input_token_account;
        c.output_token_account = params.output_token_account;
        c.input_vault_mint   = params.input_vault_mint;
        c.output_vault_mint  = params.output_vault_mint;
        Ok(())
    }
}
