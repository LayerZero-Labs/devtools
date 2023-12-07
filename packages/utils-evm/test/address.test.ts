import fc from 'fast-check'
import { AddressZero } from '@ethersproject/constants'
import { evmAddressArbitrary, evmBytes32Arbitrary } from '@layerzerolabs/test-utils'
import { ignoreZero, isZero, makeBytes32, makeZeroAddress } from '@/address'

describe('address', () => {
    const ZERO_BYTES = '0x0000000000000000000000000000000000000000000000000000000000000000'

    describe('makeBytes32', () => {
        it('should return zero value with empty bytes32', () => {
            expect(makeBytes32(ZERO_BYTES)).toBe(ZERO_BYTES)
        })

        it('should return zero value with empty string', () => {
            expect(makeBytes32('')).toBe(ZERO_BYTES)
        })

        it('should return zero value with zero address', () => {
            expect(makeBytes32(AddressZero)).toBe(ZERO_BYTES)
        })

        it('should return zero value with undefined', () => {
            expect(makeBytes32(undefined)).toBe(ZERO_BYTES)
        })

        it('should return zero value with null', () => {
            expect(makeBytes32(null)).toBe(ZERO_BYTES)
        })

        it('should return zero value with empty bytes', () => {
            expect(makeBytes32('0x')).toBe(ZERO_BYTES)
        })

        it('should return padded values for address', () => {
            fc.assert(
                fc.property(evmAddressArbitrary, (address) => {
                    const bytes = makeBytes32(address)

                    expect(bytes.length).toBe(66)
                    expect(BigInt(bytes)).toBe(BigInt(address))
                })
            )
        })

        it('should return identity for bytes32', () => {
            fc.assert(
                fc.property(evmBytes32Arbitrary, (bytes) => {
                    expect(makeBytes32(bytes)).toBe(bytes)
                })
            )
        })
    })

    describe('isZero', () => {
        it('should return true with zero bytes32', () => {
            expect(isZero(makeBytes32(AddressZero))).toBe(true)
        })

        it('should return true with zero bytes32', () => {
            expect(isZero('0x')).toBe(true)
        })

        it('should return true with zero address', () => {
            expect(isZero(AddressZero)).toBe(true)
        })

        it('should return true with undefined', () => {
            expect(isZero(undefined)).toBe(true)
        })

        it('should return true with null', () => {
            expect(isZero(null)).toBe(true)
        })

        it('should return false with non-zero address', () => {
            fc.assert(
                fc.property(evmAddressArbitrary, (address) => {
                    fc.pre(address !== AddressZero)

                    expect(isZero(address)).toBe(false)
                })
            )
        })

        it('should return false with non-zero bytes32', () => {
            fc.assert(
                fc.property(evmBytes32Arbitrary, (address) => {
                    fc.pre(address !== ZERO_BYTES)

                    expect(isZero(address)).toBe(false)
                })
            )
        })
    })

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
