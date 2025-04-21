use solana_program::pubkey::Pubkey;

pub struct OftPDA {
    pub program: Pubkey,
}

const OFT_SEED: &[u8] = b"OFT";
const PEER_SEED: &[u8] = b"Peer";

impl OftPDA {
    pub fn new(program: Pubkey) -> Self {
        Self { program }
    }

    pub fn oft_store(&self, escrow: Pubkey) -> Pubkey {
        Pubkey::find_program_address(&[OFT_SEED, escrow.to_bytes().as_ref()], &self.program).0
    }

    pub fn peer(&self, oft_store: Pubkey, eid: u32) -> Pubkey {
        Pubkey::find_program_address(&[PEER_SEED, oft_store.to_bytes().as_ref(), &eid.to_be_bytes()], &self.program).0
    }
    
}
