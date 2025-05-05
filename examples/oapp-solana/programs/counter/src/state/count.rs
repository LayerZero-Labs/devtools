use crate::*;

#[account]
pub struct Count {
    pub id: u8,
    pub admin: Pubkey,
    pub count: u64,
    pub composed_count: u64,
    pub bump: u8,
    pub endpoint_program: Pubkey,
    pub ordered_nonce: bool,
    pub string: String,
}

impl Count {
    pub const MAX_STRING_LENGTH: usize = 256;
    pub const SIZE: usize = 8 + std::mem::size_of::<Self>() + Self::MAX_STRING_LENGTH;
}

// LzReceiveTypesAccounts includes accounts that are used in the LzReceiveTypes instruction.
// #[account]
// pub struct LzReceiveTypesAccounts {
//     pub count: Pubkey,
// }

// impl LzReceiveTypesAccounts {
//     pub const SIZE: usize = 8 + std::mem::size_of::<Self>();
// }

// /// LzComposeTypesAccounts includes accounts that are used in the LzComposeTypes
// /// instruction.
// #[account]
// pub struct LzComposeTypesAccounts {
//     pub count: Pubkey,
// }

// impl LzComposeTypesAccounts {
//     pub const SIZE: usize = 8 + std::mem::size_of::<Self>();
// }
