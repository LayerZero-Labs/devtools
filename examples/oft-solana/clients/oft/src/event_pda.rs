use solana_program::pubkey::Pubkey;

const EVENT_SEED: &[u8] = b"__event_authority";

#[derive(Debug, Clone)]
pub struct EventPDA {
    pub program: Pubkey,
}

impl EventPDA {
    pub fn new(program: Pubkey) -> Self {
        Self { program }
    }

    pub fn event_authority(&self) -> Pubkey {
        Pubkey::find_program_address(&[EVENT_SEED], &self.program).0
    }
}
