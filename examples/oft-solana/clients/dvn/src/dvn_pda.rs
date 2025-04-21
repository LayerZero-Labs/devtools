use solana_program::pubkey::Pubkey;

const DVN_CONFIG_SEED: &[u8] = b"DvnConfig";

pub struct DvnPDA {
    pub program: Pubkey,
}

impl DvnPDA {
    pub fn new(program_id: Pubkey) -> Self {
        Self {
            program: program_id,
        }
    }
    
    pub fn config(&self) -> Pubkey {
        Pubkey::find_program_address(&[DVN_CONFIG_SEED], &self.program).0
    }
}
