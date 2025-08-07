// This module contains the initialization logic for the OFT.
// It sets up the OFTStore, token escrow, and registers the endpoint for cross-chain messaging.
pub mod init_oft;

// This module implements the logic for handling incoming cross-chain messages.
// It processes received messages, including minting tokens or unlocking tokens from escrow.
pub mod lz_receive;

// This module defines the account types and associated mappings required for receiving cross-chain messages.
// It is used to construct the account vectors for CPI calls.
pub mod lz_receive_types;

// This module provides functionality for querying fee estimates and token conversion rates for OFT operations.
pub mod quote_oft;

// This module specifically handles the fee and parameter quoting for sending operations.
pub mod quote_send;

// This module implements the logic for sending OFT tokens across chains.
// It handles building and executing the send transaction.
pub mod send;

// This module allows for updating or setting the configuration parameters of the OFT after deployment.
pub mod set_oft_config;

// This module provides functionality to pause or unpause the OFT, controlling whether operations can proceed.
pub mod set_pause;

// This module contains logic for setting and updating the peer configuration used in cross-chain messaging.
pub mod set_peer_config;

// This module handles the withdrawal of accumulated fees from the OFT.
pub mod withdraw_fee;

// Re-export all items from the modules so that they are accessible from the crate’s top level.
pub use init_oft::*;
pub use lz_receive::*;
pub use lz_receive_types::*;
pub use quote_oft::*;
pub use quote_send::*;
pub use send::*;
pub use set_oft_config::*;
pub use set_pause::*;
pub use set_peer_config::*;
pub use withdraw_fee::*;
