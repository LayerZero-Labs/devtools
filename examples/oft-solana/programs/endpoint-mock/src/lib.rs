// ==================================================
// Module Imports and Declarations
// ==================================================
//
// The endpoint-mock program is a simplified implementation of the LayerZero V2 endpoint.
// It is used by the OFT (Omnichain Fungible Token) program to register and communicate
//  cross-chain.
//
// The program is divided into sub-modules:
// - `instructions`: Contains the instruction logic for the endpoint (e.g., register_oapp).
// - `state`: Contains on-chain state definitions related to the endpoint.
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;
use instructions::*;
use state::*;

// ==================================================
// Program ID Declaration
// ==================================================
//
// The `declare_id!` macro sets the unique identifier (program ID) for the endpoint-mock program.
// This ID is used when interacting with the program from other clients (such as the OFT program).
declare_id!("6xmPjYnXyxz36xcKkv2zCrZc72LK5hQ9xzY3EjeZ59MV");

// ==================================================
// Global Constants
// ==================================================
//
// `OAPP_SEED` is used as a seed for deriving PDAs (Program Derived Addresses) related to the endpoint.
// This seed is referenced by the OFT program when it communicates with the endpoint.
pub const OAPP_SEED: &[u8] = b"OApp";

// ==================================================
// Program Entrypoints
// ==================================================
//
// The `endpoint` program module defines the entrypoints for the messaging endpoint.
// Currently, it only exposes the `register_oapp` instruction, which is used by the OFT program
// to register an application (OApp) with the endpoint. This registration is necessary for
// enabling cross-chain communication.
#[program]
pub mod endpoint {
    use super::*;

    /// Registers an OApp (Omnichain Application) with the endpoint.
    ///
    /// This function initializes or updates the endpoint state for the calling application.
    /// It delegates the processing to the `RegisterOApp::apply` method defined in the `instructions` module.
    ///
    /// # Parameters
    /// - `ctx`: The context containing all the necessary accounts for registration.
    /// - `params`: The registration parameters, which may include delegate information and other settings.
    ///
    /// # Returns
    /// - `Ok(())` on successful registration.
    pub fn register_oapp(mut ctx: Context<RegisterOApp>, params: RegisterOAppParams) -> Result<()> {
        RegisterOApp::apply(&mut ctx, &params)
    }
}
