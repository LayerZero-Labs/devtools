/// <reference types="jest-extended" />

import fc from 'fast-check'
import { ZeroAddress } from 'ethers'
import { evmAddressArbitrary } from '@layerzerolabs/test-devtools'
import { addChecksum, makeZeroAddress } from '@/address'
import { isAddress } from 'ethers'

describe('address', () => {
    describe('makeZeroAddress', () => {
        it('should return address with non-zero address', () => {
            fc.assert(
                fc.property(evmAddressArbitrary, (address) => {
                    fc.pre(address !== ZeroAddress)

                    expect(makeZeroAddress(address)).toBe(address)
                })
            )
        })

        it('should return undefined with zero address', () => {
            expect(makeZeroAddress(ZeroAddress)).toBe(ZeroAddress)
        })

        it('should return undefined with undefined', () => {
            expect(makeZeroAddress(undefined)).toBe(ZeroAddress)
        })

        it('should return undefined with null', () => {
            expect(makeZeroAddress(null)).toBe(ZeroAddress)
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
