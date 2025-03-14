use crate::*;

#[account]
pub struct Peer {
    pub address: [u8; 32],
    pub bump: u8,
}

impl Peer {
    pub const SIZE: usize = 8 + std::mem::size_of::<Self>();
}
