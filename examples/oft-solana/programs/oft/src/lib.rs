use anchor_lang::prelude::*;

// ==================================================
// Module Imports
// ==================================================
//
// The following modules encapsulate the core functionality of the OFT (Omnichain Fungible Token)
// program:
// - `compose_msg_codec`: Handles encoding/decoding of composed cross-chain messages.
// - `errors`: Defines custom error codes for the OFT program.
// - `events`: Contains event definitions emitted by the program.
// - `instructions`: Contains the various instructions (entrypoints) for the program.
// - `msg_codec`: Provides additional message encoding/decoding utilities.
// - `state`: Contains on-chain state definitions (e.g., OFTStore, PeerConfig).
pub mod compose_msg_codec;
pub mod errors;
pub mod events;
pub mod instructions;
pub mod msg_codec;
pub mod state;

// Re-export modules for easier access across the program.
pub use errors::*;
pub use events::*;
pub use instructions::*;
use oapp::{
    endpoint::{MessagingFee, MessagingReceipt},
    LzReceiveParams,
};
use solana_helper::program_id_from_env;
use state::*;

// ==================================================
// Program ID Declaration
// ==================================================
//
// The `declare_id!` macro sets the program ID for the OFT program using an environment variable.
// If the environment variable "OFT_ID" is not set, a default value is provided.
declare_id!(Pubkey::new_from_array(program_id_from_env!(
    "OFT_ID",
    "9UovNrJD8pQyBLheeHNayuG1wJSEAoxkmM14vw5gcsTT"
)));

// ==================================================
// Global Constants
// ==================================================
//
// These constants are used as seeds for deriving PDAs (Program Derived Addresses)
// for various accounts in the OFT program.
pub const OFT_SEED: &[u8] = b"OFT";                   // Seed for the OFTStore PDA.
pub const PEER_SEED: &[u8] = b"Peer";                 // Seed for PeerConfig PDA.
pub const ENFORCED_OPTIONS_SEED: &[u8] = b"EnforcedOptions"; // Seed for EnforcedOptions (if used).
pub const LZ_RECEIVE_TYPES_SEED: &[u8] = oapp::LZ_RECEIVE_TYPES_SEED; // Seed for LzReceiveTypes accounts.

// ==================================================
// Program Entrypoints
// ==================================================
//
// The `#[program]` module defines the entrypoints for the OFT program.
// Each public function in this module is a callable instruction from the client.
#[program]
pub mod oft {
    use super::*;

    /// Returns the version of the OFT interface and messaging.
    ///
    /// This function is used primarily for compatibility checks.
    pub fn oft_version(_ctx: Context<OFTVersion>) -> Result<Version> {
        Ok(Version { interface: 2, message: 1 })
    }

    /// Initializes a new OFT instance.
    ///
    /// This sets up the OFTStore, token escrow, and registers the endpoint configuration.
    pub fn init_oft(mut ctx: Context<InitOFT>, params: InitOFTParams) -> Result<()> {
        InitOFT::apply(&mut ctx, &params)
    }

    // ============================== Admin Instructions ==============================
    //
    // The following instructions are restricted to the admin and allow updating the configuration
    // of the OFT, including changing admin settings, updating peer configuration,
    // pausing/unpausing operations, and withdrawing accumulated fees.

    /// Updates the global OFT configuration stored in the OFTStore.
    pub fn set_oft_config(
        mut ctx: Context<SetOFTConfig>,
        params: SetOFTConfigParams,
    ) -> Result<()> {
        SetOFTConfig::apply(&mut ctx, &params)
    }

    /// Updates the configuration for a specific remote peer.
    ///
    /// This allows setting peer address, fee parameters, enforced options, and rate limits.
    pub fn set_peer_config(
        mut ctx: Context<SetPeerConfig>,
        params: SetPeerConfigParams,
    ) -> Result<()> {
        SetPeerConfig::apply(&mut ctx, &params)
    }

    /// Pauses or unpauses the OFT.
    ///
    /// This instruction can only be executed by an authorized pauser or unpauser.
    pub fn set_pause(mut ctx: Context<SetPause>, params: SetPauseParams) -> Result<()> {
        SetPause::apply(&mut ctx, &params)
    }

    /// Withdraws accumulated fees from the token escrow account.
    ///
    /// The admin can withdraw fee tokens while preserving the TVL (Total Value Locked).
    pub fn withdraw_fee(mut ctx: Context<WithdrawFee>, params: WithdrawFeeParams) -> Result<()> {
        WithdrawFee::apply(&mut ctx, &params)
    }

    // ============================== Public Instructions ==============================
    //
    // These instructions are available for public use to interact with the OFT for cross-chain messaging.
    // They include querying fee information, sending tokens, and processing received messages.

    /// Queries fee breakdown and receipt information for a potential send operation.
    pub fn quote_oft(ctx: Context<QuoteOFT>, params: QuoteOFTParams) -> Result<QuoteOFTResult> {
        QuoteOFT::apply(&ctx, &params)
    }

    /// Queries messaging fee details for a send operation.
    pub fn quote_send(ctx: Context<QuoteSend>, params: QuoteSendParams) -> Result<MessagingFee> {
        QuoteSend::apply(&ctx, &params)
    }

    /// Processes a send operation, moving tokens and sending a cross-chain message.
    ///
    /// Returns a tuple of MessagingReceipt (from the endpoint) and OFTReceipt (summarizing amounts).
    pub fn send(
        mut ctx: Context<Send>,
        params: SendParams,
    ) -> Result<(MessagingReceipt, OFTReceipt)> {
        Send::apply(&mut ctx, &params)
    }

    /// Processes a received cross-chain message.
    pub fn lz_receive(mut ctx: Context<LzReceive>, params: LzReceiveParams) -> Result<()> {
        LzReceive::apply(&mut ctx, &params)
    }

    /// Derives and returns a list of accounts required for processing a received cross-chain message.
    pub fn lz_receive_types(
        ctx: Context<LzReceiveTypes>,
        params: LzReceiveParams,
    ) -> Result<Vec<oapp::endpoint_cpi::LzAccount>> {
        LzReceiveTypes::apply(&ctx, &params)
    }
}

// ==================================================
// Additional Types
// ==================================================
//
// These types are used by the OFT program for versioning.
#[derive(Accounts)]
pub struct OFTVersion {}

/// Version structure returned by the `oft_version` instruction.
///
/// `interface`: Version number of the OFT interface.
/// `message`: Version number of the messaging protocol.
#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
pub struct Version {
    pub interface: u64,
    pub message: u64,
}
