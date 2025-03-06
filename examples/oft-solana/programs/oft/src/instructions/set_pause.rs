use crate::*;

/// Accounts required for setting the pause state of the OFT (Omnichain Fungible Token).
///
/// This instruction allows an authorized pauser or unpauser to update the `paused` flag in the OFTStore.
/// The authorization is determined by the `is_valid_signer` helper function, which checks if the signer is allowed
/// to either pause or unpause the OFT based on the current configuration in the OFTStore.
#[derive(Accounts)]
#[instruction(params: SetPauseParams)]
pub struct SetPause<'info> {
    /// The signer must be the designated pauser (when pausing) or unpauser (when unpausing).
    pub signer: Signer<'info>,
    /// The OFTStore account holds the state and configuration for the OFT.
    /// It is derived using a seed (OFT_SEED and the token escrow address) and its bump.
    /// The `constraint` ensures that the signer is valid (pauser/unpauser) as determined by `is_valid_signer`.
    #[account(
        mut,
        seeds = [OFT_SEED, oft_store.token_escrow.as_ref()],
        bump = oft_store.bump,
        constraint = is_valid_signer(signer.key(), &oft_store, params.paused) @OFTError::Unauthorized
    )]
    pub oft_store: Account<'info, OFTStore>,
}

impl SetPause<'_> {
    /// Applies the SetPause instruction.
    ///
    /// This function updates the `paused` state in the OFTStore based on the provided parameter.
    /// The signer is validated via the account constraint before reaching this point.
    pub fn apply(ctx: &mut Context<SetPause>, params: &SetPauseParams) -> Result<()> {
        // Update the paused state in the OFTStore.
        ctx.accounts.oft_store.paused = params.paused;
        Ok(())
    }
}

/// Parameters for setting the pause state.
///
/// This struct contains a single field indicating whether the OFT should be paused (true)
/// or unpaused (false).
#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
pub struct SetPauseParams {
    pub paused: bool,
}

/// Helper function to validate if the signer is authorized to change the paused state.
///
/// When pausing the OFT, the signer must be the designated pauser;
/// when unpausing, the signer must be the designated unpauser.
/// Returns true if the signer is authorized, false otherwise.
fn is_valid_signer(signer: Pubkey, oft_store: &OFTStore, paused: bool) -> bool {
    if paused {
        oft_store.pauser == Some(signer)
    } else {
        oft_store.unpauser == Some(signer)
    }
}
