use crate::*;
use anchor_lang::prelude::*;
use anchor_spl::token::{Token};
use anchor_spl::token_interface::{Token2022, TokenAccount, Mint};
use anchor_spl::associated_token::AssociatedToken;

use raydium_clmm_cpi::cpi::accounts::SwapSingleV2;
use raydium_clmm_cpi::cpi::swap_v2;
use raydium_clmm_cpi::{
    program::RaydiumClmm,
    states::{AmmConfig, ObservationState, PoolState},
};

use oapp::endpoint::{instructions::ClearComposeParams, ID as ENDPOINT_ID};
use oapp::endpoint_cpi::clear_compose;
use oapp::LzComposeParams;

use spl_memo;

#[derive(Accounts)]
#[instruction(params: LzComposeParams)]
pub struct LzCompose<'info> {
    // Use the stored "oft" field as the unique seed.
    #[account(
        mut,
        seeds = [COMPOSER_SEED, &composer.oft.to_bytes()],
        bump = composer.bump
    )]
    pub composer: Account<'info, Composer>,

    pub clmm_program: Program<'info, RaydiumClmm>,
    /// The user performing the swap.
    /// The end-user or intermediary paying for this swap and transaction fees.
    /// Must be mutable because we fund the ATA creation below.
    #[account(mut)]
    pub payer: Signer<'info>,

    /// The factory state to read protocol fees.
    #[account(address = pool_state.load()?.amm_config)]
    pub amm_config: Box<Account<'info, AmmConfig>>,

    /// The program account of the pool in which the swap will be performed.
    #[account(mut)]
    pub pool_state: AccountLoader<'info, PoolState>,

    /// The user token account for input token.
    #[account(mut)]
    pub input_token_account: Box<InterfaceAccount<'info, TokenAccount>>,

    /// The user token account for output token.
    #[account(mut)]
    pub output_token_account: Box<InterfaceAccount<'info, TokenAccount>>,

    /// The vault token account for input token.
    #[account(mut)]
    pub input_vault: Box<InterfaceAccount<'info, TokenAccount>>,

    /// The vault token account for output token.
    #[account(mut)]
    pub output_vault: Box<InterfaceAccount<'info, TokenAccount>>,

    /// The program account for the most recent oracle observation.
    #[account(mut, address = pool_state.load()?.observation_key)]
    pub observation_state: AccountLoader<'info, ObservationState>,

    /// SPL program for token transfers.
    pub token_program: Program<'info, Token>,

    /// SPL program 2022 for token transfers.
    pub token_program_2022: Program<'info, Token2022>,

    /// CHECK: Must match spl_memo::id().
    #[account(address = spl_memo::id())]
    pub memo_program: UncheckedAccount<'info>,

    /// The mint of the input token vault.
    #[account(address = input_vault.mint)]
    pub input_vault_mint: Box<InterfaceAccount<'info, Mint>>,

    /// The mint of the output token vault.
    #[account(address = output_vault.mint)]
    pub output_vault_mint: Box<InterfaceAccount<'info, Mint>>,

    // Extra accounts required by the CPI.
    /// The bitmap extension account for this pool’s tick arrays
    #[account(mut)]
    pub tick_bitmap: AccountInfo<'info>,
    /// Tick arrays for the swap range.
    #[account(mut)]
    pub tick_array_lower: AccountInfo<'info>,
    #[account(mut)]
    pub tick_array_current: AccountInfo<'info>,
    #[account(mut)]
    pub tick_array_upper: AccountInfo<'info>,
    
    /// CHECK: Will be validated in `apply()` against the payload.
    #[account(mut)]
    pub to_address: UncheckedAccount<'info>,

    /// The recipient’s ATA for the output mint.  
    /// If it doesn’t exist, Anchor will create it, funded by `payer`.
    #[account(
      init_if_needed,
      payer = payer,
      associated_token::mint = output_vault_mint,
      associated_token::authority = to_address,
      associated_token::token_program = token_program
    )]
    pub to_token_account: Box<InterfaceAccount<'info, TokenAccount>>,

    /// Anchor needs these to create an ATA if missing:
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

impl LzCompose<'_> {
    pub fn apply(ctx: &mut Context<LzCompose>, params: &LzComposeParams) -> Result<()> {
        // Validate that the message is coming from the expected OFT and addressed to this composer.
        require!(params.from == ctx.accounts.composer.oft, ComposerError::InvalidFrom);
        require!(params.to == ctx.accounts.composer.key(), ComposerError::InvalidTo);

        let msg = &params.message;
        // Decode input amount from bytes 32..40.
        let amount_ld = u64::from_be_bytes(msg[32..40].try_into().unwrap());
        let mut compose_from = [0u8; 32];
        compose_from.copy_from_slice(&msg[40..72]);
        let inner = &msg[72..];
        let min_amount_out = u64::from_be_bytes(inner[0..8].try_into().unwrap());
        let receiver = Pubkey::new_from_array(inner[8..40].try_into().unwrap());
        require_keys_eq!(
            ctx.accounts.to_address.key(),
            receiver,
            ComposerError::InvalidTo
        );

        // Build CPI accounts struct.
        let cpi_accounts = SwapSingleV2 {
            payer: ctx.accounts.payer.to_account_info(),
            amm_config: ctx.accounts.amm_config.to_account_info(),
            pool_state: ctx.accounts.pool_state.to_account_info(),
            input_token_account: ctx.accounts.input_token_account.to_account_info(),
            output_token_account: ctx.accounts.to_token_account.to_account_info(),
            input_vault: ctx.accounts.input_vault.to_account_info(),
            output_vault: ctx.accounts.output_vault.to_account_info(),
            observation_state: ctx.accounts.observation_state.to_account_info(),
            token_program: ctx.accounts.token_program.to_account_info(),
            token_program_2022: ctx.accounts.token_program_2022.to_account_info(),
            memo_program: ctx.accounts.memo_program.to_account_info(),
            input_vault_mint: ctx.accounts.input_vault_mint.to_account_info(),
            output_vault_mint: ctx.accounts.output_vault_mint.to_account_info(),
        };

        let mut cpi_ctx = CpiContext::new(ctx.accounts.clmm_program.to_account_info(), cpi_accounts);
        cpi_ctx = cpi_ctx.with_remaining_accounts(vec![
            ctx.accounts.tick_bitmap.to_account_info(),
            ctx.accounts.tick_array_lower.to_account_info(),
            ctx.accounts.tick_array_current.to_account_info(),
            ctx.accounts.tick_array_upper.to_account_info(),
        ]);

        swap_v2(cpi_ctx, amount_ld, min_amount_out, 0u128, true)?;

        // Use the stored "oft" field as the seed.
        let seeds: &[&[u8]] = &[
            COMPOSER_SEED,
            &ctx.accounts.composer.oft.to_bytes(),
            &[ctx.accounts.composer.bump],
        ];

        let clear_params = ClearComposeParams {
            from: params.from,
            guid: params.guid,
            index: params.index,
            message: params.message.clone(),
        };

        clear_compose(
            ENDPOINT_ID,
            ctx.accounts.composer.key(),
            &ctx.remaining_accounts,
            seeds,
            clear_params,
        )
    }
}
