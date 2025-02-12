use crate::*;

// OFT V1 Codec
// [TYPE: u8] (enum: 0 = SEND, 1 = SEND_AND_CALL)
// [TO_ADDRESS: bytes32]
// [AMOUNT_SD: u64]
// - - - - - - - - Compose Messages Only - - - - - - - -
// [FROM: bytes32]
// [COMPOSE_GAS: u64]
// [COMPOSE_PAYLOAD: bytes]
// const V1_TYPE_OFFSET: usize = 0;
const V1_SEND_TO_OFFSET: usize = 1;
const V1_SEND_AMOUNT_SD_OFFSET: usize = 33;
const V1_COMPOSE_GAS_OFFSET: usize = 41;
// const V1_COMPOSE_MSG_OFFSET: usize = 49;

const SEND_AND_CALL: u8 = 1;
const SEND: u8 = 0;

pub fn encode(
    send_to: [u8; 32],
    amount_sd: u64,
    sender: Pubkey,
    compose_params: &Option<ComposeParams>,
) -> Vec<u8> {
    if let Some(params) = compose_params {
        let ComposeParams { compose_gas, compose_msg } = params;
        let mut encoded = Vec::with_capacity(81 + compose_msg.len()); // 1 + 32 + 8 + 32 + 8 + compose_msg.len()
        encoded.push(SEND_AND_CALL); // SEND_AND_CALL type
        encoded.extend_from_slice(&send_to);
        encoded.extend_from_slice(&amount_sd.to_be_bytes());

        // Compose Message
        encoded.extend_from_slice(sender.to_bytes().as_ref());
        encoded.extend_from_slice(&compose_gas.to_be_bytes());
        encoded.extend_from_slice(&compose_msg);
        encoded
    } else {
        let mut encoded = Vec::with_capacity(41); // 1 + 32 + 8
        encoded.push(SEND); // SEND type
        encoded.extend_from_slice(&send_to);
        encoded.extend_from_slice(&amount_sd.to_be_bytes());
        encoded
    }
}

pub fn send_to(message: &[u8]) -> [u8; 32] {
    let mut send_to = [0; 32];
    send_to.copy_from_slice(&message[V1_SEND_TO_OFFSET..V1_SEND_AMOUNT_SD_OFFSET]);
    send_to
}

pub fn amount_sd(message: &[u8]) -> u64 {
    let mut amount_sd_bytes = [0; 8];
    amount_sd_bytes.copy_from_slice(&message[V1_SEND_AMOUNT_SD_OFFSET..V1_COMPOSE_GAS_OFFSET]);
    u64::from_be_bytes(amount_sd_bytes)
}

pub fn compose_msg(message: &[u8]) -> Option<Vec<u8>> {
    if message.len() > V1_COMPOSE_GAS_OFFSET {
        Some(message[V1_COMPOSE_GAS_OFFSET..].to_vec())
    } else {
        None
    }
}
