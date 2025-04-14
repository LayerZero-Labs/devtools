use anchor_lang::prelude::*;
use anchor_spl::token::{Token};
use anchor_spl::token_interface::{Token2022, TokenAccount, Mint};
use spl_memo;

use raydium_clmm_cpi::{
    program::RaydiumClmm,
    states::{AmmConfig, ObservationState, PoolState},
};

use oapp::endpoint_cpi::{get_accounts_for_clear_compose, LzAccount};
use oapp::{endpoint::ID as ENDPOINT_ID, LzComposeParams};

#[derive(Accounts)]
pub struct LzComposeTypes<'info> {
    pub clmm_program: Program<'info, RaydiumClmm>,
    /// The user performing the swap.
    pub payer: Signer<'info>,
    #[account(address = pool_state.load()?.amm_config)]
    pub amm_config: Box<Account<'info, AmmConfig>>,
    pub pool_state: AccountLoader<'info, PoolState>,
    pub input_token_account: Box<InterfaceAccount<'info, TokenAccount>>,
    pub output_token_account: Box<InterfaceAccount<'info, TokenAccount>>,
    pub input_vault: Box<InterfaceAccount<'info, TokenAccount>>,
    pub output_vault: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(address = pool_state.load()?.observation_key)]
    pub observation_state: AccountLoader<'info, ObservationState>,
    pub token_program: Program<'info, Token>,
    pub token_program_2022: Program<'info, Token2022>,
    #[account(address = spl_memo::id())]
    pub memo_program: UncheckedAccount<'info>,
    #[account(address = input_vault.mint)]
    pub input_vault_mint: Box<InterfaceAccount<'info, Mint>>,
    #[account(address = output_vault.mint)]
    pub output_vault_mint: Box<InterfaceAccount<'info, Mint>>,
    /// The LayerZero endpoint program.
    pub lz_program: AccountInfo<'info>,
    /// The authority account for the swap.
    pub authority: AccountInfo<'info>,
    /// Tick array accounts for the swap range.
    pub tick_array_lower: AccountInfo<'info>,
    pub tick_array_current: AccountInfo<'info>,
    pub tick_array_upper: AccountInfo<'info>,
}

impl LzComposeTypes<'_> {
    /// Generates the ordered list of LzAccounts expected by the clear_compose call.
    /// Base accounts for the swap are listed first, followed by extra accounts.
    pub fn apply(
        ctx: &Context<LzComposeTypes>,
        params: &LzComposeParams,
    ) -> Result<Vec<LzAccount>> {
        let mut accounts = Vec::new();
        // Base accounts for swap operations.
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
        accounts.push(LzAccount {
            pubkey: ctx.accounts.input_token_account.key(),
            is_signer: false,
            is_writable: true,
        });
        accounts.push(LzAccount {
            pubkey: ctx.accounts.output_token_account.key(),
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
            pubkey: ctx.accounts.observation_state.key(),
            is_signer: false,
            is_writable: true,
        });
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

        // Append additional accounts required for clear_compose.
        let mut extra_accounts = get_accounts_for_clear_compose(
            ENDPOINT_ID,
            &params.from,
            &ctx.accounts.lz_program.key(),
            &params.guid,
            params.index,
            &params.message,
        );
        accounts.append(&mut extra_accounts);
        
        Ok(accounts)
    }
}
