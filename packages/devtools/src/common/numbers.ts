/**
 * Formats a bigint token amount using compact notation (e.g. 1.2K, 3.4M).
 * Throws when `maxDisplayDecimals` is outside the inclusive range [0, 6].
 *
 * @param rawAmount - Token amount represented as a bigint.
 * @param maxDisplayDecimals - Maximum fractional digits to show in compact form.
 * @returns A locale-formatted compact string.
 */
export function formatTokenAmountCompact(rawAmount: bigint, maxDisplayDecimals = 1): string {
    if (!Number.isInteger(maxDisplayDecimals) || maxDisplayDecimals < 0 || maxDisplayDecimals > 6) {
        throw new Error('maxDisplayDecimals must be an integer between 0 and 6')
    }

    return new Intl.NumberFormat('en-US', {
        notation: 'compact',
        maximumFractionDigits: maxDisplayDecimals,
        roundingMode: 'floor',
    }).format(Number(rawAmount))
}
