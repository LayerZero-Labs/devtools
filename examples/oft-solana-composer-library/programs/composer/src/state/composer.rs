use crate::*;

#[account]
pub struct Composer {
    /// The OFT PDA (unique to this composer instance)
    pub oft: Pubkey,
    /// The Endpoint PDA (the authorized endpoint for LZ messages)
    pub endpoint_program: Pubkey,
    /// Bump for PDA derivation.
    pub bump: u8,
}

impl Composer {
    pub const SIZE: usize = 8 + std::mem::size_of::<Self>();
}

/// LzComposeTypesAccounts includes accounts that are used in the LzComposeTypes instruction.
#[account]
pub struct LzComposeTypesAccounts {
    pub count: Pubkey,
}

impl LzComposeTypesAccounts {
    pub const SIZE: usize = 8 + std::mem::size_of::<Self>();
}
