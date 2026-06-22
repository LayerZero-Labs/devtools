// Compute the maximum whole-token supply for a Solana SPL mint given its local decimals.

import BN from 'bn.js'

const U64_MAX = (BigInt(1) << BigInt(64)) - BigInt(1)

/**
 * The big-number type the Solana program instruction builders (via beet) expect for
 * `u64`/`u128` fields. Re-exported so consumers can name it without depending on `bn.js`
 * directly.
 */
export type Bignum = BN

/**
 * Converts a `bigint` to a `bn.js` `BN`, which is the numeric type the Solana program
 * instruction builders (via beet) expect for `u64`/`u128` fields.
 *
 * Going through the decimal string keeps full precision for values that overflow a JS
 * number (e.g. the `type(uint64).max` NIL sentinel used in ULN configs).
 */
export function bigIntToBN(value: bigint): Bignum {
    return new BN(value.toString())
}

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
