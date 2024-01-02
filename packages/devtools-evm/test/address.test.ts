import fc from 'fast-check'
import { AddressZero } from '@ethersproject/constants'
import { evmAddressArbitrary, evmBytes32Arbitrary } from '@layerzerolabs/test-devtools'
import { areBytes32Equal, ignoreZero, isZero, makeBytes32, makeZeroAddress } from '@/address'

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

    describe('areBytes32Equal', () => {
        const zeroishBytes32Arbitrary = fc.constantFrom(null, undefined, '0x', '0x0', makeZeroAddress(), ZERO_BYTES)

        it('should return true for two nullish values', () => {
            fc.assert(
                fc.property(zeroishBytes32Arbitrary, zeroishBytes32Arbitrary, (a, b) => {
                    expect(areBytes32Equal(a, b)).toBe(true)
                })
            )
        })

        it('should return true for two identical values', () => {
            fc.assert(
                fc.property(evmBytes32Arbitrary, (a) => {
                    expect(areBytes32Equal(a, a)).toBe(true)
                })
            )
        })

        it('should return true for an address and bytes', () => {
            fc.assert(
                fc.property(evmAddressArbitrary, (address) => {
                    expect(areBytes32Equal(address, makeBytes32(address))).toBe(true)
                })
            )
        })

        it('should return false for a zeroish value and a non-zeroish address', () => {
            fc.assert(
                fc.property(zeroishBytes32Arbitrary, evmAddressArbitrary, (bytes, address) => {
                    fc.pre(!isZero(address))

                    expect(areBytes32Equal(bytes, address)).toBe(false)
                })
            )
        })

        it('should return false for a zeroish value and a non-zeroish bytes', () => {
            fc.assert(
                fc.property(zeroishBytes32Arbitrary, evmBytes32Arbitrary, (a, b) => {
                    fc.pre(!isZero(b))

                    expect(areBytes32Equal(a, b)).toBe(false)
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
