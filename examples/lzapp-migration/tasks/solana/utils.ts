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

export const MAX_RECOMMENDED_LOCAL_DECIMALS = 6

// Max whole-token supply on Solana (u64)
const U64_MAX = (1n << 64n) - 1n
const UNITS = [
    { base: 1_000_000_000_000n, suffix: 'T' },
    { base: 1_000_000_000n, suffix: 'B' },
    { base: 1_000_000n, suffix: 'M' },
    { base: 1_000n, suffix: 'K' },
]

/**
 * Max whole-token supply on Solana for a given localDecimals,
 * formatted as T/B/M/K, else plain number. Rounded half up.
 */
export function maxSupplyHuman(localDecimals: number, precision = 1): string {
    if (!Number.isInteger(localDecimals) || localDecimals < 0) {
        throw new Error('localDecimals must be a non-negative integer')
    }
    if (!Number.isInteger(precision) || precision < 0 || precision > 6) {
        throw new Error('precision must be an integer between 0 and 6')
    }

    const denom = 10n ** BigInt(localDecimals)
    const whole = U64_MAX / denom

    for (let i = 0; i < UNITS.length; i++) {
        const { base, suffix } = UNITS[i]
        if (whole >= base) {
            const pow = 10n ** BigInt(precision)
            let scaled = (whole * pow + base / 2n) / base
            let intPart = scaled / pow

            if (intPart >= 1000n && i === 1) {
                const higher = UNITS[0]
                scaled = (whole * pow + higher.base / 2n) / higher.base
                intPart = scaled / pow
                const frac = scaled % pow
                const fracStr = precision === 0 ? '' : frac.toString().padStart(precision, '0').replace(/0+$/, '')
                return fracStr ? `${intPart}.${fracStr}${higher.suffix}` : `${intPart}${higher.suffix}`
            }

            const frac = scaled % pow
            const fracStr = precision === 0 ? '' : frac.toString().padStart(precision, '0').replace(/0+$/, '')
            return fracStr ? `${intPart}.${fracStr}${suffix}` : `${intPart}${suffix}`
        }
    }

    return whole.toString()
}
