use solana_program::pubkey::Pubkey;

const EXECUTOR_CONFIG_SEED: &[u8] = b"ExecutorConfig";

pub struct ExecutorPDA {
    pub program: Pubkey,
}

impl ExecutorPDA {
    pub fn new(program_id: Pubkey) -> Self {
        Self {
            program: program_id,
        }
    }
    
    pub fn config(&self) -> Pubkey {
        Pubkey::find_program_address(&[EXECUTOR_CONFIG_SEED], &self.program).0
    }
}
