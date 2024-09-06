pub const VANILLA_TYPE: u8 = 1;
pub const COMPOSED_TYPE: u8 = 2;
// ABA_TYPE & COMPOSED_ABA_TYPE are not supported
// pub const ABA_TYPE: u8 = 3;
// pub const COMPOSED_ABA_TYPE: u8 = 4;

pub const MSG_TYPE_OFFSET: usize = 0;
pub const SRC_EID_OFFSET: usize = 1;

pub fn encode(msg_type: u8, src_eid: u32) -> Vec<u8> {
    let mut encoded = Vec::new();
    encoded.push(msg_type);
    encoded.extend_from_slice(&src_eid.to_be_bytes());
    encoded
}

pub fn msg_type(message: &[u8]) -> u8 {
    message[MSG_TYPE_OFFSET]
}

pub fn src_eid(message: &[u8]) -> u32 {
    let mut eid_bytes = [0; 4];
    eid_bytes.copy_from_slice(&message[SRC_EID_OFFSET..]);
    u32::from_be_bytes(eid_bytes)
}
