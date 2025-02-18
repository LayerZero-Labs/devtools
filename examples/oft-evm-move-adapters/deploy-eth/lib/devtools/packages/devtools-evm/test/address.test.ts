/// <reference types="jest-extended" />

import fc from 'fast-check'
import { AddressZero } from '@ethersproject/constants'
import { evmAddressArbitrary } from '@layerzerolabs/test-devtools'
import { addChecksum, makeZeroAddress } from '@/address'
import { isAddress } from '@ethersproject/address'

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

    describe('addChecksum', () => {
        it('should return the same address, just checksumed', () => {
            fc.assert(
                fc.property(evmAddressArbitrary, (address) => {
                    expect(addChecksum(address)).toEqualCaseInsensitive(address)
                })
            )
        })

        it('should return a valid EVM address', () => {
            fc.assert(
                fc.property(evmAddressArbitrary, (address) => {
                    expect(isAddress(addChecksum(address))).toBe(true)
                })
            )
        })
    })
})
