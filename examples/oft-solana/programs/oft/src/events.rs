use crate::*;

/// Event emitted when an OFT send operation is executed successfully.
///
/// This event provides a globally unique identifier (guid) for the operation,
/// the destination endpoint ID (`dst_eid`), the source token account (`from`),
/// and the amounts involved:
/// - `amount_sent_ld`: The original amount sent (in local decimals).
/// - `amount_received_ld`: The amount received after fees (in local decimals).
#[event]
pub struct OFTSent {
    pub guid: [u8; 32],
    pub dst_eid: u32,
    pub from: Pubkey,
    pub amount_sent_ld: u64,
    pub amount_received_ld: u64,
}

/// Event emitted when an OFT receive operation is processed successfully.
///
/// This event provides a globally unique identifier (guid) for the operation,
/// the source endpoint ID (`src_eid`), the destination token account (`to`),
/// and the final amount received (in local decimals).
#[event]
pub struct OFTReceived {
    pub guid: [u8; 32],
    pub src_eid: u32,
    pub to: Pubkey,
    pub amount_received_ld: u64,
}
