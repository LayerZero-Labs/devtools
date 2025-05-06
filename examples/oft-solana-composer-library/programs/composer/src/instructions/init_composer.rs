use crate::*;
use anchor_lang::prelude::*;

const COMPOSER_SEED: &[u8] = b"Composer";
const LZ_COMPOSE_TYPES_SEED: &[u8] = b"LzComposeTypes";

#[derive(Accounts)]
#[instruction(params: InitComposerParams)]
pub struct InitComposer<'info> {
    /// PDA holding all our static pubkeys.
    #[account(
        init,
        payer = payer,
        space  = Composer::SIZE,
        seeds  = [COMPOSER_SEED, params.oft_pda.as_ref()],
        bump
    )]
    pub composer: Account<'info, Composer>,

    /// PDA storing all fields for the `lz_compose_types` instruction.
    #[account(
        init,
        payer = payer,
        space  = LzComposeTypesAccounts::SIZE,
        seeds  = [LZ_COMPOSE_TYPES_SEED, composer.key().as_ref()],
        bump
    )]
    pub lz_compose_types_accounts: Account<'info, LzComposeTypesAccounts>,

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
    pub observation_state: Pubkey,
    pub tick_bitmap: Pubkey,
    pub tick_array_lower: Pubkey,
    pub tick_array_current: Pubkey,
    pub tick_array_upper: Pubkey,
    pub input_token_account: Pubkey,
    pub output_token_account: Pubkey,
    pub input_vault_mint: Pubkey,
    pub output_vault_mint: Pubkey,
}

impl InitComposer<'_> {
    pub fn apply(ctx: &mut Context<InitComposer>, params: &InitComposerParams) -> Result<()> {
        let c = &mut ctx.accounts.composer;
        c.oft_pda            = params.oft_pda;
        c.endpoint_pda       = params.endpoint_pda;
        c.bump               = ctx.bumps.composer;
        c.endpoint_program   = params.endpoint_program;
        c.token_program      = params.token_program;
        c.token_program_2022 = params.token_program_2022;
        c.clmm_program       = params.clmm_program;
        c.amm_config         = params.amm_config;
        c.pool_state         = params.pool_state;
        c.input_vault        = params.input_vault;
        c.output_vault       = params.output_vault;
        c.observation_state  = params.observation_state;
        c.tick_bitmap        = params.tick_bitmap;
        c.tick_array_lower   = params.tick_array_lower;
        c.tick_array_current = params.tick_array_current;
        c.tick_array_upper   = params.tick_array_upper;
        c.input_token_account  = params.input_token_account;
        c.output_token_account = params.output_token_account;
        c.input_vault_mint   = params.input_vault_mint;
        c.output_vault_mint  = params.output_vault_mint;

        // Seed the LzComposeTypesAccounts PDA with every field
        let t = &mut ctx.accounts.lz_compose_types_accounts;
        // 0) endpoint program
        t.endpoint_program     = params.endpoint_program;
        // 1) token program
        t.token_program        = params.token_program;
        // 2) token program 2022
        t.token_program_2022   = params.token_program_2022;
        // 3) composer
        t.composer             = c.key();
        // 4) clmm program
        t.clmm_program         = params.clmm_program;
        // 5) amm config
        t.amm_config           = params.amm_config;
        // 6) pool state
        t.pool_state           = params.pool_state;
        // 7) input token account
        t.input_token_account  = params.input_token_account;
        // 8) output token account
        t.output_token_account = params.output_token_account;
        // 9) input vault
        t.input_vault          = params.input_vault;
        // 10) output vault
        t.output_vault         = params.output_vault;
        // 11) observation state
        t.observation_state    = params.observation_state;
        // 12) tick bitmap
        t.tick_bitmap          = params.tick_bitmap;
        // 13) tick array lower
        t.tick_array_lower     = params.tick_array_lower;
        // 14) tick array current
        t.tick_array_current   = params.tick_array_current;
        // 15) tick array upper
        t.tick_array_upper     = params.tick_array_upper;
        // 16) memo program
        t.memo_program         = spl_memo::id();
        // 17) input vault mint
        t.input_vault_mint     = params.input_vault_mint;
        // 18) output vault mint
        t.output_vault_mint    = params.output_vault_mint;
        Ok(())
    }
}
