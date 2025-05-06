use crate::state::composer::ComposerError;
use crate::*;
use oapp::endpoint::program::Endpoint;

use anchor_lang::prelude::*;
use anchor_spl::associated_token::get_associated_token_address;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::Token;
use anchor_spl::token_interface::{Mint, Token2022, TokenAccount};

use raydium_clmm_cpi::cpi::accounts::SwapSingleV2;
use raydium_clmm_cpi::cpi::swap_v2;
use raydium_clmm_cpi::{
    program::RaydiumClmm,
    states::{AmmConfig, ObservationState, PoolState},
};

use oapp::endpoint::{instructions::ClearComposeParams, ID as ENDPOINT_ID};
use oapp::endpoint_cpi::clear_compose;
use oapp::LzComposeParams;

use crate::compose_msg_codec::{amount_ld, compose_msg};

use spl_memo;

#[derive(Accounts)]
#[instruction(params: LzComposeParams)]
pub struct LzCompose<'info> {
    ///  0) The user paying for swap & any ATA creation (will be the signer)
    #[account(mut)]
    pub payer: Signer<'info>,

    ///  1) The LayerZero endpoint program this composer was initialized with
    #[account(address = composer.endpoint_program)]
    pub endpoint_program: Program<'info, Endpoint>,

    ///  2,3) SPL Token programs
    pub token_program: Program<'info, Token>,
    pub token_program_2022: Program<'info, Token2022>,

    ///  4) Our single-PDA storing all the needed pubkeys
    #[account(
        mut,
        seeds = [COMPOSER_SEED, &composer.oft_pda.to_bytes()],
        bump  = composer.bump
    )]
    pub composer: Account<'info, Composer>,

    ///  5–7) Raydium CPI program & state
    pub clmm_program: Program<'info, RaydiumClmm>,
    #[account(address = composer.amm_config)]
    pub amm_config: Box<Account<'info, AmmConfig>>,
    #[account(mut)]
    pub pool_state: AccountLoader<'info, PoolState>,

    ///  8,9) User token ATAs (input=A, output=B)
    #[account(mut)]
    pub input_token_account: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(mut)]
    pub output_token_account: Box<InterfaceAccount<'info, TokenAccount>>,

    /// 10,11) Pool vaults
    #[account(mut)]
    pub input_vault: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(mut)]
    pub output_vault: Box<InterfaceAccount<'info, TokenAccount>>,

    /// 12–16) Price oracle & tick arrays
    #[account(mut, address = composer.observation_state)]
    pub observation_state: AccountLoader<'info, ObservationState>,
    #[account(mut)]
    pub tick_bitmap: AccountInfo<'info>,
    #[account(mut)]
    pub tick_array_lower: AccountInfo<'info>,
    #[account(mut)]
    pub tick_array_current: AccountInfo<'info>,
    #[account(mut)]
    pub tick_array_upper: AccountInfo<'info>,

    /// 17) SPL Memo program (for the swap)
    #[account(address = spl_memo::id())]
    pub memo_program: UncheckedAccount<'info>,

    /// 18,19) Vault mints
    #[account(address = input_vault.mint)]
    pub input_vault_mint: Box<InterfaceAccount<'info, Mint>>,
    #[account(address = output_vault.mint)]
    pub output_vault_mint: Box<InterfaceAccount<'info, Mint>>,

    /// 20) The ultimate receiver of token B
    #[account(mut)]
    pub to_address: UncheckedAccount<'info>,

    /// 21) Receiver’s ATA for token B; init_if_needed if absent
    #[account(
      init_if_needed,
      payer = payer,
      associated_token::mint      = output_vault_mint,
      associated_token::authority = to_address,
      associated_token::token_program = token_program
    )]
    pub to_token_account: Box<InterfaceAccount<'info, TokenAccount>>,

    /// 22) **Associated Token program** — **must** be exactly here
    pub associated_token_program: Program<'info, AssociatedToken>,

    /// 23–24) System & Rent
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

impl LzCompose<'_> {
    pub fn apply(ctx: &mut Context<LzCompose>, params: &LzComposeParams) -> Result<()> {
        // 1) Validate origin & destination
        require!(
            params.from == ctx.accounts.composer.oft_pda,
            ComposerError::InvalidFrom
        );
        require!(
            params.to == ctx.accounts.composer.key(),
            ComposerError::InvalidTo
        );

        // 2) Turn your Vec<u8> into a slice, then pull‐off both parts of the payload:
        let msg = params.message.as_slice();

        // a) the “amount_ld” header (bytes 12..20 of the original message)
        let amount_ld_val = amount_ld(msg);
 
        // b) the post-header “compose_msg” blob (everything from byte 52 onward)
        //    which is exactly the solidityPacked [uint64,bytes32]
        let payload = compose_msg(msg);
 
        // sanity check: that blob *must* be exactly 8+32 = 40 bytes
        require!(payload.len() == 40, ComposerError::Paused);
 
        // c) parse your two JS-packed fields:
        //    • bytes 0..8   = min_amount_out (u64 BE)
        //    • bytes 8..40  = receiver pubkey
        let min_amount_out = u64::from_be_bytes(payload[0..8].try_into().unwrap());
        let receiver       = Pubkey::new_from_array(payload[8..40].try_into().unwrap());

        // check: the client must have passed this same receiver in `to_address`
        require_keys_eq!(
            ctx.accounts.to_address.key(),
            receiver,
            ComposerError::InvalidTo
        );

        // 3) Build Raydium CPI context
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
        let cpi_ctx = CpiContext::new(ctx.accounts.clmm_program.to_account_info(), cpi_accounts)
            .with_remaining_accounts(vec![
                ctx.accounts.tick_bitmap.clone(),
                ctx.accounts.tick_array_lower.clone(),
                ctx.accounts.tick_array_current.clone(),
                ctx.accounts.tick_array_upper.clone(),
            ]);

        // 4) Attempt swap, refund on error
        if let Err(_) = swap_v2(cpi_ctx, amount_ld_val, min_amount_out, 0u128, true) {
            // Refund token A back to receiver’s ATA for mint A
            // (Anchor init_if_needed below ensures the ATA exists)
            let composer_ata = get_associated_token_address(
                &ctx.accounts.composer.key(),
                &ctx.accounts.composer.oft_pda,
            );
            let receiver_ata = get_associated_token_address(
                &ctx.accounts.to_address.key(),
                &ctx.accounts.composer.oft_pda,
            );

            let refund_ix = anchor_spl::token::spl_token::instruction::transfer(
                &ctx.accounts.token_program.key(),
                &composer_ata,
                &receiver_ata,
                &ctx.accounts.composer.key(),
                &[],
                amount_ld_val,
            )?;

            anchor_lang::solana_program::program::invoke_signed(
                &refund_ix,
                &[
                    // composer ATA, receiver ATA, token_program
                    ctx.accounts.composer.to_account_info(),
                    ctx.accounts.to_address.to_account_info(),
                    ctx.accounts.token_program.to_account_info(),
                ],
                &[&[
                    COMPOSER_SEED,
                    &ctx.accounts.composer.oft_pda.to_bytes(),
                    &[ctx.accounts.composer.bump],
                ]],
            )?;
        }

        // 5) Clear the message on success *or* after refund
        let seeds: &[&[u8]] = &[
            COMPOSER_SEED,
            &ctx.accounts.composer.oft_pda.to_bytes(),
            &ctx.accounts.composer.endpoint_pda.to_bytes(), // include endpoint PDA
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
