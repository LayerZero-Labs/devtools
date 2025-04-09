use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount};

// LayerZero / OApp endpoint CPI helpers
use oapp::endpoint::{instructions::ClearComposeParams, ID as ENDPOINT_ID};
use oapp::endpoint_cpi::{clear_compose, get_accounts_for_clear_compose, LzAccount};
use oapp::LzComposeParams;

// Raydium CLMM CPI (concentrated liquidity swap)
// NOTE: ensure these imports match the raydium_clmm_cpi crate version you're using
use raydium_clmm_cpi::cpi::swap_v2 as swap;
use raydium_clmm_cpi::cpi::accounts::SwapSingleV2 as RaydiumSwapAccounts;

declare_id!("3NJ7AUBaj9N8kBsRqA7SYWJ1poEUsEW36gCG1EfLDkW2");

#[program]
pub mod composer {
    use super::*;

    /// Return all accounts needed by `lz_compose`.
    pub fn lz_compose_types(
        ctx: Context<LzComposeTypes>,
        params: LzComposeParams,
    ) -> Result<Vec<LzAccount>> {
        // 1) LayerZero endpoint accounts
        let mut accounts = get_accounts_for_clear_compose(
            ENDPOINT_ID,
            &params.from,                  // origin sender (32 bytes)
            &ctx.accounts.lz_program.key(),
            &params.guid,                   // GUID of message
            params.index,                  // index in the queue
            &params.message,               // raw message bytes
        );

        // 2) Raydium CLMM CPI accounts (same order as in LzCompose below)
        accounts.push(LzAccount { pubkey: ctx.accounts.payer.key(),               is_signer: true,  is_writable: false });
        accounts.push(LzAccount { pubkey: ctx.accounts.authority.key(),           is_signer: false, is_writable: false });
        accounts.push(LzAccount { pubkey: ctx.accounts.amm_config.key(),          is_signer: false, is_writable: false });
        accounts.push(LzAccount { pubkey: ctx.accounts.pool_state.key(),          is_signer: false, is_writable: true  });
        accounts.push(LzAccount { pubkey: ctx.accounts.source_token_account.key(), is_signer: false, is_writable: true  });
        accounts.push(LzAccount { pubkey: ctx.accounts.dest_token_account.key(),   is_signer: false, is_writable: true  });
        accounts.push(LzAccount { pubkey: ctx.accounts.input_vault.key(),         is_signer: false, is_writable: true  });
        accounts.push(LzAccount { pubkey: ctx.accounts.output_vault.key(),        is_signer: false, is_writable: true  });
        accounts.push(LzAccount { pubkey: ctx.accounts.input_token_program.key(), is_signer: false, is_writable: false });
        accounts.push(LzAccount { pubkey: ctx.accounts.output_token_program.key(),is_signer: false, is_writable: false });
        accounts.push(LzAccount { pubkey: ctx.accounts.input_token_mint.key(),    is_signer: false, is_writable: false });
        accounts.push(LzAccount { pubkey: ctx.accounts.output_token_mint.key(),   is_signer: false, is_writable: false });
        accounts.push(LzAccount { pubkey: ctx.accounts.observation_state.key(),   is_signer: false, is_writable: true  });
        accounts.push(LzAccount { pubkey: ctx.accounts.token_program.key(),        is_signer: false, is_writable: false });

        Ok(accounts)
    }

    /// Process the OFT message: swap then clear.
    pub fn lz_compose(
        ctx: Context<LzCompose>,
        params: LzComposeParams,
    ) -> Result<()> {
        // Parse OFT payload
        let msg = &params.message;
        let amount_ld = u64::from_be_bytes(msg[32..40].try_into().unwrap());
        let mut compose_from = [0u8; 32];
        compose_from.copy_from_slice(&msg[40..72]);
        let inner = &msg[72..];

        // Decode swap params (first 8 bytes = min_amount_out)
        require!(inner.len() >= 8, CustomError::InvalidPayload);
        let min_amount_out = u64::from_be_bytes(inner[0..8].try_into().unwrap());

        // Raydium CLMM CPI call
        let signer_seeds: &[&[&[u8]]] = &[&[b"oft_seed"]];
        let cpi_accounts = RaydiumSwapAccounts {
            payer:               ctx.accounts.payer.to_account_info(),
            authority:           ctx.accounts.authority.to_account_info(),
            amm_config:          ctx.accounts.amm_config.to_account_info(),
            pool_state:          ctx.accounts.pool_state.to_account_info(),
            input_token_account: ctx.accounts.source_token_account.to_account_info(),
            output_token_account:ctx.accounts.dest_token_account.to_account_info(),
            input_vault:         ctx.accounts.input_vault.to_account_info(),
            output_vault:        ctx.accounts.output_vault.to_account_info(),
            input_token_program: ctx.accounts.input_token_program.to_account_info(),
            output_token_program:ctx.accounts.output_token_program.to_account_info(),
            input_token_mint:    ctx.accounts.input_token_mint.to_account_info(),
            output_token_mint:   ctx.accounts.output_token_mint.to_account_info(),
            observation_state:   ctx.accounts.observation_state.to_account_info(),
            token_program_2022:  ctx.accounts.token_program.to_account_info(),
            memo_program:        ctx.accounts.token_program.to_account_info(),
        };
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.raydium_program.to_account_info(),
            cpi_accounts,
            signer_seeds,
        );
        swap(cpi_ctx, amount_ld, min_amount_out, 0u128, true)?;

        // Clear LayerZero compose
        let clear_params = ClearComposeParams {
            from:    compose_from.into(),
            guid:    params.guid,
            index:   params.index,
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
    pub payer:               Signer<'info>,
    #[account(seeds = [b"authority"], bump)] pub authority: UncheckedAccount<'info>,
    pub amm_config:          AccountInfo<'info>,
    #[account(mut)] pub pool_state:          AccountInfo<'info>,
    #[account(mut)] pub source_token_account:Account<'info, TokenAccount>,
    #[account(mut)] pub dest_token_account:  Account<'info, TokenAccount>,
    #[account(mut)] pub input_vault:         AccountInfo<'info>,
    #[account(mut)] pub output_vault:        AccountInfo<'info>,
    pub input_token_program: AccountInfo<'info>,
    pub output_token_program:AccountInfo<'info>,
    #[account(mut)] pub input_token_mint:    AccountInfo<'info>,
    #[account(mut)] pub output_token_mint:   AccountInfo<'info>,
    #[account(mut)] pub observation_state:   AccountInfo<'info>,
    pub raydium_program:     Program<'info, RaydiumCpmm>,
    pub token_program:       Program<'info, Token>,
}

#[derive(Accounts)]
pub struct LzCompose<'info> {
    #[account(seeds = [b"composer"], bump)] pub lz_program: AccountInfo<'info>,
    pub payer:               Signer<'info>,
    #[account(seeds = [b"authority"], bump)] pub authority: UncheckedAccount<'info>,
    pub amm_config:          AccountInfo<'info>,
    #[account(mut)] pub pool_state:          AccountInfo<'info>,
    #[account(mut)] pub source_token_account:Account<'info, TokenAccount>,
    #[account(mut)] pub dest_token_account:  Account<'info, TokenAccount>,
    #[account(mut)] pub input_vault:         AccountInfo<'info>,
    #[account(mut)] pub output_vault:        AccountInfo<'info>,
    pub input_token_program: AccountInfo<'info>,
    pub output_token_program:AccountInfo<'info>,
    #[account(mut)] pub input_token_mint:    AccountInfo<'info>,
    #[account(mut)] pub output_token_mint:   AccountInfo<'info>,
    #[account(mut)] pub observation_state:   AccountInfo<'info>,
    pub raydium_program:     Program<'info, RaydiumCpmm>,
    pub token_program:       Program<'info, Token>,
}

#[error_code]
pub enum CustomError {
    #[msg("compose_msg too short")]
    InvalidPayload,
}

#[derive(Clone)]
pub struct RaydiumCpmm;
impl anchor_lang::Id for RaydiumCpmm {
    fn id() -> Pubkey { Pubkey::new_from_array([1u8; 32]) }
}