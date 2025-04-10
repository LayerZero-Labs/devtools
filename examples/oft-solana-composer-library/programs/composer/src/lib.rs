use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount};
use anchor_spl::token_interface::{Token2022};

/// LayerZero / OApp endpoint CPI helpers
use oapp::endpoint::{instructions::ClearComposeParams, ID as ENDPOINT_ID};
use oapp::endpoint_cpi::{clear_compose, get_accounts_for_clear_compose, LzAccount};
use oapp::LzComposeParams;

/// Raydium CLMM CPI (concentrated liquidity swap)
use raydium_clmm_cpi::cpi::accounts::SwapSingleV2;
use raydium_clmm_cpi::cpi::swap_v2;

use std::str::FromStr;

// Instead of importing AmmV3 from the raydium_amm_v3 crate, we define our own minimal type.
#[derive(Clone, Debug)]
pub struct AmmV3;

impl anchor_lang::Id for AmmV3 {
    fn id() -> Pubkey {
        Pubkey::from_str("CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK").unwrap()
    }
}

declare_id!("3NJ7AUBaj9N8kBsRqA7SYWJ1poEUsEW36gCG1EfLDkW2");

#[program]
pub mod composer {
    use super::*;

    /// Return all accounts needed by `lz_compose`.
    pub fn lz_compose_types(
        ctx: Context<LzComposeTypes>,
        params: LzComposeParams,
    ) -> Result<Vec<LzAccount>> {
        // LayerZero endpoint accounts first.
        let mut accounts = get_accounts_for_clear_compose(
            ENDPOINT_ID,
            &params.from,
            &ctx.accounts.lz_program.key(),
            &params.guid,
            params.index,
            &params.message,
        );

        // Append the Raydium CLMM CPI accounts *in the exact order* required by the CPI instruction.
        accounts.push(LzAccount {
            pubkey: ctx.accounts.payer.key(),
            is_signer: true,
            is_writable: false,
        });
        accounts.push(LzAccount {
            pubkey: ctx.accounts.authority.key(),
            is_signer: false,
            is_writable: false,
        });
        accounts.push(LzAccount {
            pubkey: ctx.accounts.amm_config.key(),
            is_signer: false,
            is_writable: false,
        });
        accounts.push(LzAccount {
            pubkey: ctx.accounts.pool_state.key(),
            is_signer: false,
            is_writable: true,
        });
        // Note: We assume here that the "source" account is the user’s input token account.
        accounts.push(LzAccount {
            pubkey: ctx.accounts.source_token_account.key(),
            is_signer: false,
            is_writable: true,
        });
        accounts.push(LzAccount {
            pubkey: ctx.accounts.dest_token_account.key(),
            is_signer: false,
            is_writable: true,
        });
        accounts.push(LzAccount {
            pubkey: ctx.accounts.input_vault.key(),
            is_signer: false,
            is_writable: true,
        });
        accounts.push(LzAccount {
            pubkey: ctx.accounts.output_vault.key(),
            is_signer: false,
            is_writable: true,
        });
        accounts.push(LzAccount {
            pubkey: ctx.accounts.token_program.key(),
            is_signer: false,
            is_writable: false,
        });
        accounts.push(LzAccount {
            pubkey: ctx.accounts.token_program_2022.key(),
            is_signer: false,
            is_writable: false,
        });
        accounts.push(LzAccount {
            pubkey: ctx.accounts.memo_program.key(),
            is_signer: false,
            is_writable: false,
        });
        accounts.push(LzAccount {
            pubkey: ctx.accounts.input_token_mint.key(),
            is_signer: false,
            is_writable: false,
        });
        accounts.push(LzAccount {
            pubkey: ctx.accounts.output_token_mint.key(),
            is_signer: false,
            is_writable: false,
        });
        accounts.push(LzAccount {
            pubkey: ctx.accounts.observation_state.key(),
            is_signer: false,
            is_writable: true,
        });
        // Include tick arrays for swap range (if required)
        accounts.push(LzAccount {
            pubkey: ctx.accounts.tick_array_lower.key(),
            is_signer: false,
            is_writable: true,
        });
        accounts.push(LzAccount {
            pubkey: ctx.accounts.tick_array_current.key(),
            is_signer: false,
            is_writable: true,
        });
        accounts.push(LzAccount {
            pubkey: ctx.accounts.tick_array_upper.key(),
            is_signer: false,
            is_writable: true,
        });

        Ok(accounts)
    }

    /// Process the OFT message: swap then clear.
    pub fn lz_compose(ctx: Context<LzCompose>, params: LzComposeParams) -> Result<()> {
        let msg = &params.message;
        // Decode input amount (bytes 32..40)
        let amount_ld = u64::from_be_bytes(msg[32..40].try_into().unwrap());
        let mut compose_from = [0u8; 32];
        compose_from.copy_from_slice(&msg[40..72]);
        let inner = &msg[72..];

        // Ensure payload is long enough for swap parameters.
        require!(inner.len() >= 8, CustomError::InvalidPayload);
        let min_amount_out = u64::from_be_bytes(inner[0..8].try_into().unwrap());

        // Build the CPI accounts struct as expected by Raydium’s SwapSingleV2.
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

        // Attach remaining accounts in the exact order that Raydium CLMM's SwapSingleV2 expects.
        cpi_ctx = cpi_ctx.with_remaining_accounts(vec![
            ctx.accounts.payer.to_account_info(),              // 1
            ctx.accounts.authority.to_account_info(),          // 2
            ctx.accounts.amm_config.to_account_info(),         // 3
            ctx.accounts.pool_state.to_account_info(),         // 4
            ctx.accounts.source_token_account.to_account_info(), // 5
            ctx.accounts.dest_token_account.to_account_info(),   // 6
            ctx.accounts.input_vault.to_account_info(),          // 7
            ctx.accounts.output_vault.to_account_info(),         // 8
            ctx.accounts.observation_state.to_account_info(),    // 9
            ctx.accounts.tick_array_lower.to_account_info(),     // 10
            ctx.accounts.tick_array_current.to_account_info(),   // 11
            ctx.accounts.tick_array_upper.to_account_info(),     // 12
        ]);

        // Execute the CPI swap call.
        swap_v2(
            cpi_ctx,
            amount_ld,
            min_amount_out,
            0u128, // sqrt_price_limit_x64 (adjust if needed)
            true,  // is_base_input: true if input token is base token
        )?;

        // Clear the LayerZero compose message to finalize processing.
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

#[derive(Accounts)]
pub struct LzComposeTypes<'info> {
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
    /// CHECK: Required for memo instructions. Must match spl_memo::id().
    pub memo_program: AccountInfo<'info>,
    #[account(mut)]
    pub tick_array_lower: AccountInfo<'info>,
    #[account(mut)]
    pub tick_array_current: AccountInfo<'info>,
    #[account(mut)]
    pub tick_array_upper: AccountInfo<'info>,
    pub raydium_program: Program<'info, AmmV3>,
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

#[error_code]
pub enum CustomError {
    #[msg("compose_msg too short")]
    InvalidPayload,
}
