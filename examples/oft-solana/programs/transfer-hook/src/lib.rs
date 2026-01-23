//! # Token-2022 Transfer Hook Example
//!
//! This program demonstrates how to implement a Transfer Hook for Token-2022 tokens.
//! Transfer Hooks allow custom validation logic to be executed on every token transfer,
//! enabling use cases like:
//!
//! - **Compliance**: Allowlist/blocklist enforcement for regulated tokens
//! - **Royalties**: Enforcing royalty payments on NFT transfers
//! - **Transfer restrictions**: Time-locks, vesting schedules, etc.
//!
//! ## Architecture
//!
//! The Transfer Hook integrates with Token-2022's transfer flow:
//!
//! ```text
//! User calls transfer_checked()
//!          │
//!          ▼
//! Token-2022 validates (balance, decimals)
//!          │
//!          ▼
//! Token-2022 invokes Transfer Hook Program ◄── This program
//!          │
//!          ▼
//! Hook validates (compliance, allowlist, etc.)
//!          │
//!          ▼
//! Transfer completes (or reverts)
//! ```
//!
//! ## Key Components
//!
//! - **ExtraAccountMetaList**: PDA that declares additional accounts the hook needs
//! - **fallback instruction**: Bridges SPL instruction format to Anchor handlers
//! - **transfer_hook instruction**: Contains the actual validation logic
//!
//! ## Example Usage
//!
//! This example implements a simple threshold check (transfers must be > 100 tokens).
//! In production, you would replace this with your compliance logic.
//!
//! ## References
//!
//! - [Solana Transfer Hook Guide](https://solana.com/developers/guides/token-extensions/transfer-hook)
//! - [Token-2022 Docs](https://spl.solana.com/token-2022)

#![allow(deprecated)] // Anchor 0.31 internal uses deprecated AccountInfo::realloc

use anchor_lang::prelude::*;
use spl_transfer_hook_interface::instruction::TransferHookInstruction;

pub mod errors;
pub mod instructions;

use instructions::*;

declare_id!("Hook111111111111111111111111111111111111111");

/// Seed for the ExtraAccountMetaList PDA
pub const EXTRA_ACCOUNT_METAS_SEED: &[u8] = b"extra-account-metas";

/// Transfer Hook Program
///
/// Implements the Token-2022 Transfer Hook interface for custom transfer validation.
/// This example demonstrates the boilerplate required for any Transfer Hook,
/// with a placeholder validation rule (amount > 100).
#[program]
pub mod transfer_hook {
    use super::*;

    /// Initialize the ExtraAccountMetaList PDA for this hook.
    ///
    /// Must be called once per mint after creating a Token-2022 mint with the
    /// Transfer Hook extension pointing to this program. This PDA declares
    /// which additional accounts the hook needs during transfer execution.
    ///
    /// # Accounts
    /// - `payer`: Pays for account creation (rent)
    /// - `mint`: The Token-2022 mint with Transfer Hook extension
    /// - `extra_account_meta_list`: PDA to be created
    /// - `system_program`: For account creation
    pub fn initialize_extra_account_meta_list(mut ctx: Context<Initialize>) -> Result<()> {
        Initialize::apply(&mut ctx)
    }

    /// Transfer Hook execute - validates transfers against custom rules.
    ///
    /// Called by Token-2022 on every `transfer_checked` or `transfer_checked_with_fee`.
    /// Return `Ok(())` to allow the transfer, or an error to reject it.
    ///
    /// # Arguments
    /// - `amount`: The transfer amount in raw token units (not decimal-adjusted)
    ///
    /// # Accounts
    /// - `source`: Source token account
    /// - `mint`: Token mint
    /// - `destination`: Destination token account
    /// - `authority`: The authority (signer) for the transfer
    /// - `extra_account_meta_list`: This program's ExtraAccountMetaList PDA
    pub fn transfer_hook(ctx: Context<TransferHookExecute>, amount: u64) -> Result<()> {
        TransferHookExecute::apply(&ctx, amount)
    }

    /// Fallback handler for SPL Transfer Hook interface.
    ///
    /// Token-2022 uses the SPL instruction format (8-byte discriminator from
    /// `spl_transfer_hook_interface`), not Anchor's format. This fallback
    /// intercepts unknown instructions, unpacks the SPL discriminator, and
    /// routes to our Anchor `transfer_hook` handler.
    ///
    /// This is required boilerplate for any Anchor-based Transfer Hook.
    ///
    /// # How it works
    /// 1. Token-2022 invokes this program with SPL discriminator
    /// 2. Anchor doesn't recognize it, calls `fallback`
    /// 3. We unpack using `TransferHookInstruction::unpack`
    /// 4. Route to `transfer_hook` via Anchor's internal dispatch
    ///
    /// # Reference
    /// [Solana Transfer Hook Guide](https://solana.com/developers/guides/token-extensions/transfer-hook)
    pub fn fallback<'info>(
        program_id: &Pubkey,
        accounts: &'info [AccountInfo<'info>],
        data: &[u8],
    ) -> Result<()> {
        let instruction = TransferHookInstruction::unpack(data)?;

        match instruction {
            TransferHookInstruction::Execute { amount } => {
                let amount_bytes = amount.to_le_bytes();
                __private::__global::transfer_hook(program_id, accounts, &amount_bytes)
            }
            _ => Err(ProgramError::InvalidInstructionData.into()),
        }
    }
}
