use crate::*;
use anchor_lang::prelude::*;
use anchor_spl::token::Token;
use anchor_spl::token_interface::{Mint, Token2022, TokenAccount};

use oapp::endpoint_cpi::{get_accounts_for_clear_compose, LzAccount};
use oapp::LzComposeParams;
use raydium_clmm_cpi::{
    program::RaydiumClmm,
    states::{AmmConfig, ObservationState, PoolState},
};

/// This struct must list **in the exact same order** the 18 pubkeys your PDA was seeded with,
/// because the @layerzerolabs/lz-solana-sdk-v2 will simulate by shoving *exactly* those into the `keys` array.
/// **MUST** match the 18‐pubkey seed order **exactly**!
#[derive(Accounts)]
pub struct LzComposeTypes<'info> {
    /// 1) LayerZero endpoint program
    pub endpoint_program: Program<'info, oapp::endpoint::program::Endpoint>,

    /// 2) SPL Token program v1
    pub token_program: Program<'info, Token>,

    /// 3) SPL Token program v2 (2022)
    pub token_program_2022: Program<'info, Token2022>,

    /// 4) Composer PDA
    #[account(
        seeds  = [COMPOSER_SEED, &composer.oft_pda.to_bytes()],
        bump   = composer.bump,
    )]
    pub composer: Account<'info, Composer>,

    /// 5) Raydium CLMM CPI program
    pub clmm_program: Program<'info, RaydiumClmm>,

    /// 6) Raydium AMM config
    #[account(address = composer.amm_config)]
    pub amm_config: Box<Account<'info, AmmConfig>>,

    /// 7) Raydium PoolState (writable)
    pub pool_state: AccountLoader<'info, PoolState>,

    /// 8) User’s ATA for input token (writable)
    pub input_token_account: Box<InterfaceAccount<'info, TokenAccount>>,

    /// 9) User’s ATA for output token (writable)
    pub output_token_account: Box<InterfaceAccount<'info, TokenAccount>>,

    /// 10) Pool vault A (writable)
    pub input_vault: Box<InterfaceAccount<'info, TokenAccount>>,

    /// 11) Pool vault B (writable)
    pub output_vault: Box<InterfaceAccount<'info, TokenAccount>>,

    /// 12) Raydium ObservationState (writable)
    pub observation_state: AccountLoader<'info, ObservationState>,

    /// 13) Raydium TickBitmap (writable)
    pub tick_bitmap: AccountInfo<'info>,

    /// 14) Raydium TickArrayLower (writable)
    pub tick_array_lower: AccountInfo<'info>,

    /// 15) Raydium TickArrayCurrent (writable)
    pub tick_array_current: AccountInfo<'info>,

    /// 16) Raydium TickArrayUpper (writable)
    pub tick_array_upper: AccountInfo<'info>,

    /// 17) SPL Memo program (for the swap)
    #[account(address = spl_memo::id())]
    pub memo_program: UncheckedAccount<'info>,

    /// 18) Vault A mint
    pub input_vault_mint: Box<InterfaceAccount<'info, Mint>>,

    /// 19) Vault B mint
    pub output_vault_mint: Box<InterfaceAccount<'info, Mint>>,
}

impl<'info> LzComposeTypes<'info> {
    pub fn apply(
        ctx: &Context<LzComposeTypes>,
        params: &LzComposeParams,
    ) -> Result<Vec<LzAccount>> {
        let a = &ctx.accounts;

        // reserve for 18 static + 6 clear_compose
        let mut accounts = Vec::with_capacity(18 + 6);

        // ─── Static Pubkeys (slots 0–19) ──────────────────────────────
        // 0) payer placeholder
        accounts.push(LzAccount {
            pubkey: Pubkey::default(),
            is_signer: true,
            is_writable: true,
        });
        // 1) endpoint program
        accounts.push(LzAccount {
            pubkey: a.endpoint_program.key(),
            is_signer: false,
            is_writable: false,
        });
        // 2) token_program v1
        accounts.push(LzAccount {
            pubkey: a.token_program.key(),
            is_signer: false,
            is_writable: false,
        });
        // 3) token_program v2 (2022)
        accounts.push(LzAccount {
            pubkey: a.token_program_2022.key(),
            is_signer: false,
            is_writable: false,
        });
        // 4) composer PDA
        accounts.push(LzAccount {
            pubkey: a.composer.key(),
            is_signer: false,
            is_writable: true,
        });
        // 5) CLMM program
        accounts.push(LzAccount {
            pubkey: a.clmm_program.key(),
            is_signer: false,
            is_writable: false,
        });
        // 6) AMM config
        accounts.push(LzAccount {
            pubkey: a.amm_config.key(),
            is_signer: false,
            is_writable: false,
        });
        // 7) PoolState
        accounts.push(LzAccount {
            pubkey: a.pool_state.key(),
            is_signer: false,
            is_writable: true,
        });
        // 8) user ATA A
        accounts.push(LzAccount {
            pubkey: a.input_token_account.key(),
            is_signer: false,
            is_writable: true,
        });
        // 9) user ATA B
        accounts.push(LzAccount {
            pubkey: a.output_token_account.key(),
            is_signer: false,
            is_writable: true,
        });
        // 10) input_vault
        accounts.push(LzAccount {
            pubkey: a.input_vault.key(),
            is_signer: false,
            is_writable: true,
        });
        // 11) output_vault
        accounts.push(LzAccount {
            pubkey: a.output_vault.key(),
            is_signer: false,
            is_writable: true,
        });
        // 12) observation_state
        accounts.push(LzAccount {
            pubkey: a.observation_state.key(),
            is_signer: false,
            is_writable: true,
        });
        // 13) tick_bitmap
        accounts.push(LzAccount {
            pubkey: a.tick_bitmap.key(),
            is_signer: false,
            is_writable: true,
        });
        // 14) tick_array_lower
        accounts.push(LzAccount {
            pubkey: a.tick_array_lower.key(),
            is_signer: false,
            is_writable: true,
        });
        // 15) tick_array_current
        accounts.push(LzAccount {
            pubkey: a.tick_array_current.key(),
            is_signer: false,
            is_writable: true,
        });
        // 16) tick_array_upper
        accounts.push(LzAccount {
            pubkey: a.tick_array_upper.key(),
            is_signer: false,
            is_writable: true,
        });
        // 17) SPL Memo
        accounts.push(LzAccount {
            pubkey: spl_memo::id(),
            is_signer: false,
            is_writable: false,
        });
        // 18) vault A mint
        accounts.push(LzAccount {
            pubkey: a.input_vault_mint.key(),
            is_signer: false,
            is_writable: false,
        });
        // 19) vault B mint
        accounts.push(LzAccount {
            pubkey: a.output_vault_mint.key(),
            is_signer: false,
            is_writable: false,
        });
        // 20) to_address (the ultimate receiver, from params.to)
        accounts.push(LzAccount {
            pubkey: params.to,
            is_signer: false,
            is_writable: true,
        });

        // 21) to_token_account (their ATA for token B)
        let to_ata = anchor_spl::associated_token::get_associated_token_address(
            &params.to,
            &a.output_vault_mint.key(),
        );
        accounts.push(LzAccount {
            pubkey: to_ata,
            is_signer: false,
            is_writable: true,
        });

        // 22) Associated Token program
        accounts.push(LzAccount {
            pubkey: anchor_spl::associated_token::ID,
            is_signer: false,
            is_writable: false,
        });

        // 23) System program
        accounts.push(LzAccount {
            pubkey: anchor_lang::solana_program::system_program::ID,
            is_signer: false,
            is_writable: false,
        });

        // 24) Rent sysvar
        accounts.push(LzAccount {
            pubkey: anchor_lang::solana_program::sysvar::rent::ID,
            is_signer: false,
            is_writable: false,
        });

        // ─── LayerZero clear_compose (slots 20–25) ────────────────────
        let mut extra = get_accounts_for_clear_compose(
            ctx.accounts.endpoint_program.key(),
            &params.from,
            &ctx.accounts.composer.key(),
            &params.guid,
            params.index,
            &params.message,
        );
        accounts.append(&mut extra);

        Ok(accounts)
    }
}
