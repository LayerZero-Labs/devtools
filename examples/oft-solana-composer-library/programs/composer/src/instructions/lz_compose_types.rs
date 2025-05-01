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
    // === Raydium CLMM accounts ===
    /// The on‐chain Raydium CLMM program itself, used for the CPI into `swap_v2`.
    pub clmm_program: Program<'info, RaydiumClmm>,

    /// The SPL‐compatible token program (v1) used by Raydium for transfers.
    pub token_program: Program<'info, Token>,
    /// The SPL‐compatible token program (v2) used by Raydium for transfers.
    pub token_program_2022: Program<'info, Token2022>,
    /// The SPL Memo program for attaching arbitrary memos to the swap CPI.
    #[account(address = spl_memo::id())]
    pub memo_program: UncheckedAccount<'info>,

    /// Raydium AMM configuration (fees, tick spacing, etc). Must match `pool_state.load()?.amm_config`.
    #[account(address = pool_state.load()?.amm_config)]
    pub amm_config: Box<Account<'info, AmmConfig>>,

    /// The on‐chain pool state PDA, which holds the current price, liquidity, and fee growth.
    pub pool_state: AccountLoader<'info, PoolState>,

    /// The “vault” token account for token A (input token) belonging to the pool.
    #[account(mut)]
    pub input_vault: Box<InterfaceAccount<'info, TokenAccount>>,
    /// The “vault” token account for token B (output token) belonging to the pool.
    #[account(mut)]
    pub output_vault: Box<InterfaceAccount<'info, TokenAccount>>,

    /// The SPL‐Token Mint for the input vault (must equal `input_vault.mint`).
    #[account(address = input_vault.mint)]
    pub input_vault_mint: Box<InterfaceAccount<'info, Mint>>,
    /// The SPL‐Token Mint for the output vault (must equal `output_vault.mint`).
    #[account(address = output_vault.mint)]
    pub output_vault_mint: Box<InterfaceAccount<'info, Mint>>,

    /// The oracle observation state PDA for the pool’s price oracle.
    #[account(address = pool_state.load()?.observation_key)]
    pub observation_state: AccountLoader<'info, ObservationState>,

    /// The three tick‐array PDAs covering the price range for this swap.
    #[account(mut)]
    pub tick_array_lower: AccountInfo<'info>,
    #[account(mut)]
    pub tick_array_current: AccountInfo<'info>,
    #[account(mut)]
    pub tick_array_upper: AccountInfo<'info>,

    /// The bitmap extension account that tracks which tick arrays are initialized.
    #[account(mut)]
    pub tick_bitmap: AccountInfo<'info>,

    /// The end‐user’s token account for deposit (must be an ATA for the input mint).
    #[account(mut)]
    pub input_token_account: Box<InterfaceAccount<'info, TokenAccount>>,
    /// The end‐user’s token account for withdrawal (must be an ATA for the output mint).
    #[account(mut)]
    pub output_token_account: Box<InterfaceAccount<'info, TokenAccount>>,

    /// === LayerZero composer / endpoint accounts ===
    /// The LayerZero endpoint program ID (used for the final `clear_compose` CPI).
    /// Anchor will not enforce it, but the CPI macro checks it at runtime.
    pub lz_program: AccountInfo<'info>,

    /// The signer paying for this transaction (also used as Raydium swap payer).
    pub payer: Signer<'info>,
}

impl LzComposeTypes<'_> {
    /// Build the ordered `Vec<LzAccount>` listing:
    ///  1. All Raydium CPI accounts (payer, amm_config, pool_state, vaults, tick arrays, etc.)
    ///  2. All extra LayerZero “clear compose” accounts (`send_compose`/`clear_compose` machinery).
    ///
    /// The returned accounts vector is passed into `clear_compose` so that the endpoint
    /// program can verify the message (guid, index, from, to, etc.) and mark it consumed.
    pub fn apply(
        ctx: &Context<LzComposeTypes>,
        params: &LzComposeParams,
    ) -> Result<Vec<LzAccount>> {
        let mut accounts = Vec::new();

        // --- Raydium base accounts for `swap_v2` CPI ---
        // 1) Who pays the swap fees / funds any borrow
        accounts.push(LzAccount {
            pubkey: ctx.accounts.payer.key(),
            is_signer: true,
            is_writable: false,
        });
        // 2) AMM config holding fee parameters
        accounts.push(LzAccount {
            pubkey: ctx.accounts.amm_config.key(),
            is_signer: false,
            is_writable: false,
        });
        // 3) Pool state (price, liquidity)
        accounts.push(LzAccount {
            pubkey: ctx.accounts.pool_state.key(),
            is_signer: false,
            is_writable: true,
        });
        // 4) User token account for input
        accounts.push(LzAccount {
            pubkey: ctx.accounts.input_token_account.key(),
            is_signer: false,
            is_writable: true,
        });
        // 5) User token account for output
        accounts.push(LzAccount {
            pubkey: ctx.accounts.output_token_account.key(),
            is_signer: false,
            is_writable: true,
        });
        // 6) Vault for input token
        accounts.push(LzAccount {
            pubkey: ctx.accounts.input_vault.key(),
            is_signer: false,
            is_writable: true,
        });
        // 7) Vault for output token
        accounts.push(LzAccount {
            pubkey: ctx.accounts.output_vault.key(),
            is_signer: false,
            is_writable: true,
        });
        // 8) Oracle observation
        accounts.push(LzAccount {
            pubkey: ctx.accounts.observation_state.key(),
            is_signer: false,
            is_writable: true,
        });
        // 9) Tick arrays that cover the swap’s price range
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

        // --- LayerZero clear_compose accounts (replay protection) ---
        let mut extra_accounts = get_accounts_for_clear_compose(
            ENDPOINT_ID,
            &params.from,                // the “sender” OFT address
            &ctx.accounts.lz_program.key(), // the endpoint program ID
            &params.guid,                // message GUID
            params.index,                // sequence index
            &params.message,             // raw payload bytes
        );
        accounts.append(&mut extra_accounts);

        Ok(accounts)
    }
}
