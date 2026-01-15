//! Initialize ExtraAccountMetaList instruction
//!
//! This instruction creates the ExtraAccountMetaList PDA, which tells Token-2022
//! which additional accounts to include when invoking the transfer hook.

use anchor_lang::{
    prelude::*,
    system_program::{create_account, CreateAccount},
};
use anchor_spl::token_interface::Mint;
use spl_tlv_account_resolution::{account::ExtraAccountMeta, state::ExtraAccountMetaList};
use spl_transfer_hook_interface::instruction::ExecuteInstruction;

use crate::EXTRA_ACCOUNT_METAS_SEED;

/// Accounts for initializing the ExtraAccountMetaList PDA.
///
/// This must be called once per mint after creating a Token-2022 mint with
/// the Transfer Hook extension pointing to this program.
#[derive(Accounts)]
pub struct Initialize<'info> {
    /// The account paying for PDA creation (rent).
    #[account(mut)]
    pub payer: Signer<'info>,

    /// The Token-2022 mint with Transfer Hook extension.
    ///
    /// This must already exist and have its Transfer Hook extension
    /// configured to point to this program.
    #[account(mint::token_program = anchor_spl::token_2022::ID)]
    pub mint: InterfaceAccount<'info, Mint>,

    /// The ExtraAccountMetaList PDA to be created.
    ///
    /// Seeds: `["extra-account-metas", mint.key()]`
    ///
    /// This account stores a list of `ExtraAccountMeta` entries that tell
    /// Token-2022 which additional accounts to include when invoking the hook.
    #[account(
        mut,
        seeds = [EXTRA_ACCOUNT_METAS_SEED, mint.key().as_ref()],
        bump,
    )]
    /// CHECK: Created in this instruction
    pub extra_account_meta_list: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

impl Initialize<'_> {
    /// Create and initialize the ExtraAccountMetaList PDA.
    ///
    /// The ExtraAccountMetaList declares additional accounts that Token-2022
    /// should include when invoking the transfer hook. These can be:
    /// - Static accounts (fixed pubkeys)
    /// - PDAs derived from known seeds
    /// - Dynamic accounts resolved from other account data
    ///
    /// For this example, we don't need any extra accounts beyond the standard
    /// transfer hook accounts (source, mint, destination, authority).
    pub fn apply(ctx: &mut Context<Initialize>) -> Result<()> {
        // Define the extra accounts your hook needs.
        // This example doesn't need any, but you could add:
        //
        // - Config PDA: ExtraAccountMeta::new_with_seeds(...)
        // - Allowlist entries: ExtraAccountMeta::new_external_pda_with_seeds(...)
        //
        // See spl_tlv_account_resolution docs for all options.
        let extra_account_metas: Vec<ExtraAccountMeta> = vec![];

        // Calculate space and rent for the account
        let account_size = ExtraAccountMetaList::size_of(extra_account_metas.len())?;
        let lamports = Rent::get()?.minimum_balance(account_size);

        let mint_key = ctx.accounts.mint.key();
        let signer_seeds: &[&[&[u8]]] = &[&[
            EXTRA_ACCOUNT_METAS_SEED,
            mint_key.as_ref(),
            &[ctx.bumps.extra_account_meta_list],
        ]];

        // Create the ExtraAccountMetaList account as a PDA
        create_account(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                CreateAccount {
                    from: ctx.accounts.payer.to_account_info(),
                    to: ctx.accounts.extra_account_meta_list.to_account_info(),
                },
                signer_seeds,
            ),
            lamports,
            account_size as u64,
            ctx.program_id,
        )?;

        // Initialize the account data with our extra account list
        let mut data = ctx.accounts.extra_account_meta_list.try_borrow_mut_data()?;
        ExtraAccountMetaList::init::<ExecuteInstruction>(&mut data, &extra_account_metas)?;

        msg!(
            "Transfer Hook: ExtraAccountMetaList initialized for mint {}",
            mint_key
        );
        Ok(())
    }
}
