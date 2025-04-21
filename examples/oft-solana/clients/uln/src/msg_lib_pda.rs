use solana_program::pubkey::Pubkey;

pub const SEND_CONFIG_SEED: &[u8] = b"SendConfig";
pub const RECEIVE_CONFIG_SEED: &[u8] = b"ReceiveConfig";
pub const MESSAGE_LIB_SEED: &[u8] = b"MessageLib";

pub struct MessageLibPDA {
    pub program: Pubkey,
}

impl MessageLibPDA {
}
