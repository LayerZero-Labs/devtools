// Compute the maximum whole-token supply for a Solana SPL mint given its local decimals.

const U64_MAX = (BigInt(1) << BigInt(64)) - BigInt(1)

/** Returns the maximum whole-token supply given u64 base-unit cap:
 *  floor(U64_MAX / 10^localDecimals).
 */
export function localDecimalsToMaxWholeTokens(localDecimals: number): bigint {
    if (!Number.isInteger(localDecimals) || localDecimals < 0) {
        throw new Error('localDecimals must be a non-negative integer')
    }
    const scalingFactor = BigInt(10) ** BigInt(localDecimals)
    // Integer division of BigInts; for non-negative values this is floor(U64_MAX / 10^localDecimals)
    return U64_MAX / scalingFactor
}
