use crate::*;

#[account]
pub struct Store {
    pub admin: Pubkey,
    pub bump: u8, // the bump of the store PDA
    pub endpoint_program: Pubkey,
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
    pub store: Pubkey, // Note: This is used as your OApp address.
    pub alt: Pubkey, // Note: in this example, we store a single ALT. You can modify this to store a Vec of Pubkeys too.
    pub bump: u8, // the bump of the lz_receive_types_accounts PDA
}

impl LzReceiveTypesAccounts {
    pub const SIZE: usize = 8 + std::mem::size_of::<Self>();
}


