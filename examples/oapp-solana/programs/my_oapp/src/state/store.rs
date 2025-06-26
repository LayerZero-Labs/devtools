use crate::*;

#[account]
pub struct Store {
    pub admin: Pubkey, // This is required and should be consistent.
    pub bump: u8, // This is required and should be consistent.
    pub endpoint_program: Pubkey, // This is required and should be consistent.
    pub string: String, // This is specific to this string-passing example.
    // You can add more fields as needed for your OApp implementation.
}

impl Store {
    pub const MAX_STRING_LENGTH: usize = 256;
    pub const SIZE: usize = 8 + std::mem::size_of::<Self>() + Self::MAX_STRING_LENGTH;
}

// The LzReceiveTypesAccounts PDA is used by the Executor as a prerequisite to calling `lz_receive`.
#[account]
pub struct LzReceiveTypesAccounts {
    pub store: Pubkey, // This is required and should be consistent.
}

impl LzReceiveTypesAccounts {
    pub const SIZE: usize = 8 + std::mem::size_of::<Self>();
}


