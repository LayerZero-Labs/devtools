// Format a whole-token amount into a compact human-readable string using unit suffixes.
// Supports: K (thousand), M (million), B (billion), T (trillion).

const UNITS = [
    { base: BigInt(1000) * BigInt(1000) * BigInt(1000) * BigInt(1000), suffix: 'T' },
    { base: BigInt(1000) * BigInt(1000) * BigInt(1000), suffix: 'B' },
    { base: BigInt(1000) * BigInt(1000), suffix: 'M' },
    { base: BigInt(1000), suffix: 'K' },
]

export function formatTokenAmount(rawAmount: bigint, maxDisplayDecimals = 1): string {
    if (!Number.isInteger(maxDisplayDecimals) || maxDisplayDecimals < 0 || maxDisplayDecimals > 6) {
        throw new Error('precision must be an integer between 0 and 6')
    }

    for (let i = 0; i < UNITS.length; i++) {
        const unit = UNITS[i]!
        const { base, suffix } = unit
        if (rawAmount >= base) {
            // Try increasing precision up to 6 to avoid rolling over to the next unit
            for (let decimals = maxDisplayDecimals; decimals <= 6; decimals++) {
                const pow = BigInt(10) ** BigInt(decimals)
                const scaled = (rawAmount * pow + base / BigInt(2)) / base // round half up
                const intPart = scaled / pow
                if (intPart < BigInt(1000)) {
                    const frac = scaled % pow
                    const fracStr = decimals === 0 ? '' : frac.toString().padStart(decimals, '0').replace(/0+$/, '')
                    return fracStr ? `${intPart}.${fracStr}${suffix}` : `${intPart}${suffix}`
                }
            }
            // If still >= 1000 after max precision, promote if necessary
            const nextIndex = Math.max(i - 1, 0)
            const nextUnit = UNITS[nextIndex]!
            const baseNext = nextUnit.base
            const suffixNext = nextUnit.suffix
            const pow = BigInt(10) ** BigInt(Math.max(maxDisplayDecimals, 1))
            const scaled = (rawAmount * pow + baseNext / BigInt(2)) / baseNext
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
    return rawAmount.toString()
}
