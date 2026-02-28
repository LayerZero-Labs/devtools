//! Transfer Hook execute instruction
//!
//! This is where your custom transfer validation logic lives.
//! Token-2022 invokes this on every `transfer_checked` call.

use anchor_lang::prelude::*;

use crate::errors::HookError;
use crate::EXTRA_ACCOUNT_METAS_SEED;

/// Accounts for the Transfer Hook execute instruction.
///
/// These are the standard accounts passed by Token-2022 when invoking
/// a transfer hook. The order and types are defined by the SPL interface.
///
/// Note: All accounts are `UncheckedAccount` because Token-2022 has already
/// validated them. We use seeds constraints for the PDAs we own.
#[derive(Accounts)]
pub struct TransferHookExecute<'info> {
    /// The source token account (tokens are being transferred FROM here).
    /// CHECK: Validated by Token-2022 Program
    pub source: UncheckedAccount<'info>,

    /// The token mint.
    /// CHECK: Validated by Token-2022 Program
    pub mint: UncheckedAccount<'info>,

    /// The destination token account (tokens are being transferred TO here).
    /// CHECK: Validated by Token-2022 Program
    pub destination: UncheckedAccount<'info>,

    /// The authority signing the transfer.
    ///
    /// This is either:
    /// - The source token account owner (direct transfer)
    /// - A delegate with approval (delegated transfer)
    /// CHECK: Validated by Token-2022 Program
    pub authority: UncheckedAccount<'info>,

    /// This program's ExtraAccountMetaList PDA.
    ///
    /// Token-2022 verifies this PDA exists and matches expectations.
    /// CHECK: Validated by seeds
    #[account(
        seeds = [EXTRA_ACCOUNT_METAS_SEED, mint.key().as_ref()],
        bump
    )]
    pub extra_account_meta_list: UncheckedAccount<'info>,

    // =========================================================================
    // Add your custom accounts here!
    // =========================================================================
    //
    // For a compliance hook, you might add:
    //
    // /// Token configuration (pause state, allowlist mode)
    // pub token_config: Account<'info, TokenConfig>,
    //
    // /// Source owner's allowlist entry (optional - may not exist)
    // pub source_allowlist: Option<Account<'info, AllowlistEntry>>,
    //
    // /// Destination owner's allowlist entry (optional)
    // pub dest_allowlist: Option<Account<'info, AllowlistEntry>>,
    //
    // Remember to add these to ExtraAccountMetaList in initialize.rs!
}

impl TransferHookExecute<'_> {
    /// Validate the transfer and return Ok(()) to allow or Err to reject.
    ///
    /// This is the core of your transfer hook - add your custom logic here.
    ///
    /// # Arguments
    /// - `ctx`: The instruction context with all accounts
    /// - `amount`: Raw transfer amount (not decimal-adjusted)
    ///
    /// # Returns
    /// - `Ok(())`: Transfer is allowed
    /// - `Err(...)`: Transfer is rejected, entire transaction reverts
    ///
    /// # Example Use Cases
    ///
    /// **Compliance/Allowlist:**
    /// ```ignore
    /// // Check if source owner is blocked
    /// if is_blocked(source_owner) {
    ///     return Err(HookError::SourceBlocked.into());
    /// }
    /// ```
    ///
    /// **Royalty Enforcement:**
    /// ```ignore
    /// // Verify royalty payment exists in the transaction
    /// if !royalty_paid() {
    ///     return Err(HookError::RoyaltyNotPaid.into());
    /// }
    /// ```
    ///
    /// **Transfer Limits:**
    /// ```ignore
    /// // Check daily transfer limit
    /// if daily_transfers + amount > DAILY_LIMIT {
    ///     return Err(HookError::DailyLimitExceeded.into());
    /// }
    /// ```
    pub fn apply(_ctx: &Context<TransferHookExecute>, amount: u64) -> Result<()> {
        msg!("Transfer Hook: validating transfer of {} tokens", amount);

        // =====================================================================
        // YOUR VALIDATION LOGIC HERE
        // =====================================================================
        //
        // This example uses a simple threshold check.
        // Replace with your actual business logic.
        //
        // Common patterns:
        //
        // 1. Allowlist/Blocklist check:
        //    let source_owner = get_token_account_owner(&ctx.accounts.source);
        //    require!(!is_blocked(source_owner), HookError::SourceBlocked);
        //
        // 2. Pause check:
        //    require!(!config.paused, HookError::Paused);
        //
        // 3. OFT/Bridge bypass (skip checks for trusted programs):
        //    if ctx.accounts.source.key() == trusted_program {
        //        return Ok(());
        //    }
        //
        // =====================================================================

        // Example: Only allow transfers of 100 or more raw tokens
        require!(amount >= 100, HookError::AmountTooSmall);

        msg!("Transfer Hook: transfer approved");
        Ok(())
    }
}
