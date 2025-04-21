use solana_program::pubkey::Pubkey;
use uln_client::msg_lib_pda::MESSAGE_LIB_SEED;

const ENDPOINT_SEED: &[u8] = b"Endpoint";
const SEND_LIBRARY_CONFIG_SEED: &[u8] = b"SendLibraryConfig";
const NONCE_SEED: &[u8] = b"Nonce";

#[derive(Debug, Clone)]
pub struct EndpointPDA {
    pub program: Pubkey,
}

impl EndpointPDA {
    pub fn new(program: Pubkey) -> Self {
        Self { program }
    }

    pub fn setting(&self) -> Pubkey {
        Pubkey::find_program_address(&[ENDPOINT_SEED], &self.program).0
    }

    pub fn send_library_config(&self, sender: Pubkey, dst_eid: u32) -> Pubkey {
        Pubkey::find_program_address(&[SEND_LIBRARY_CONFIG_SEED, sender.to_bytes().as_ref(), &dst_eid.to_be_bytes()], &self.program).0
    }

    pub fn default_send_library_config(&self, dst_eid: u32) -> Pubkey {
        Pubkey::find_program_address(&[SEND_LIBRARY_CONFIG_SEED, &dst_eid.to_be_bytes()], &self.program).0
    }

    pub fn message_library_info(&self, msg_lib: Pubkey) -> Pubkey {
        Pubkey::find_program_address(&[MESSAGE_LIB_SEED, msg_lib.to_bytes().as_ref()], &self.program).0
    }

    pub fn nonce(&self, oapp: Pubkey, remote_chain_id: u32, remote_oapp: [u8; 32]) -> Pubkey {
        Pubkey::find_program_address(&[NONCE_SEED, oapp.to_bytes().as_ref(), &remote_chain_id.to_be_bytes(), remote_oapp.as_ref()], &self.program).0
    }
}
