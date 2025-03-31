/// This module defines the on-chain state for the OFT (Omnichain Fungible Token) system.
///
/// It is composed of the following sub-modules:
/// 
/// - **oft**: Contains state structures and logic for the core OFT configuration and state,
///   such as the OFTStore which holds global settings (e.g., fee parameters, paused state, TVL, etc.).
/// 
/// - **peer_config**: Contains state definitions for the peer configuration,
///   which manages settings for remote endpoints, including fee basis points,
///   enforced options, and rate limiter parameters.
///
/// The re-exported items from these modules are made publicly accessible for use
/// in other parts of the program.
pub mod oft;
pub mod peer_config;

pub use oft::*;
pub use peer_config::*;
