use crate::*;

/// OAppRegistry is the on-chain state that holds registration data for an OApp (Omnichain Application)
/// within the endpoint program. This registry is used to store configuration data for an OApp,
/// enabling the endpoint to interact with registered applications for cross-chain messaging.
///
/// The state includes:
/// - `delegate`: The public key of the delegate associated with the OApp. The delegate may be responsible
///   for performing certain administrative actions or handling cross-chain messages on behalf of the OApp.
/// - `bump`: The bump seed used for PDA derivation of this account.
#[account]
#[derive(InitSpace)]
pub struct OAppRegistry {
    pub delegate: Pubkey,
    pub bump: u8,
}
