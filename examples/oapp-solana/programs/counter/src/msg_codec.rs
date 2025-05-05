
pub const VANILLA_TYPE: u8 = 1;
pub const COMPOSED_TYPE: u8 = 2;
// ABA_TYPE & COMPOSED_ABA_TYPE are not supported
// pub const ABA_TYPE: u8 = 3;
// pub const COMPOSED_ABA_TYPE: u8 = 4;

pub const MSG_TYPE_OFFSET: usize = 0;
pub const SRC_EID_OFFSET: usize = 1;

pub fn encode_counter(msg_type: u8, src_eid: u32) -> Vec<u8> {
    let mut encoded = Vec::new();
    encoded.push(msg_type);
    encoded.extend_from_slice(&src_eid.to_be_bytes());
    encoded
}

pub fn msg_type(message: &[u8]) -> u8 {
    message[MSG_TYPE_OFFSET]
}

// Above are legacy from counter implementation. Remove after amending all references to them.

// Message structure:
// [offset - 32bytes] [length - 32bytes] [ string - dynamic size]

pub const LENGTH_OFFSET: usize = 32;
pub const STRING_OFFSET: usize = 64;


pub fn encode(string: &str) -> Vec<u8> {
    let mut encoded = Vec::with_capacity(64 + string.len() + 32); // Preallocate capacity

    // Offset (32 bytes, 0x20 = 32 decimal)
    encoded.extend(std::iter::repeat(0).take(31));
    encoded.push(32);

    // Length (32 bytes)
    let length = string.len() as u32;
    encoded.extend(std::iter::repeat(0).take(28));
    encoded.extend_from_slice(&length.to_be_bytes());

    // String bytes
    encoded.extend_from_slice(string.as_bytes());

    // Padding to 32-byte boundary
    let padding = (32 - (length as usize % 32)) % 32;
    encoded.extend(std::iter::repeat(0).take(padding));

    encoded
}


pub fn decode(message: &[u8]) -> String {
    let mut length_bytes = [0u8; 32];
    length_bytes.copy_from_slice(&message[LENGTH_OFFSET..LENGTH_OFFSET + 32]);
    let length = u32::from_be_bytes(length_bytes[28..32].try_into().unwrap()) as usize; // Read the last 4 bytes for small strings
    // note that this means the we assume the max length of the string is the max value that can be represented by 4 bytes
    // which is 2^32 - 1 = 4294967295
    let string = String::from_utf8_lossy(&message[STRING_OFFSET..STRING_OFFSET + length]).to_string();
    string
}
