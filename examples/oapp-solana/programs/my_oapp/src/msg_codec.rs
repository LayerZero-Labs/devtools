
pub const VANILLA_TYPE: u8 = 1;
pub const COMPOSED_TYPE: u8 = 2;

// Just like OFT, we don't need an explicit MSG_TYPE param
// Instead, we'll check whether there's data after the string ends
pub const LENGTH_OFFSET: usize = 0;
pub const STRING_OFFSET: usize = 32;

fn decode_string_len(buf: &[u8]) -> usize {
    let mut string_len_bytes = [0u8;32];
    string_len_bytes.copy_from_slice(&buf[LENGTH_OFFSET..LENGTH_OFFSET+32]);
    u32::from_be_bytes(string_len_bytes[28..32].try_into().unwrap()) as usize
}

pub fn msg_type(message: &[u8]) -> u8 {
    let string_len = decode_string_len(message);
    if message.len() > STRING_OFFSET + string_len {
        COMPOSED_TYPE
    } else {
        VANILLA_TYPE
    }
}


pub fn encode(string: &str, compose_msg: Option<&[u8]>) -> Vec<u8> {
    let string_bytes = string.as_bytes();
    let mut msg = Vec::with_capacity(
        32 +                          // length word
        string_bytes.len() +          // string
        compose_msg.map(|m| m.len())  // optional tail
            .unwrap_or(0)
    );

    // 4-byte length
    msg.extend(std::iter::repeat(0).take(28)); // padding
    msg.extend_from_slice(&(string_bytes.len() as u32).to_be_bytes());

    // string
    msg.extend_from_slice(string_bytes);

    // optional tail
    if let Some(tail) = compose_msg {
        msg.extend_from_slice(tail);
    }

    msg
}

pub fn decode(message: &[u8]) -> String {
    let string_len = decode_string_len(message);
    String::from_utf8_lossy(&message[STRING_OFFSET..STRING_OFFSET+string_len]).to_string()
}

pub fn compose_msg(message: &[u8]) -> Option<Vec<u8>> {
    let string_len = decode_string_len(message);
    if message.len() > STRING_OFFSET + string_len {
        Some(message[STRING_OFFSET+string_len..].to_vec())
    } else {
        None
    }
}