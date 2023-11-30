import fc from 'fast-check'
import { AddressZero } from '@ethersproject/constants'
import { evmAddressArbitrary } from '@layerzerolabs/test-utils'
import { ignoreZero, makeZero } from '@/address'

describe('address', () => {
    describe('ignoreZero', () => {
        it('should return address with non-zero address', () => {
            fc.assert(
                fc.property(evmAddressArbitrary, (address) => {
                    fc.pre(address !== AddressZero)

                    expect(ignoreZero(address)).toBe(address)
                })
            )
        })

        it('should return undefined with zero address', () => {
            expect(ignoreZero(AddressZero)).toBe(undefined)
        })

        it('should return undefined with undefined', () => {
            expect(ignoreZero(undefined)).toBe(undefined)
        })

        it('should return undefined with null', () => {
            expect(ignoreZero(null)).toBe(undefined)
        })
    })

    describe('makeZero', () => {
        it('should return address with non-zero address', () => {
            fc.assert(
                fc.property(evmAddressArbitrary, (address) => {
                    fc.pre(address !== AddressZero)

                    expect(makeZero(address)).toBe(address)
                })
            )
        })

        it('should return undefined with zero address', () => {
            expect(makeZero(AddressZero)).toBe(AddressZero)
        })

        it('should return undefined with undefined', () => {
            expect(makeZero(undefined)).toBe(AddressZero)
        })

        it('should return undefined with null', () => {
            expect(makeZero(null)).toBe(AddressZero)
        })
    })
})
