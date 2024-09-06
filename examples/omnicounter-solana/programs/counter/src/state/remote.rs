use crate::*;

#[account]
pub struct Remote {
    pub address: [u8; 32],
    pub bump: u8,
}

impl Remote {
    pub const SIZE: usize = 8 + std::mem::size_of::<Self>();
}
