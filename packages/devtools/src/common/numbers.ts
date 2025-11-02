/**
 * Formats a bigint token amount using compact notation (e.g. 1.2K, 3.4M).
 * Throws when `maxDisplayDecimals` less than 0.
 *
 * @param rawAmount - Token amount represented as a bigint.
 * @param maxDisplayDecimals - Maximum fractional digits to show in compact form.
 * @returns An object containing both full and compact string representations.
 */
export function formatTokenAmount(rawAmount: bigint, maxDisplayDecimals = 1): { full: string; compact: string } {
    if (!Number.isInteger(maxDisplayDecimals) || maxDisplayDecimals < 0) {
        throw new Error('maxDisplayDecimals must be an integer between 0 and 6')
    }
    const full = new Intl.NumberFormat('en-US').format(rawAmount)
    const compact = new Intl.NumberFormat('en-US', {
        notation: 'compact',
        maximumFractionDigits: maxDisplayDecimals,
        roundingMode: 'floor',
    }).format(Number(rawAmount))

    return {
        full,
        compact,
    }
}
