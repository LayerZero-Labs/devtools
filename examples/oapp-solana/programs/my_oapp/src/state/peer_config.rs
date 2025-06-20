use crate::*;

pub const ENFORCED_OPTIONS_SEND_MAX_LEN: usize = 512;
pub const ENFORCED_OPTIONS_SEND_AND_CALL_MAX_LEN: usize = 1024;

#[account]
pub struct PeerConfig {
    pub peer_address: [u8; 32],
    pub enforced_options: EnforcedOptions,
    pub bump: u8,
}

impl PeerConfig {
    pub const SIZE: usize = 8 + std::mem::size_of::<Self>();
}

#[derive(Clone, Default, AnchorSerialize, AnchorDeserialize, InitSpace)]
pub struct EnforcedOptions {
    #[max_len(ENFORCED_OPTIONS_SEND_MAX_LEN)]
    pub send: Vec<u8>,
    #[max_len(ENFORCED_OPTIONS_SEND_AND_CALL_MAX_LEN)]
    pub send_and_call: Vec<u8>,
}

impl EnforcedOptions {
    pub fn get_enforced_options(&self, composed_msg: &Option<Vec<u8>>) -> Vec<u8> {
        if composed_msg.is_none() {
            self.send.clone()
        } else {
            self.send_and_call.clone()
        }
    }

    pub fn combine_options(
        &self,
        compose_msg: &Option<Vec<u8>>,
        extra_options: &Vec<u8>,
    ) -> Result<Vec<u8>> {
        let enforced_options = self.get_enforced_options(compose_msg);
        oapp::options::combine_options(enforced_options, extra_options)
    }
}
