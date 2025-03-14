use crate::*;

#[account]
pub struct Nonce {
    pub bump: u8,
    pub max_received_nonce: u64,
}

impl Nonce {
    pub const SIZE: usize = 8 + std::mem::size_of::<Self>();
}
