export const METADATA_URL = process.env.LZ_METADATA_URL || 'https://metadata.layerzero-api.com/v1/metadata'
// A value used to indicate that no DVNs are required. It has to be used instead of 0, because 0 falls back to default value.
export const NIL_DVN_COUNT = (1 << 8) - 1 // type(uint8).max;
// A value used to indicate that no confirmations are required. It has to be used instead of 0, because 0 falls back to default value.
export const NIL_CONFIRMATIONS = (BigInt(1) << BigInt(64)) - BigInt(1) // type(uint64).max;
// A value used to indicate to use the blocked message library.
export const BLOCKED_MESSAGE_LIB_INDICATOR = 'BLOCKED'
