use crate::*;
use oapp::endpoint::instructions::SetDelegateParams;

/// Accounts required for updating the configuration of the OFT (Omnichain Fungible Token).
///
/// This instruction allows the admin to update one of several configuration settings stored in the OFTStore:
/// - Change the admin address.
/// - Set the delegate for the OApp endpoint (for cross-chain messaging).
/// - Update the default fee (in basis points).
/// - Pause or unpause the OFT.
/// - Set optional pauser and unpauser addresses.
#[derive(Accounts)]
pub struct SetOFTConfig<'info> {
    // The admin account must sign the transaction and must match the admin in the OFTStore.
    pub admin: Signer<'info>,
    // The OFTStore account holds the configuration and state for the OFT.
    // It is a PDA derived using a constant seed and the token escrow account.
    // The `has_one = admin` constraint ensures that only the current admin can modify the configuration.
    #[account(
        mut,
        seeds = [OFT_SEED, oft_store.token_escrow.as_ref()],
        bump = oft_store.bump,
        has_one = admin @OFTError::Unauthorized
    )]
    pub oft_store: Account<'info, OFTStore>,
}

impl SetOFTConfig<'_> {
    /// Applies the configuration update based on the provided parameters.
    ///
    /// This function matches on the configuration parameter variant and updates the OFTStore accordingly:
    /// - **Admin:** Update the admin account.
    /// - **Delegate:** Call the endpoint CPI to set a new delegate for the OApp.
    /// - **DefaultFee:** Update the default fee basis points after validating the fee value.
    /// - **Paused:** Update the paused state of the OFT.
    /// - **Pauser:** Update the optional pauser address.
    /// - **Unpauser:** Update the optional unpauser address.
    pub fn apply(ctx: &mut Context<SetOFTConfig>, params: &SetOFTConfigParams) -> Result<()> {
        match params.clone() {
            // Update the admin address.
            SetOFTConfigParams::Admin(admin) => {
                ctx.accounts.oft_store.admin = admin;
            },
            // Update the delegate for the OApp endpoint via a CPI call.
            SetOFTConfigParams::Delegate(delegate) => {
                // Derive the seeds required to sign the CPI call.
                let oft_store_seed = ctx.accounts.oft_store.token_escrow.key();
                let seeds: &[&[u8]] =
                    &[OFT_SEED, &oft_store_seed.to_bytes(), &[ctx.accounts.oft_store.bump]];
                // Call the endpoint CPI to update the delegate.
                let _ = oapp::endpoint_cpi::set_delegate(
                    ctx.accounts.oft_store.endpoint_program,
                    ctx.accounts.oft_store.key(),
                    &ctx.remaining_accounts,
                    seeds,
                    SetDelegateParams { delegate },
                )?;
            },
            // Update the default fee in basis points.
            SetOFTConfigParams::DefaultFee(fee_bps) => {
                // Ensure the fee is within valid limits.
                require!(fee_bps < MAX_FEE_BASIS_POINTS, OFTError::InvalidFee);
                ctx.accounts.oft_store.default_fee_bps = fee_bps;
            },
            // Update the paused state of the OFT.
            SetOFTConfigParams::Paused(paused) => {
                ctx.accounts.oft_store.paused = paused;
            },
            // Update the optional pauser address.
            SetOFTConfigParams::Pauser(pauser) => {
                ctx.accounts.oft_store.pauser = pauser;
            },
            // Update the optional unpauser address.
            SetOFTConfigParams::Unpauser(unpauser) => {
                ctx.accounts.oft_store.unpauser = unpauser;
            },
        }
        Ok(())
    }
}

/// Parameters for updating the OFT configuration.
///
/// This enum defines the different configuration options that can be updated:
/// - **Admin(Pubkey):** Set a new admin.
/// - **Delegate(Pubkey):** Set a new delegate for the OApp endpoint.
/// - **DefaultFee(u16):** Update the default fee (in basis points).
/// - **Paused(bool):** Pause or unpause the OFT.
/// - **Pauser(Option<Pubkey>):** Optionally set an address with permission to pause the OFT.
/// - **Unpauser(Option<Pubkey>):** Optionally set an address with permission to unpause the OFT.
#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
pub enum SetOFTConfigParams {
    Admin(Pubkey),
    Delegate(Pubkey), // OApp delegate for the endpoint
    DefaultFee(u16),
    Paused(bool),
    Pauser(Option<Pubkey>),
    Unpauser(Option<Pubkey>),
}
