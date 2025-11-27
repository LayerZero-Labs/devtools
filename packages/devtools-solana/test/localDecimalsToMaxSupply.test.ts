import { localDecimalsToMaxWholeTokens } from '../src/common/numbers'

describe('localDecimalsToMaxWholeTokens', () => {
    it('computes max supply for typical decimals', () => {
        const u64Max = (BigInt(1) << BigInt(64)) - BigInt(1)
        expect(localDecimalsToMaxWholeTokens(0)).toBe(u64Max)
        expect(localDecimalsToMaxWholeTokens(6)).toBe(u64Max / BigInt(10) ** BigInt(6))
        expect(localDecimalsToMaxWholeTokens(9)).toBe(u64Max / BigInt(10) ** BigInt(9))
        expect(localDecimalsToMaxWholeTokens(12)).toBe(u64Max / BigInt(10) ** BigInt(12))
        expect(localDecimalsToMaxWholeTokens(18)).toBe(u64Max / BigInt(10) ** BigInt(18))
    })

    it('throws on invalid inputs', () => {
        expect(() => localDecimalsToMaxWholeTokens(-1 as unknown as number)).toThrow()
        expect(() => localDecimalsToMaxWholeTokens(1.5 as unknown as number)).toThrow()
    })
})
