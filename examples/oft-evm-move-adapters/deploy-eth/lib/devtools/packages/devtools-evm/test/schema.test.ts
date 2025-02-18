import fc from 'fast-check'
import { BigNumber, BigNumberish } from '@ethersproject/bignumber'
import { BigNumberishBigIntSchema, BigNumberishNumberSchema, BigNumberishSchema } from '@/schema'

describe('schema', () => {
    const bigIntArbitrary = fc.bigInt()
    const uintArbitrary = fc.integer({ min: 0 })
    const bigIntStringArbitrary = bigIntArbitrary.map(String)
    const bigNumberArbitrary = bigIntStringArbitrary.map(BigNumber.from)
    const bytesArbitrary = fc.array(fc.integer({ min: 0, max: 255 }), { minLength: 1 })
    const bigNumberishArbitrary: fc.Arbitrary<BigNumberish> = fc.oneof(
        bigIntArbitrary,
        uintArbitrary,
        bigIntStringArbitrary,
        bigNumberArbitrary,
        bytesArbitrary
    )

    describe('BigNumberishSchema', () => {
        it('should parse BigNumberish', () => {
            fc.assert(
                fc.property(bigNumberishArbitrary, (bigNumberish) => {
                    expect(BigNumberishSchema.parse(bigNumberish)).toBe(bigNumberish)
                })
            )
        })
    })

    describe('BigNumberishBigIntSchema', () => {
        it('should parse BigNumberish into a bigint', () => {
            fc.assert(
                fc.property(bigNumberishArbitrary, (bigNumberish) => {
                    const parsed = BigNumberishBigIntSchema.parse(bigNumberish)

                    expect(typeof parsed).toBe('bigint')
                    expect(BigNumber.from(parsed)).toEqual(BigNumber.from(bigNumberish))
                })
            )
        })
    })

    describe('BigNumberishNumberSchema', () => {
        it('should parse BigNumberish into a number if within bounds', () => {
            fc.assert(
                fc.property(bigNumberishArbitrary, (bigNumberish) => {
                    fc.pre(BigNumber.from(bigNumberish).abs().lte(BigInt(Number.MAX_SAFE_INTEGER)))

                    const parsed = BigNumberishNumberSchema.parse(bigNumberish)

                    expect(typeof parsed).toBe('number')
                    expect(BigNumber.from(parsed)).toEqual(BigNumber.from(bigNumberish))
                })
            )
        })

        it('should throw an error if there is an overflow', () => {
            fc.assert(
                fc.property(bigNumberishArbitrary, (bigNumberish) => {
                    fc.pre(BigNumber.from(bigNumberish).abs().gt(BigInt(Number.MAX_SAFE_INTEGER)))

                    expect(() => BigNumberishNumberSchema.parse(bigNumberish)).toThrow('overflow')
                })
            )
        })
    })
})
