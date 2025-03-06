use crate::*;
use anchor_spl::token_interface::{self, Mint, TokenAccount, TokenInterface, TransferChecked};

/// Accounts required for withdrawing fee tokens from the OFT escrow.
///
/// This instruction allows the admin to withdraw accumulated fees from the token escrow account,
/// while ensuring that the total value locked (TVL) remains intact.
#[derive(Accounts)]
pub struct WithdrawFee<'info> {
    // The admin must sign the transaction to withdraw fees.
    pub admin: Signer<'info>,

    // The OFTStore account holds the configuration, state, and fee settings for the OFT.
    // It is derived using a seed composed of a constant (OFT_SEED) and the token escrow address.
    // The `has_one = admin` constraint ensures that only the current admin can perform fee withdrawals.
    #[account(
        seeds = [OFT_SEED, oft_store.token_escrow.as_ref()],
        bump = oft_store.bump,
        has_one = admin @OFTError::Unauthorized
    )]
    pub oft_store: Account<'info, OFTStore>,

    // The token mint for the OFT. Its address must match the one stored in the OFTStore.
    #[account(
        address = oft_store.token_mint,
        mint::token_program = token_program
    )]
    pub token_mint: InterfaceAccount<'info, Mint>,

    // The token escrow account holds tokens temporarily for cross-chain operations.
    // This account is controlled by the OFTStore (i.e., its authority is the OFTStore).
    // It must have enough balance (after preserving TVL) to cover the fee withdrawal.
    #[account(
        mut,
        address = oft_store.token_escrow,
        token::authority = oft_store,
        token::mint = token_mint,
        token::token_program = token_program
    )]
    pub token_escrow: InterfaceAccount<'info, TokenAccount>,

    // The destination token account where the fee tokens will be transferred.
    // This account is mutable and must be associated with the token mint.
    #[account(
        mut,
        token::mint = token_mint,
        token::token_program = token_program
    )]
    pub token_dest: InterfaceAccount<'info, TokenAccount>,

    // The token program interface (SPL Token interface) used to perform token transfers.
    pub token_program: Interface<'info, TokenInterface>,
}

impl WithdrawFee<'_> {
    /// Applies the WithdrawFee instruction.
    ///
    /// This function performs the following steps:
    /// 1. Validates that the token escrow has sufficient balance after preserving the TVL.
    /// 2. Derives the PDA seeds required to authorize the transfer from the escrow.
    /// 3. Calls the token program's `transfer_checked` CPI to move the specified fee amount from
    ///    the escrow account to the destination token account.
    /// 4. Returns Ok(()) upon successful transfer.
    pub fn apply(ctx: &mut Context<WithdrawFee>, params: &WithdrawFeeParams) -> Result<()> {
        // Ensure that the token escrow balance minus the locked TVL is sufficient to cover the fee.
        require!(
            ctx.accounts.token_escrow.amount - ctx.accounts.oft_store.tvl_ld >= params.fee_ld,
            OFTError::InvalidFee
        );

        // Derive the PDA seeds for signing with the OFTStore.
        let seeds: &[&[u8]] = &[
            OFT_SEED,
            &ctx.accounts.token_escrow.key().to_bytes(),
            &[ctx.accounts.oft_store.bump],
        ];

        // Call the transfer_checked CPI to transfer fee tokens from the escrow to the destination account.
        token_interface::transfer_checked(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                TransferChecked {
                    from: ctx.accounts.token_escrow.to_account_info(),
                    mint: ctx.accounts.token_mint.to_account_info(),
                    to: ctx.accounts.token_dest.to_account_info(),
                    authority: ctx.accounts.oft_store.to_account_info(),
                },
            )
            .with_signer(&[&seeds]),
            params.fee_ld,               // The fee amount to withdraw (in local decimals)
            ctx.accounts.token_mint.decimals, // The decimals of the token mint
        )?;
        Ok(())
    }
}

/// Parameters for the WithdrawFee instruction.
///
/// `fee_ld` specifies the fee amount (in local decimals) to withdraw from the escrow.
#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
pub struct WithdrawFeeParams {
    pub fee_ld: u64,
}
