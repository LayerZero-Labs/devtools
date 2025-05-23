use anchor_lang::prelude::error_code;
use std::str; 

pub const VANILLA_TYPE: u8 = 1;

// Just like OFT, we don't need an explicit MSG_TYPE param
// Instead, we'll check whether there's data after the string ends
pub const LENGTH_OFFSET: usize = 0;
pub const STRING_OFFSET: usize = 32;

#[error_code]
pub enum MsgCodecError {
    /// Buffer too short to even contain the 32‐byte length header
    InvalidLength,
    /// Header says "string is N bytes" but buffer < 32+N
    BodyTooShort,
    /// Payload bytes aren’t valid UTF-8
    InvalidUtf8,
}

fn decode_string_len(buf: &[u8]) -> Result<usize, MsgCodecError> {
    if buf.len() < STRING_OFFSET {
        return Err(MsgCodecError::InvalidLength);
    }
    let mut string_len_bytes = [0u8;32];
    string_len_bytes.copy_from_slice(&buf[LENGTH_OFFSET..LENGTH_OFFSET+32]);
    Ok(u32::from_be_bytes(string_len_bytes[28..32].try_into().unwrap()) as usize)
}

pub fn encode(string: &str) -> Vec<u8> {
    let string_bytes = string.as_bytes();
    let mut msg = Vec::with_capacity(
        STRING_OFFSET +                          // length word
        string_bytes.len()            // string
    );

    // 4-byte length
    msg.extend(std::iter::repeat(0).take(28)); // padding
    msg.extend_from_slice(&(string_bytes.len() as u32).to_be_bytes());

    // string
    msg.extend_from_slice(string_bytes);

    msg
}

pub fn decode(message: &[u8]) -> Result<String, MsgCodecError> {
    // Read the declared payload length from the header
    let string_len = decode_string_len(message)?;

    let start = STRING_OFFSET;
    // Safely compute end index and check for overflow
    let end = start
        .checked_add(string_len)
        .ok_or(MsgCodecError::InvalidLength)?;

    // Ensure the buffer actually contains the full payload
    if end > message.len() {
        return Err(MsgCodecError::BodyTooShort);
    }

    // Slice out the payload bytes
    let payload = &message[start..end];
    // Attempt to convert to &str, returning an error if invalid UTF-8
    match str::from_utf8(payload) {
        Ok(s) => Ok(s.to_string()),
        Err(_) => Err(MsgCodecError::InvalidUtf8),
    }
}
