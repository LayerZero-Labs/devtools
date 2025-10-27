import { formatTokenAmount } from '../../tasks/solana/utils'

describe('formatTokenAmount', () => {
    it('returns plain number for values < 1000', () => {
        expect(formatTokenAmount(0n)).toBe('0')
        expect(formatTokenAmount(1n)).toBe('1')
        expect(formatTokenAmount(842n)).toBe('842')
        expect(formatTokenAmount(999n)).toBe('999')
    })

    it('formats thousands with K suffix', () => {
        expect(formatTokenAmount(1_000n)).toBe('1K')
        expect(formatTokenAmount(1_234n)).toBe('1.2K')
        expect(formatTokenAmount(12_345n)).toBe('12.3K')
        expect(formatTokenAmount(999_999n)).toBe('999.999K')
    })

    it('formats millions with M suffix', () => {
        expect(formatTokenAmount(1_000_000n)).toBe('1M')
        expect(formatTokenAmount(1_000_000n)).not.toBe('1000K')
        expect(formatTokenAmount(1_234_567n)).toBe('1.2M')
        expect(formatTokenAmount(12_345_678n)).toBe('12.3M')
    })

    it('formats billions with B suffix (no 1000M rollover)', () => {
        expect(formatTokenAmount(1_000_000_000n)).toBe('1B')
        expect(formatTokenAmount(1_000_000_000n)).not.toBe('1000M')
    })

    it('formats billions with B suffix', () => {
        // Values near 1T boundary round half-up to T at 999.95B
        expect(formatTokenAmount(999_400_000_000n)).toBe('999.4B')
        expect(formatTokenAmount(999_600_000_000n, 1)).toBe('999.6B')
        expect(formatTokenAmount(999_950_000_000n, 1)).toBe('999.95B')
    })

    it('formats trillions with T suffix', () => {
        expect(formatTokenAmount(1_000_000_000_000n)).toBe('1T')
        expect(formatTokenAmount(2_500_000_000_000n)).toBe('2.5T')
    })

    it('respects maxDisplayDecimals = 0 (no fractional part)', () => {
        expect(formatTokenAmount(1_234_567n, 0)).toBe('1M')
        expect(formatTokenAmount(999_400_000_000n, 0)).toBe('999B')
    })

    it('trims trailing zeros in fractional part', () => {
        expect(formatTokenAmount(1_500_000n, 2)).toBe('1.5M')
        expect(formatTokenAmount(12_340_000n, 3)).toBe('12.34M')
    })

    it('throws on invalid precision values', () => {
        expect(() => formatTokenAmount(1_000n, -1 as unknown as number)).toThrow()
        expect(() => formatTokenAmount(1_000n, 7)).toThrow()
        expect(() => formatTokenAmount(1_000n, 1.5 as unknown as number)).toThrow()
    })
})
