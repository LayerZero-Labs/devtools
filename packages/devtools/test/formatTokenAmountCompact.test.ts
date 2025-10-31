import { formatTokenAmountCompact } from '../src/common/numbers'

describe('formatTokenAmountCompact', () => {
    it('returns plain number for values < 1000', () => {
        expect(formatTokenAmountCompact(BigInt(0))).toBe('0')
        expect(formatTokenAmountCompact(BigInt(1))).toBe('1')
        expect(formatTokenAmountCompact(BigInt(842))).toBe('842')
        expect(formatTokenAmountCompact(BigInt(999))).toBe('999')
    })

    it('formats thousands with K suffix', () => {
        expect(formatTokenAmountCompact(BigInt(1000))).toBe('1K')
        expect(formatTokenAmountCompact(BigInt(1234))).toBe('1.2K')
        expect(formatTokenAmountCompact(BigInt(12345))).toBe('12.3K')
        expect(formatTokenAmountCompact(BigInt(999999))).toBe('999.9K')
    })

    it('formats millions with M suffix', () => {
        expect(formatTokenAmountCompact(BigInt(1_000_000))).toBe('1M')
        expect(formatTokenAmountCompact(BigInt(1_000_000))).not.toBe('1000K')
        expect(formatTokenAmountCompact(BigInt(1_234_567))).toBe('1.2M')
        expect(formatTokenAmountCompact(BigInt(12_345_678))).toBe('12.3M')
    })

    it('formats billions with B suffix (no 1000M rollover)', () => {
        expect(formatTokenAmountCompact(BigInt(1_000_000_000))).toBe('1B')
        expect(formatTokenAmountCompact(BigInt(1_000_000_000))).not.toBe('1000M')
    })

    it('handles values near 1T boundary without unintended rollover', () => {
        expect(formatTokenAmountCompact(BigInt(999_400_000_000))).toBe('999.4B')
        expect(formatTokenAmountCompact(BigInt(999_600_000_000), 1)).toBe('999.6B')
        expect(formatTokenAmountCompact(BigInt(999_950_000_000), 1)).toBe('999.9B')
    })

    it('formats trillions with T suffix', () => {
        expect(formatTokenAmountCompact(BigInt(1_000_000_000_000))).toBe('1T')
        expect(formatTokenAmountCompact(BigInt(2_500_000_000_000))).toBe('2.5T')
    })

    it('respects maxDisplayDecimals = 0 (no fractional part)', () => {
        expect(formatTokenAmountCompact(BigInt(1_234_567), 0)).toBe('1M')
        expect(formatTokenAmountCompact(BigInt(999_400_000_000), 0)).toBe('999B')
    })

    it('trims trailing zeros in fractional part', () => {
        expect(formatTokenAmountCompact(BigInt(1_500_000), 2)).toBe('1.5M')
        expect(formatTokenAmountCompact(BigInt(12_340_000), 3)).toBe('12.34M')
    })

    it('throws on invalid precision values', () => {
        expect(() => formatTokenAmountCompact(BigInt(1_000), -1 as unknown as number)).toThrow()
        expect(() => formatTokenAmountCompact(BigInt(1_000), 7)).not.toThrow()
        expect(() => formatTokenAmountCompact(BigInt(1_000), 1.5 as unknown as number)).toThrow()
    })
})
