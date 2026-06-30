/**
 * Sentinel values for ULN302 configuration, matching the on-chain contract (`UlnBase.sol`).
 *
 * A config field left at `0` falls back to the default config, so these sentinels are used
 * to pin a literal zero/none instead:
 *
 * - `NIL_DVN_COUNT` pins "no DVNs" (the accompanying DVN array must be empty).
 * - `NIL_CONFIRMATIONS` pins "zero confirmations".
 */
export const NIL_DVN_COUNT = (1 << 8) - 1 // type(uint8).max = 255
export const NIL_CONFIRMATIONS = (BigInt(1) << BigInt(64)) - BigInt(1) // type(uint64).max
