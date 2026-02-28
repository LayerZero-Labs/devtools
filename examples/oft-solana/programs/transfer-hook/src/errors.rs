//! Transfer Hook error codes
//!
//! Define custom errors that can be returned from the transfer hook.
//! These will cause the Token-2022 transfer to revert.

use anchor_lang::prelude::error_code;

#[error_code]
pub enum HookError {
    /// Transfer amount must meet the minimum threshold.
    /// This is a placeholder error for the example; replace with your logic.
    #[msg("Transfer amount must be at least 100")]
    AmountTooSmall,

    // =========================================================================
    // Example errors for a compliance-focused Transfer Hook:
    // =========================================================================

    // /// Global pause is active - all transfers blocked
    // #[msg("Transfers are paused")]
    // Paused,

    // /// Source address is on the blocklist
    // #[msg("Source address is blocked")]
    // SourceBlocked,

    // /// Destination address is on the blocklist
    // #[msg("Destination address is blocked")]
    // DestinationBlocked,

    // /// Delegate (spender) is on the blocklist
    // #[msg("Delegate is blocked")]
    // DelegateBlocked,

    // /// Address not on the allowlist (for whitelist mode)
    // #[msg("Address not on allowlist")]
    // NotOnAllowlist,
}
