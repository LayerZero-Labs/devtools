use solana_program::pubkey::Pubkey;

use crate::msg_lib_pda::{MESSAGE_LIB_SEED, SEND_CONFIG_SEED};

const ULN_SEED: &[u8] = MESSAGE_LIB_SEED;

pub struct UlnPDA {
    pub program: Pubkey,
}

impl UlnPDA {
    pub fn new(program_id: Pubkey) -> Self {
        Self {
            program: program_id,
        }
    }
    
    pub fn setting(&self) -> Pubkey {
        Pubkey::find_program_address(&[ULN_SEED], &self.program).0
    }

    pub fn send_config(&self, oapp: Pubkey, eid: u32) -> Pubkey {
        Pubkey::find_program_address(&[SEND_CONFIG_SEED, &eid.to_be_bytes(), oapp.to_bytes().as_ref() ], &self.program).0
    }

    pub fn default_send_config(&self, eid: u32) -> Pubkey {
        Pubkey::find_program_address(&[SEND_CONFIG_SEED, &eid.to_be_bytes()], &self.program).0
    }
}
