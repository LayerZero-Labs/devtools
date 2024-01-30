import fc from 'fast-check'
import { AddressZero } from '@ethersproject/constants'
import { evmAddressArbitrary } from '@layerzerolabs/test-devtools'
import { makeZeroAddress } from '@/address'

describe('address', () => {
    describe('makeZeroAddress', () => {
        it('should return address with non-zero address', () => {
            fc.assert(
                fc.property(evmAddressArbitrary, (address) => {
                    fc.pre(address !== AddressZero)

                    expect(makeZeroAddress(address)).toBe(address)
                })
            )
        })

        it('should return undefined with zero address', () => {
            expect(makeZeroAddress(AddressZero)).toBe(AddressZero)
        })

        it('should return undefined with undefined', () => {
            expect(makeZeroAddress(undefined)).toBe(AddressZero)
        })

        it('should return undefined with null', () => {
            expect(makeZeroAddress(null)).toBe(AddressZero)
        })
    })
})
