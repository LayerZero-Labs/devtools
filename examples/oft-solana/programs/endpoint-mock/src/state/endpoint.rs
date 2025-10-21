use crate::*;

/// OAppRegistry is the on-chain state that holds registration data for an OApp (Omnichain Application)
/// within the endpoint program. This registry is used to store configuration data for an OApp,
/// enabling the endpoint to interact with registered applications for cross-chain messaging.
///
/// The state includes:
/// - `delegate`: The public key of the delegate associated with the OApp. This delegate is authorized to
///   make program calls on the endpoint to manage the OApp’s settings. In particular, the delegate can
///   invoke the following endpoint instructions:
///     - `endpoint.set_config`: Set the configuration for the OApp.
///     - `endpoint.set_send_library`: Set the send library for the OApp.
///     - `endpoint.set_receive_library`: Set the receive library for the OApp.
///     - `endpoint.skip`: Skip a specific message nonce for the OApp.
///     - `endpoint.burn`: Burn a specific message nonce for the OApp.
///     - `endpoint.clear`: Clear the message nonce state for the OApp.
///     - `endpoint.nullify`: Nullify a specific message nonce for the OApp.
#[account]
#[derive(InitSpace)]
pub struct OAppRegistry {
    pub delegate: Pubkey,
    pub bump: u8,
}
