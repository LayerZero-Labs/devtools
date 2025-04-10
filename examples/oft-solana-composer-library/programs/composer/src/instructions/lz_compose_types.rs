use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount};
use anchor_spl::token_interface::Token2022;

// LayerZero / OApp endpoint CPI helpers:
use oapp::endpoint_cpi::{get_accounts_for_clear_compose, LzAccount};
use oapp::{endpoint::ID as ENDPOINT_ID, LzComposeParams};

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
    pub raydium_program: Program<'info, crate::AmmV3>,
}

impl LzComposeTypes<'_> {
    /// Processes the lz_compose_types instruction and returns a vector of LzAccount.
    /// The list of accounts should follow the rules below:
    /// 1. Include all the accounts that are used in the LzCompose instruction, including the
    /// accounts that are used by the Endpoint program.
    /// 2. Set the account is a signer with ZERO address if the LzCompose instruction needs a payer
    /// to pay fee, like rent.
    /// 3. Set the account is writable if the LzCompose instruction needs to modify the account.
    pub fn apply(
        ctx: &Context<LzComposeTypes>,
        params: &LzComposeParams,
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

        // Append the Raydium CLMM CPI accounts in the exact order required.
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
        // Assumes that the source is the user's input token account.
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
}
