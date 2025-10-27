// Compute the maximum whole-token supply for a Solana SPL mint given its local decimals.

const U64_MAX = (BigInt(1) << BigInt(64)) - BigInt(1)

export function localDecimalsToMaxSupply(localDecimals: number): bigint {
    if (!Number.isInteger(localDecimals) || localDecimals < 0) {
        throw new Error('localDecimals must be a non-negative integer')
    }
    const scalingFactor = BigInt(10) ** BigInt(localDecimals)
    return U64_MAX / scalingFactor
}
