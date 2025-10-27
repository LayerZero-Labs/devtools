import { Connection } from '@solana/web3.js'

/**
 * Turn a human decimal amount (e.g. "1.234") into a BigInt of base‐units given `decimals`.
 */
export function parseDecimalToUnits(amount: string, decimals: number): bigint {
    const [whole, fraction = ''] = amount.split('.')
    const wholeUnits = BigInt(whole) * 10n ** BigInt(decimals)
    // pad or trim the fractional part to exactly `decimals` digits
    const fracUnits = BigInt(
        fraction
            .padEnd(decimals, '0') // "23"  → "230000"
            .slice(0, decimals) // in case user typed more digits than `decimals`
    )
    return wholeUnits + fracUnits
}

/**
 * Suppresses Solana‐web3.js "429 Too Many Requests" retry spam
 * by intercepting stderr.write and dropping any chunk
 * that mentions the 429 retry.
 */
export function silenceSolana429(connection: Connection): void {
    const origWrite = process.stderr.write.bind(process.stderr)
    process.stderr.write = ((chunk: any, ...args: any[]) => {
        const str = Buffer.isBuffer(chunk) ? chunk.toString('utf8') : chunk
        if (typeof str === 'string' && str.includes('429 Too Many Requests')) {
            // swallow it
            return true
        }
        // otherwise pass through
        return origWrite(chunk, ...args)
    }) as typeof process.stderr.write
}

// Max whole-token supply on Solana (u64)
const U64_MAX = (1n << 64n) - 1n
const UNITS = [
    { base: 1_000_000_000_000n, suffix: 'T' },
    { base: 1_000_000_000n, suffix: 'B' },
    { base: 1_000_000n, suffix: 'M' },
    { base: 1_000n, suffix: 'K' },
]

/**
 * Computes the maximum whole-token supply representable by a Solana SPL mint
 * given its local decimal precision, formatted for readability.
 *
 * Behavior:
 * - Uses compact units when large enough: K (thousand), M (million), B (billion), T (trillion).
 * - Values < 1000 are returned as a plain whole number string without a suffix.
 * - Rounds "half up" to the provided display precision.
 * - Near unit boundaries, rounding can promote the value to the next unit
 *   (e.g., 999.6B -> 1.0T) which matches typical human-readable expectations.
 *
 * Parameters:
 * - localDecimals: Non-negative integer count of decimals on the SPL mint.
 * - maxDisplayDecimals: Fractional digits to include in the compact representation (0–6). Default is 1.
 *
 * Returns:
 * - A human-readable string such as "18.4B", "1.0T", or "842".
 *
 * Throws:
 * - If localDecimals is negative or not an integer.
 * - If maxDisplayDecimals is not an integer in the inclusive range [0, 6].
 *
 * Examples:
 * - maxSupplyWholeTokens(9)  -> "18.4B"   // typical 9-decimal mint
 * - maxSupplyWholeTokens(12) -> "18.4M"
 * - maxSupplyWholeTokens(18) -> "18"      // < 1K, returned as a plain number
 */
/** Returns the maximum whole-token supply (as bigint) for a given local decimal precision. */
export function localDecimalsToMaxSupply(localDecimals: number): bigint {
    if (!Number.isInteger(localDecimals) || localDecimals < 0) {
        throw new Error('localDecimals must be a non-negative integer')
    }
    const scalingFactor = 10n ** BigInt(localDecimals)
    return U64_MAX / scalingFactor
}

/**
 * Format a whole-token amount into a compact human-readable string using
 * unit suffixes: K (thousand), M (million), B (billion), T (trillion).
 *
 * Behavior:
 * - Values < 1000 are returned as a plain whole number string (no suffix).
 * - Rounds half up to the requested precision, but avoids unit roll-over by
 *   increasing fractional precision up to 6 when needed. For example,
 *   999_950_000_000 will render as "999.95B" instead of promoting to "1T".
 *
 * @param whole The whole-token quantity to format.
 * @param maxDisplayDecimals Fractional digits to include (0–6). Default 1.
 * @returns Human-readable string such as "18.4B", "1.0T", or "842".
 * @throws Error if maxDisplayDecimals is not an integer in [0, 6].
 */
export function formatAmount(whole: bigint, maxDisplayDecimals = 1): string {
    if (!Number.isInteger(maxDisplayDecimals) || maxDisplayDecimals < 0 || maxDisplayDecimals > 6) {
        throw new Error('precision must be an integer between 0 and 6')
    }

    for (let i = 0; i < UNITS.length; i++) {
        const { base, suffix } = UNITS[i]
        if (whole >= base) {
            // Try increasing precision up to 6 to avoid rolling over to the next unit
            for (let decimals = maxDisplayDecimals; decimals <= 6; decimals++) {
                const pow = 10n ** BigInt(decimals)
                const scaled = (whole * pow + base / 2n) / base // round half up
                const intPart = scaled / pow
                if (intPart < 1000n) {
                    const frac = scaled % pow
                    const fracStr = decimals === 0 ? '' : frac.toString().padStart(decimals, '0').replace(/0+$/, '')
                    return fracStr ? `${intPart}.${fracStr}${suffix}` : `${intPart}${suffix}`
                }
            }
            // If still >= 1000 after max precision, promote to the next unit (or keep at topmost)
            const next = i - 1 >= 0 ? UNITS[i - 1] : UNITS[i]
            const baseNext = next.base
            const suffixNext = next.suffix
            const pow = 10n ** BigInt(Math.max(maxDisplayDecimals, 1))
            const scaled = (whole * pow + baseNext / 2n) / baseNext
            const intPart = scaled / pow
            const frac = scaled % pow
            const fracStr = frac
                .toString()
                .padStart(Number(pow.toString().length - 1), '0')
                .replace(/0+$/, '')
            return fracStr ? `${intPart}.${fracStr}${suffixNext}` : `${intPart}${suffixNext}`
        }
    }

    // < 1K -> show plain whole number
    return whole.toString()
}
