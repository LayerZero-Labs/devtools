import fc from 'fast-check'
import { AddressZero } from '@ethersproject/constants'
import { evmAddressArbitrary, evmBytes32Arbitrary } from '@layerzerolabs/test-devtools'
import { areBytes32Equal, compareBytes32Ascending, ignoreZero, isZero, makeBytes32 } from '@/common/bytes'

describe('bytes', () => {
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
        const zeroishBytes32Arbitrary = fc.constantFrom(null, undefined, '0x', '0x0', AddressZero, ZERO_BYTES)

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

        it('should return true for identical UInt8Arrays', () => {
            fc.assert(
                fc.property(fc.uint8Array({ minLength: 1 }), (bytes) => {
                    expect(areBytes32Equal(bytes, bytes)).toBe(true)
                })
            )
        })

        it('should return true for a UInt8Array & its hex representation', () => {
            fc.assert(
                fc.property(fc.uint8Array({ minLength: 1, maxLength: 32 }), (bytes) => {
                    expect(areBytes32Equal(bytes, makeBytes32(bytes))).toBe(true)
                })
            )
        })

        it('should return false two non-matching UInt8Array instances', () => {
            fc.assert(
                fc.property(
                    fc.uint8Array({ minLength: 1, maxLength: 32 }),
                    fc.uint8Array({ minLength: 1, maxLength: 32 }),
                    (a, b) => {
                        // We need to filter out matching arrays
                        fc.pre(
                            // We walk over the first array and check that there is at least one non-matching element
                            //
                            // We default any missing (undefined) values in the second array to 0
                            // since any leading zeros are equal to undefined
                            a.some((v, i) => v !== b[i] || 0) ||
                                // And we do the same for the second array (since we don't know which one lis longer)
                                b.some((v, i) => v !== a[i] || 0)
                        )

                        expect(areBytes32Equal(a, b)).toBe(false)
                    }
                )
            )
        })

        it('should return false two a UInt8Array & non-matching hex string', () => {
            fc.assert(
                fc.property(
                    fc.uint8Array({ minLength: 1, maxLength: 32 }),
                    fc.uint8Array({ minLength: 1, maxLength: 32 }),
                    (a, b) => {
                        fc.pre(
                            // We walk over the first array and check that there is at least one non-matching element
                            //
                            // We default any missing (undefined) values in the second array to 0
                            // since any leading zeros are equal to undefined
                            a.some((v, i) => v !== b[i]) ||
                                // And we do the same for the second array (since we don't know which one lis longer)
                                b.some((v, i) => v !== a[i])
                        )

                        expect(areBytes32Equal(a, makeBytes32(b))).toBe(false)
                    }
                )
            )
        })
    })

    describe('isZero', () => {
        it('should return true with zero bytes32', () => {
            expect(isZero(makeBytes32(AddressZero))).toBe(true)
        })

        it('should return true with zero bytes32 string', () => {
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

        it('should return true with an empty UInt8Array', () => {
            expect(isZero(new Uint8Array(0))).toBe(true)
        })

        it('should return true with a zero-only UInt8Array', () => {
            fc.assert(
                fc.property(fc.uint8Array({ min: 0, max: 0 }), (bytes) => {
                    expect(isZero(bytes)).toBe(true)
                })
            )
        })

        it('should return false with a non-zero UInt8Array', () => {
            fc.assert(
                fc.property(fc.uint8Array({ minLength: 1 }), (bytes) => {
                    fc.pre(bytes.some((byte) => byte !== 0))

                    expect(isZero(bytes)).toBe(false)
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

    describe('compareBytes32Ascending', () => {
        it('should return 0 for two identical addresses', () => {
            fc.assert(
                fc.property(evmAddressArbitrary, (address) => {
                    expect(compareBytes32Ascending(address, address)).toBe(0)
                    expect(compareBytes32Ascending(address, makeBytes32(address))).toBe(0)
                    expect(compareBytes32Ascending(makeBytes32(address), makeBytes32(address))).toBe(0)
                })
            )
        })

        it('should return a negative value for zero address and any other address', () => {
            fc.assert(
                fc.property(evmAddressArbitrary, (address) => {
                    fc.pre(!isZero(address))

                    expect(compareBytes32Ascending(AddressZero, address)).toBeLessThan(0)
                    expect(compareBytes32Ascending(AddressZero, makeBytes32(address))).toBeLessThan(0)
                    expect(compareBytes32Ascending(makeBytes32(AddressZero), address)).toBeLessThan(0)
                    expect(compareBytes32Ascending(makeBytes32(AddressZero), makeBytes32(address))).toBeLessThan(0)
                })
            )
        })

        it('should return a positive value for zero address and any other address', () => {
            fc.assert(
                fc.property(evmAddressArbitrary, (address) => {
                    fc.pre(!isZero(address))

                    expect(compareBytes32Ascending(address, AddressZero)).toBeGreaterThan(0)
                    expect(compareBytes32Ascending(makeBytes32(address), AddressZero)).toBeGreaterThan(0)
                    expect(compareBytes32Ascending(address, makeBytes32(AddressZero))).toBeGreaterThan(0)
                    expect(compareBytes32Ascending(makeBytes32(address), makeBytes32(AddressZero))).toBeGreaterThan(0)
                })
            )
        })

        it('should return a negative if address comes before the other address', () => {
            fc.assert(
                fc.property(evmAddressArbitrary, evmAddressArbitrary, (addressA, addressB) => {
                    fc.pre(addressA.toLowerCase() < addressB.toLowerCase())

                    expect(compareBytes32Ascending(addressA, addressB)).toBeLessThan(0)
                    expect(compareBytes32Ascending(addressA, makeBytes32(addressB))).toBeLessThan(0)
                    expect(compareBytes32Ascending(makeBytes32(addressA), addressB)).toBeLessThan(0)
                    expect(compareBytes32Ascending(makeBytes32(addressA), makeBytes32(addressB))).toBeLessThan(0)
                })
            )
        })

        it('should return a negative if address comes after the other address', () => {
            fc.assert(
                fc.property(evmAddressArbitrary, evmAddressArbitrary, (addressA, addressB) => {
                    fc.pre(addressA.toLowerCase() > addressB.toLowerCase())

                    expect(compareBytes32Ascending(addressA, addressB)).toBeGreaterThan(0)
                    expect(compareBytes32Ascending(makeBytes32(addressA), addressB)).toBeGreaterThan(0)
                    expect(compareBytes32Ascending(addressA, makeBytes32(addressB))).toBeGreaterThan(0)
                    expect(compareBytes32Ascending(makeBytes32(addressA), makeBytes32(addressB))).toBeGreaterThan(0)
                })
            )
        })
    })
})
