import fc from 'fast-check'
import { AddressZero } from '@ethersproject/constants'
import { evmAddressArbitrary } from '@layerzerolabs/test-utils'
import { ignoreZero, makeZero } from '@/address'
import { BigNumber, BigNumberish } from '@ethersproject/bignumber'
import { BigNumberishBigintSchema, BigNumberishSchema } from '@/schema'

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

    describe('BigNumberishBigintSchema', () => {
        it('should parse BigNumberish into a bigint', () => {
            fc.assert(
                fc.property(bigNumberishArbitrary, (bigNumberish) => {
                    const parsed = BigNumberishBigintSchema.parse(bigNumberish)

                    expect(typeof parsed).toBe('bigint')
                    expect(BigNumber.from(parsed)).toEqual(BigNumber.from(bigNumberish))
                })
            )
        })
    })
})
