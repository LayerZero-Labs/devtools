use crate::*;

/// OFTStore holds the global configuration and state for the Omnichain Fungible Token (OFT).
///
/// The state is divided into three sections:
/// - **Immutable fields:** Properties that are set at initialization and do not change.
/// - **Mutable fields:** Properties that change over the token's lifecycle (e.g., TVL).
/// - **Configurable fields:** Parameters that can be updated by the admin (e.g., fees, pause state).
#[account]
#[derive(InitSpace)]
pub struct OFTStore {
    // Immutable fields:
    /// The type of OFT. This determines whether the token uses a native mint-and-burn
    /// mechanism (Native) or an adapter mechanism (Adapter) for cross-chain operations.
    pub oft_type: OFTType,
    /// Conversion rate from local decimals (ld) to shared decimals (sd).
    pub ld2sd_rate: u64,
    /// The address of the token mint associated with the OFT.
    pub token_mint: Pubkey,
    /// The token escrow account used to hold the Total Value Locked (TVL) and fees.
    pub token_escrow: Pubkey, // this account is used to hold TVL and fees
    /// The endpoint program address used for cross-chain messaging.
    pub endpoint_program: Pubkey,
    /// The bump seed used for PDA derivation of the OFTStore.
    pub bump: u8,
    
    // Mutable fields:
    /// Total Value Locked (in local decimals) within the OFT.
    /// For Native OFTs, this value is always 0.
    pub tvl_ld: u64, // total value locked. if oft_type is Native, it is always 0.
    
    // Configurable fields:
    /// The admin authorized to update the OFT configuration.
    pub admin: Pubkey,
    /// The default fee in basis points that is applied to transfers.
    pub default_fee_bps: u16,
    /// Indicates whether the OFT is paused.
    pub paused: bool,
    /// Optional pauser address; only this address can pause the OFT.
    pub pauser: Option<Pubkey>,
    /// Optional unpauser address; only this address can unpause the OFT.
    pub unpauser: Option<Pubkey>,
}

/// OFTType defines the two possible types of OFT implementations:
/// - **Native:** Uses a native mint-and-burn mechanism.
/// - **Adapter:** Uses an adapter mechanism where tokens are locked in escrow and then unlocked.
#[derive(InitSpace, Clone, AnchorSerialize, AnchorDeserialize, PartialEq, Eq)]
pub enum OFTType {
    Native,
    Adapter,
}

impl OFTStore {
    /// Converts an amount from local decimals (ld) to shared decimals (sd).
    pub fn ld2sd(&self, amount_ld: u64) -> u64 {
        amount_ld / self.ld2sd_rate
    }

    /// Converts an amount from shared decimals (sd) to local decimals (ld).
    pub fn sd2ld(&self, amount_sd: u64) -> u64 {
        amount_sd * self.ld2sd_rate
    }

    /// Removes "dust" from an amount in local decimals.
    ///
    /// Dust is defined as the remainder that cannot be exactly converted using the ld2sd_rate.
    /// This function returns the largest multiple of the conversion rate less than or equal to the given amount.
    pub fn remove_dust(&self, amount_ld: u64) -> u64 {
        amount_ld - amount_ld % self.ld2sd_rate
    }
}

/// LzReceiveTypesAccounts holds the account addresses used in the LzReceiveTypes instruction,
/// which is responsible for processing cross-chain messages for the OFT.
#[account]
#[derive(InitSpace)]
pub struct LzReceiveTypesAccounts {
    /// The associated OFTStore address.
    pub oft_store: Pubkey,
    /// The token mint address associated with the OFT.
    pub token_mint: Pubkey,
}
