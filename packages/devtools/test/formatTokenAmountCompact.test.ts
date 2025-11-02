import { formatTokenAmount } from '../src/common/numbers'

describe('formatTokenAmount', () => {
    it('returns plain number for values < 1000', () => {
        expect(formatTokenAmount(BigInt(0)).compact).toBe('0')
        expect(formatTokenAmount(BigInt(1)).compact).toBe('1')
        expect(formatTokenAmount(BigInt(842)).compact).toBe('842')
        expect(formatTokenAmount(BigInt(999)).compact).toBe('999')
    })

    it('formats thousands with K suffix', () => {
        expect(formatTokenAmount(BigInt(1000)).compact).toBe('1K')
        expect(formatTokenAmount(BigInt(1234)).compact).toBe('1.2K')
        expect(formatTokenAmount(BigInt(12345)).compact).toBe('12.3K')
        expect(formatTokenAmount(BigInt(999999)).compact).toBe('999.9K')
    })

    it('formats millions with M suffix', () => {
        expect(formatTokenAmount(BigInt(1_000_000)).compact).toBe('1M')
        expect(formatTokenAmount(BigInt(1_000_000)).compact).not.toBe('1000K')
        expect(formatTokenAmount(BigInt(1_234_567)).compact).toBe('1.2M')
        expect(formatTokenAmount(BigInt(12_345_678)).compact).toBe('12.3M')
    })

    it('formats billions with B suffix (no 1000M rollover)', () => {
        expect(formatTokenAmount(BigInt(1_000_000_000)).compact).toBe('1B')
        expect(formatTokenAmount(BigInt(1_000_000_000)).compact).not.toBe('1000M')
    })

    it('handles values near 1T boundary without unintended rollover', () => {
        expect(formatTokenAmount(BigInt(999_400_000_000)).compact).toBe('999.4B')
        expect(formatTokenAmount(BigInt(999_600_000_000), 1).compact).toBe('999.6B')
        expect(formatTokenAmount(BigInt(999_950_000_000), 1).compact).toBe('999.9B')
    })

    it('formats trillions with T suffix', () => {
        expect(formatTokenAmount(BigInt(1_000_000_000_000)).compact).toBe('1T')
        expect(formatTokenAmount(BigInt(2_500_000_000_000)).compact).toBe('2.5T')
    })

    it('respects maxDisplayDecimals = 0 (no fractional part)', () => {
        expect(formatTokenAmount(BigInt(1_234_567), 0).compact).toBe('1M')
        expect(formatTokenAmount(BigInt(999_400_000_000), 0).compact).toBe('999B')
    })

    it('trims trailing zeros in fractional part', () => {
        expect(formatTokenAmount(BigInt(1_500_000), 2).compact).toBe('1.5M')
        expect(formatTokenAmount(BigInt(12_340_000), 3).compact).toBe('12.34M')
    })

    it('returns full locale string', () => {
        expect(formatTokenAmount(BigInt(0)).full).toBe('0')
        expect(formatTokenAmount(BigInt(1234)).full).toBe('1,234')
        expect(formatTokenAmount(BigInt(1_234_567)).full).toBe('1,234,567')
        expect(formatTokenAmount(BigInt(1_000_000_000)).full).toBe('1,000,000,000')
    })

    it('returns both full and compact properties', () => {
        const result = formatTokenAmount(BigInt(1_234_567))
        expect(result).toHaveProperty('full')
        expect(result).toHaveProperty('compact')
        expect(result.full).toBe('1,234,567')
        expect(result.compact).toBe('1.2M')
    })

    it('throws on invalid precision values', () => {
        expect(() => formatTokenAmount(BigInt(1_000), -1 as unknown as number)).toThrow()
        expect(() => formatTokenAmount(BigInt(1_000), 7)).not.toThrow()
        expect(() => formatTokenAmount(BigInt(1_000), 1.5 as unknown as number)).toThrow()
    })
})
