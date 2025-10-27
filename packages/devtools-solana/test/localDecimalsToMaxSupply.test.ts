import { localDecimalsToMaxSupply } from '../src/common/numbers'

describe('localDecimalsToMaxSupply', () => {
    it('computes max supply for typical decimals', () => {
        const u64Max = (BigInt(1) << BigInt(64)) - BigInt(1)
        expect(localDecimalsToMaxSupply(0)).toBe(u64Max)
        expect(localDecimalsToMaxSupply(6)).toBe(u64Max / BigInt(10) ** BigInt(6))
        expect(localDecimalsToMaxSupply(9)).toBe(u64Max / BigInt(10) ** BigInt(9))
        expect(localDecimalsToMaxSupply(12)).toBe(u64Max / BigInt(10) ** BigInt(12))
        expect(localDecimalsToMaxSupply(18)).toBe(u64Max / BigInt(10) ** BigInt(18))
    })

    it('throws on invalid inputs', () => {
        expect(() => localDecimalsToMaxSupply(-1 as unknown as number)).toThrow()
        expect(() => localDecimalsToMaxSupply(1.5 as unknown as number)).toThrow()
    })
})
