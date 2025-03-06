// Define byte offsets for each component in the encoded message.
// The message layout is as follows:
// [ nonce (8 bytes) | src_eid (4 bytes) | amount_ld (8 bytes) | composeFrom (32 bytes) | composeMsg (remaining bytes) ]
const NONCE_OFFSET: usize = 0;           // Nonce starts at byte 0, occupies 8 bytes.
const SRC_EID_OFFSET: usize = 8;           // Source endpoint ID starts at byte 8, occupies 4 bytes.
const AMOUNT_LD_OFFSET: usize = 12;        // Amount in local decimals starts at byte 12, occupies 8 bytes.
const COMPOSE_FROM_OFFSET: usize = 20;     // The 'composeFrom' field starts at byte 20, occupies 32 bytes.
const COMPOSE_MSG_OFFSET: usize = 52;      // The actual compose message begins at byte 52.

/// Encodes the provided parameters into a single byte vector.
/// 
/// # Parameters
/// - `nonce`: A unique 64-bit number to prevent replay attacks.
/// - `src_eid`: The source endpoint ID (32-bit).
/// - `amount_ld`: The amount in local decimals (64-bit) to be transferred.
/// - `compose_msg`: A byte vector representing the composed message, which is expected to be a 
///   concatenation of `[composeFrom][composeMsg]` (the first 32 bytes represent the sender or origin,
///   and the remaining bytes contain additional message data).
///
/// # Returns
/// A `Vec<u8>` containing the encoded message with the following structure:
/// [ nonce (8 bytes) | src_eid (4 bytes) | amount_ld (8 bytes) | compose_msg (variable length) ]
pub fn encode(
    nonce: u64,
    src_eid: u32,
    amount_ld: u64,
    compose_msg: &Vec<u8>, // Expected to contain [composeFrom][composeMsg]
) -> Vec<u8> {
    // Calculate the total capacity for the encoded message: 8 + 4 + 8 bytes for nonce, src_eid, and amount_ld,
    // plus the length of the provided compose_msg.
    let mut encoded = Vec::with_capacity(20 + compose_msg.len()); // 8 + 4 + 8 = 20 bytes base length.
    encoded.extend_from_slice(&nonce.to_be_bytes());         // Append nonce as 8 big-endian bytes.
    encoded.extend_from_slice(&src_eid.to_be_bytes());         // Append src_eid as 4 big-endian bytes.
    encoded.extend_from_slice(&amount_ld.to_be_bytes());       // Append amount_ld as 8 big-endian bytes.
    encoded.extend_from_slice(&compose_msg);                   // Append the compose_msg bytes.
    encoded
}

/// Extracts the nonce (8 bytes) from the encoded message.
/// 
/// # Parameters
/// - `message`: A byte slice containing the encoded message.
///
/// # Returns
/// The nonce as a `u64`, parsed from big-endian bytes.
pub fn nonce(message: &[u8]) -> u64 {
    let mut nonce_bytes = [0; 8];
    nonce_bytes.copy_from_slice(&message[NONCE_OFFSET..SRC_EID_OFFSET]);
    u64::from_be_bytes(nonce_bytes)
}

/// Extracts the source endpoint ID (4 bytes) from the encoded message.
///
/// # Parameters
/// - `message`: A byte slice containing the encoded message.
///
/// # Returns
/// The source endpoint ID as a `u32`, parsed from big-endian bytes.
pub fn src_eid(message: &[u8]) -> u32 {
    let mut src_eid_bytes = [0; 4];
    src_eid_bytes.copy_from_slice(&message[SRC_EID_OFFSET..AMOUNT_LD_OFFSET]);
    u32::from_be_bytes(src_eid_bytes)
}

/// Extracts the amount in local decimals (8 bytes) from the encoded message.
///
/// # Parameters
/// - `message`: A byte slice containing the encoded message.
///
/// # Returns
/// The amount in local decimals as a `u64`, parsed from big-endian bytes.
pub fn amount_ld(message: &[u8]) -> u64 {
    let mut amount_ld_bytes = [0; 8];
    amount_ld_bytes.copy_from_slice(&message[AMOUNT_LD_OFFSET..COMPOSE_FROM_OFFSET]);
    u64::from_be_bytes(amount_ld_bytes)
}

/// Extracts the `composeFrom` field from the encoded message.
///
/// This field is a 32-byte value starting at the defined offset.
///
/// # Parameters
/// - `message`: A byte slice containing the encoded message.
///
/// # Returns
/// A 32-byte array representing the `composeFrom` field.
pub fn compose_from(message: &[u8]) -> [u8; 32] {
    let mut compose_from = [0; 32];
    compose_from.copy_from_slice(&message[COMPOSE_FROM_OFFSET..COMPOSE_MSG_OFFSET]);
    compose_from
}

/// Extracts the remaining bytes of the encoded message as the `composeMsg`.
///
/// If the message length is less than or equal to the offset for `composeMsg`, it returns an empty vector.
///
/// # Parameters
/// - `message`: A byte slice containing the encoded message.
///
/// # Returns
/// A `Vec<u8>` containing the compose message.
pub fn compose_msg(message: &[u8]) -> Vec<u8> {
    if message.len() > COMPOSE_MSG_OFFSET {
        message[COMPOSE_MSG_OFFSET..].to_vec()
    } else {
        Vec::new()
    }
}
