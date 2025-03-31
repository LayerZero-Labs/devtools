use crate::*;

// ==================================================
// Byte Offsets for Encoded Message Layout
// ==================================================
//
// The encoded message layout depends on whether a compose message is provided:
//
// Without a compose message:
//   [ send_to (32 bytes) | amount_sd (8 bytes) ]
//
// With a compose message:
//   [ send_to (32 bytes) | amount_sd (8 bytes) | sender (32 bytes) | compose_msg (variable) ]
//
// The following constants define the offsets used when decoding a message that does not include the sender:
//
// - SEND_TO_OFFSET: The starting byte for the send_to field.
// - SEND_AMOUNT_SD_OFFSET: The offset at which the amount in shared decimals (amount_sd) starts.
// - COMPOSE_MSG_OFFSET: The offset at which the compose message would begin if present.
//   (In the absence of a compose message, the total message length is 40 bytes.)
const SEND_TO_OFFSET: usize = 0;
const SEND_AMOUNT_SD_OFFSET: usize = 32;
const COMPOSE_MSG_OFFSET: usize = 40;

/// Encodes the provided parameters into a single byte vector.
///
/// # Parameters
/// - `send_to`: A 32-byte array representing the recipient address.
/// - `amount_sd`: The amount in shared decimals (u64) to be sent.
/// - `sender`: The sender's public key (included only when a compose message is provided).
/// - `compose_msg`: An optional composed message. If provided, the sender's 32 bytes and the message
///   are appended to the encoding.
///
/// # Returns
/// A `Vec<u8>` representing the encoded message:
/// - Without a compose message: [send_to (32 bytes) | amount_sd (8 bytes)]
/// - With a compose message: [send_to (32 bytes) | amount_sd (8 bytes) | sender (32 bytes) | compose_msg (variable)]
pub fn encode(
    send_to: [u8; 32],
    amount_sd: u64,
    sender: Pubkey,
    compose_msg: &Option<Vec<u8>>, // Expected to contain additional data if provided.
) -> Vec<u8> {
    if let Some(msg) = compose_msg {
        // When a compose message is provided, allocate enough space for:
        // - send_to: 32 bytes
        // - amount_sd: 8 bytes
        // - sender: 32 bytes
        // - compose_msg: variable length
        let mut encoded = Vec::with_capacity(72 + msg.len()); // 32 + 8 + 32 = 72 bytes fixed
        encoded.extend_from_slice(&send_to);                // Append recipient address.
        encoded.extend_from_slice(&amount_sd.to_be_bytes());  // Append amount in shared decimals.
        encoded.extend_from_slice(sender.to_bytes().as_ref());// Append sender's public key.
        encoded.extend_from_slice(&msg);                     // Append the compose message.
        encoded
    } else {
        // When no compose message is provided, allocate space for:
        // - send_to: 32 bytes
        // - amount_sd: 8 bytes
        let mut encoded = Vec::with_capacity(40);            // 32 + 8 = 40 bytes fixed
        encoded.extend_from_slice(&send_to);                // Append recipient address.
        encoded.extend_from_slice(&amount_sd.to_be_bytes());  // Append amount in shared decimals.
        encoded
    }
}

/// Extracts the recipient address (send_to) from the encoded message.
///
/// # Parameters
/// - `message`: A byte slice containing the encoded message.
///
/// # Returns
/// A 32-byte array representing the recipient address.
pub fn send_to(message: &[u8]) -> [u8; 32] {
    let mut send_to = [0; 32];
    send_to.copy_from_slice(&message[SEND_TO_OFFSET..SEND_AMOUNT_SD_OFFSET]);
    send_to
}

/// Extracts the amount in shared decimals (amount_sd) from the encoded message.
///
/// # Parameters
/// - `message`: A byte slice containing the encoded message.
///
/// # Returns
/// The amount in shared decimals as a `u64`.
pub fn amount_sd(message: &[u8]) -> u64 {
    let mut amount_sd_bytes = [0; 8];
    // Assumes that the message contains only send_to and amount_sd (total length 40 bytes).
    amount_sd_bytes.copy_from_slice(&message[SEND_AMOUNT_SD_OFFSET..COMPOSE_MSG_OFFSET]);
    u64::from_be_bytes(amount_sd_bytes)
}

/// Extracts the compose message from the encoded message, if present.
///
/// # Parameters
/// - `message`: A byte slice containing the encoded message.
///
/// # Returns
/// - `Some(Vec<u8>)` containing the compose message if the message length is greater than COMPOSE_MSG_OFFSET.
/// - `None` if no compose message is present.
pub fn compose_msg(message: &[u8]) -> Option<Vec<u8>> {
    if message.len() > COMPOSE_MSG_OFFSET {
        Some(message[COMPOSE_MSG_OFFSET..].to_vec())
    } else {
        None
    }
}
