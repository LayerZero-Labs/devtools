use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount};
use anchor_spl::token_interface::{Token2022};
use raydium_clmm_cpi::cpi::accounts::SwapSingleV2;
use raydium_clmm_cpi::cpi::swap_v2;
use std::str::FromStr;

// LayerZero / OApp endpoint CPI helpers:
use oapp::endpoint::{instructions::ClearComposeParams, ID as ENDPOINT_ID};
use oapp::endpoint_cpi::{clear_compose};
use oapp::LzComposeParams;

// Use our minimal AmmV3 type instead of importing from the raydium_amm_v3 crate.
#[derive(Clone, Debug)]
pub struct AmmV3;

impl anchor_lang::Id for AmmV3 {
    fn id() -> Pubkey {
        Pubkey::from_str("CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK").unwrap()
    }
}

#[derive(Accounts)]
pub struct LzCompose<'info> {
    #[account(seeds = [b"composer"], bump)]
    pub lz_program: AccountInfo<'info>,
    pub payer: Signer<'info>,
    #[account(seeds = [b"authority"], bump)]
    pub authority: AccountInfo<'info>,
    pub amm_config: AccountInfo<'info>,
    #[account(mut)]
    pub pool_state: AccountInfo<'info>,
    #[account(mut)]
    pub source_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub dest_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub input_vault: AccountInfo<'info>,
    #[account(mut)]
    pub output_vault: AccountInfo<'info>,
    pub token_program: Program<'info, Token>,
    pub token_program_2022: Program<'info, Token2022>,
    #[account(mut)]
    pub input_token_mint: AccountInfo<'info>,
    #[account(mut)]
    pub output_token_mint: AccountInfo<'info>,
    #[account(mut)]
    pub observation_state: AccountInfo<'info>,
    /// CHECK: Required for memo instructions.
    pub memo_program: AccountInfo<'info>,
    #[account(mut)]
    pub tick_array_lower: AccountInfo<'info>,
    #[account(mut)]
    pub tick_array_current: AccountInfo<'info>,
    #[account(mut)]
    pub tick_array_upper: AccountInfo<'info>,
    pub raydium_program: Program<'info, AmmV3>,
}

/// Processes the lz_compose instruction.
impl LzCompose<'_> {
    pub fn apply(ctx: &mut Context<LzCompose>, params: &LzComposeParams) -> Result<()> {
        let msg = &params.message;
        // Decode input amount from bytes 32..40.
        let amount_ld = u64::from_be_bytes(msg[32..40].try_into().unwrap());
        let mut compose_from = [0u8; 32];
        compose_from.copy_from_slice(&msg[40..72]);
        let inner = &msg[72..];

        let min_amount_out = u64::from_be_bytes(inner[0..8].try_into().unwrap());

        // Build the CPI accounts struct for Raydium's SwapSingleV2.
        let cpi_accounts = SwapSingleV2 {
            payer: ctx.accounts.payer.to_account_info(),
            amm_config: ctx.accounts.amm_config.to_account_info(),
            pool_state: ctx.accounts.pool_state.to_account_info(),
            input_token_account: ctx.accounts.source_token_account.to_account_info(),
            output_token_account: ctx.accounts.dest_token_account.to_account_info(),
            input_vault: ctx.accounts.input_vault.to_account_info(),
            output_vault: ctx.accounts.output_vault.to_account_info(),
            observation_state: ctx.accounts.observation_state.to_account_info(),
            token_program: ctx.accounts.token_program.to_account_info(),
            token_program_2022: ctx.accounts.token_program_2022.to_account_info(),
            memo_program: ctx.accounts.memo_program.to_account_info(),
            input_vault_mint: ctx.accounts.input_token_mint.to_account_info(),
            output_vault_mint: ctx.accounts.output_token_mint.to_account_info(),
        };

        // Build the CPI context with the Raydium CLMM program.
        let mut cpi_ctx =
            CpiContext::new(ctx.accounts.raydium_program.to_account_info(), cpi_accounts);

        // Attach remaining accounts in the exact order required.
        cpi_ctx = cpi_ctx.with_remaining_accounts(vec![
            ctx.accounts.payer.to_account_info(),
            ctx.accounts.authority.to_account_info(),
            ctx.accounts.amm_config.to_account_info(),
            ctx.accounts.pool_state.to_account_info(),
            ctx.accounts.source_token_account.to_account_info(),
            ctx.accounts.dest_token_account.to_account_info(),
            ctx.accounts.input_vault.to_account_info(),
            ctx.accounts.output_vault.to_account_info(),
            ctx.accounts.observation_state.to_account_info(),
            ctx.accounts.tick_array_lower.to_account_info(),
            ctx.accounts.tick_array_current.to_account_info(),
            ctx.accounts.tick_array_upper.to_account_info(),
        ]);

        // Execute the CPI swap call.
        swap_v2(
            cpi_ctx,
            amount_ld,
            min_amount_out,
            0u128, // sqrt_price_limit_x64 (adjust as needed)
            true,  // is_base_input
        )?;

        // Clear the LayerZero compose message.
        let clear_params = ClearComposeParams {
            from: compose_from.into(),
            guid: params.guid,
            index: params.index,
            message: params.message.clone(),
        };

        clear_compose(
            ENDPOINT_ID,
            ctx.accounts.lz_program.key(),
            &ctx.remaining_accounts,
            &[b"composer"],
            clear_params,
        )
    }
}