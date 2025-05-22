export const METADATA_URL = process.env.LZ_METADATA_URL || 'https://metadata.layerzero-api.com/v1/metadata'
// A value used to indicate that no DVNs are required. It has to be used instead of 0, because 0 falls back to default value.
export const NIL_DVN_COUNT = (1 << 8) - 1 // type(uint8).max;
// A value used to indicate that no confirmations are required. It has to be used instead of 0, because 0 falls back to default value.
export const NIL_CONFIRMATIONS = (BigInt(1) << BigInt(64)) - BigInt(1) // type(uint64).max;

export const MSG_LIB_BLOCK_SEND_AND_RECEIVE = 'BLOCK_SEND_AND_RECEIVE'
export const MSG_LIB_BLOCK_SEND_ONLY = 'BLOCK_SEND_ONLY'
export const MSG_LIB_BLOCK_RECEIVE_ONLY = 'BLOCK_RECEIVE_ONLY'

// Constants for metadata key names
export const METADATA_KEY_SOLANA_BLOCKED_MESSAGE = 'blocked_messagelib'
export const METADATA_KEY_EVM_BLOCKED_MESSAGE = 'blockedMessageLib'
export const METADATA_KEY_SEND_LIBRARY = 'sendUln302'
export const METADATA_KEY_RECEIVE_LIBRARY = 'receiveUln302'
