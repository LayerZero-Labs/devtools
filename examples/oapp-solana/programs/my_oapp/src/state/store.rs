use crate::*;

#[account]
pub struct Store {
    pub admin: Pubkey,
    pub bump: u8,
    pub endpoint_program: Pubkey,
    pub string: String,
}

impl Store {
    pub const MAX_STRING_LENGTH: usize = 256;
    pub const SIZE: usize = 8 + std::mem::size_of::<Self>() + Self::MAX_STRING_LENGTH;
}

/// LzReceiveTypesAccounts includes accounts that are used in the LzReceiveTypes instruction.
#[account]
pub struct LzReceiveTypesAccounts {
    pub store: Pubkey,
}

impl LzReceiveTypesAccounts {
    pub const SIZE: usize = 8 + std::mem::size_of::<Self>();
}


