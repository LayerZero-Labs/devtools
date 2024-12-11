import { formatEid } from '@/omnigraph'
import type { OmniAddress, PossiblyBigInt, PossiblyBytes } from '@/types'
import { hexZeroPad } from '@ethersproject/bytes'
import { ChainType, EndpointId, endpointIdToChainType } from '@layerzerolabs/lz-definitions'
import assert from 'assert'
import bs58 from 'bs58'

/**
 * Converts an address into Bytes32 by padding it with zeros.
 *
 * It will return zero bytes if passed `null`, `undefined` or an empty string.
 *
 * @param {PossiblyBytes | null | undefined} bytes
 * @returns {string}
 */
export const makeBytes32 = (bytes?: PossiblyBytes | null | undefined): string => hexZeroPad(bytes || '0x0', 32)

/**
 * Compares two Bytes32-like values by value (i.e. ignores casing on strings
 * and string length)
 *
 * @param {PossiblyBytes | null | undefined} a
 * @param {PossiblyBytes | null | undefined} b
 * @returns {boolean}
 */
export const areBytes32Equal = (a: PossiblyBytes | null | undefined, b: PossiblyBytes | null | undefined): boolean =>
    BigInt(makeBytes32(a)) === BigInt(makeBytes32(b))

/**
 * Checks whether a value is a zero value.
 *
 * It will return true if passed `null`, `undefined`, empty bytes ('0x') or an empty string.
 *
 * It will throw an error if the value is not a valid numerical value.
 *
 * @param {PossiblyBytes | PossiblyBigInt | null | undefined} value
 * @returns {boolean}
 */
export const isZero = (value: PossiblyBytes | PossiblyBigInt | null | undefined): boolean => {
    switch (true) {
        case value === '0x':
        case value == null:
            return true

        case typeof value === 'string':
        case typeof value === 'number':
        case typeof value === 'bigint':
            return BigInt(value) === BigInt(0)

        default:
            return value.every((byte) => byte === 0)
    }
}

/**
 * Turns a potentially zero address into undefined
 *
 * @param {PossiblyBytes | PossiblyBigInt | null | undefined} value
 *
 * @returns {string | undefined}
 */
export const ignoreZero = <T extends PossiblyBytes | PossiblyBigInt>(value?: T | null | undefined): T | undefined =>
    isZero(value) ? undefined : value ?? undefined

/**
 * Helper function to be used when sorting of addresses is necessary.
 *
 * This can be used to sort arrays of addresses in ascending manner:
 *
 * ```
 * // The result will be ["0x000000000000000000636F6e736F6c652e6c6f67", "0xEe6cF2E1Bc7645F8439d241ce37820305F2BB3F8"]
 * ["0xEe6cF2E1Bc7645F8439d241ce37820305F2BB3F8", "0x000000000000000000636F6e736F6c652e6c6f67"].sort(compareBytes32Ascending)
 * ```
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/localeCompare}
 *
 * @param {PossiblyBytes} a
 * @param {PossiblyBytes} b
 * @returns {number} `0` when the two are interchangeable, a negative value when `a` comes before `b` and a positive value when `a` comes after `b`
 */
export const compareBytes32Ascending = (a: PossiblyBytes, b: PossiblyBytes): number =>
    Number(BigInt(makeBytes32(a)) - BigInt(makeBytes32(b)))

/**
 * Normalizes a network-specific peer address into a byte array with length of 32.
 *
 * @param {OmniAddress} address
 * @param {EndpointId} eid
 * @returns {Uint8Array}
 */
export const normalizePeer = (address: OmniAddress | null | undefined, eid: EndpointId): Uint8Array => {
    if (address == null) {
        return new Uint8Array(32)
    }

    const chainType = endpointIdToChainType(eid)

    switch (chainType) {
        case ChainType.SOLANA:
            return bs58.decode(address)

        case ChainType.APTOS:
        case ChainType.EVM:
            return toBytes32(fromHex(address))

        case ChainType.TON:
            return fromHex(address)

        default:
            throw new Error(`normalizePeer: Unsupported chain type ${chainType} ${formatEid(eid)}`)
    }
}

/**
 * Denormalizes Bytes32 representing a peer address into a network-specific peer address.
 *
 * @param {Uint8Array} bytes
 * @param {EndpointId} eid
 * @returns {OmniAddress}
 */
export const denormalizePeer = (bytes: Uint8Array | null | undefined, eid: EndpointId): OmniAddress | undefined => {
    if (bytes == null || isZero(bytes)) {
        return undefined
    }

    const chainType = endpointIdToChainType(eid)

    switch (chainType) {
        case ChainType.SOLANA:
            return bs58.encode(toBytes32(bytes))

        case ChainType.APTOS:
            return toHex(toBytes32(bytes))

        case ChainType.EVM:
            return toHex(toBytes20(bytes))

        case ChainType.TON:
            return toHex(bytes)

        default:
            throw new Error(`denormalizePeer: Unsupported chain type ${chainType} ${formatEid(eid)}`)
    }
}

/**
 * Helper utility that left-pads a `Uint8Array` to be 32 bytes in length.
 *
 * This function will check that only the rightmost 32 bytes are non-zero
 * and will throw otherwise.
 *
 * @param {Uint8Array} bytes A `Uint8Array` with the all but the rightmost 32 bytes set to zero.
 * @returns {Uint8Array} A `Uint8Array` of length 32.
 */
const toBytes32 = (bytes: Uint8Array): Uint8Array => {
    assertZeroBytes(
        getLeftPadding(bytes, 32),
        `Cannot convert an array with more than 32 non-zero bytes into Bytes32. Got ${bytes} with length ${bytes.length}`
    )

    const bytes32 = new Uint8Array(32)

    return bytes32.set(bytes, 32 - bytes.length), bytes32
}

/**
 * Helper utility that left-pads a `Uint8Array` to be 20 bytes in length.
 *
 * This function will check that only the rightmost 20 bytes are non-zero
 * and will throw otherwise.
 *
 * @param {Uint8Array} bytes A `Uint8Array` with the all but the rightmost 20 bytes set to zero.
 * @returns {Uint8Array} A `Uint8Array` of length 32.
 */
const toBytes20 = (bytes: Uint8Array): Uint8Array => {
    assertZeroBytes(
        getLeftPadding(bytes, 20),
        `Cannot convert an array with more than 20 non-zero bytes into Bytes20. Got ${bytes} with length ${bytes.length}`
    )

    return new Uint8Array(bytes.slice(-20))
}

/**
 * Helper utility to convert `UInt8Array` into a hex string (with leading `0x`)
 *
 * @param {Uint8Array} bytes
 * @returns {string}
 */
export const toHex = (bytes: Uint8Array): string => `0x${Buffer.from(bytes).toString('hex')}`

/**
 * Helper utility to convert a hex string (with or without leading `0x`) to `UInt8Array`
 *
 * @param {string} hex
 * @returns {Uint8Array}
 */
export const fromHex = (hex: string): Uint8Array => Uint8Array.from(Buffer.from(hex.replace(/^0x/, ''), 'hex'))

/**
 * Helper utility that returns the leftmost bytes after removing the rightmost `length` bytes from a UInt8Array.
 *
 * This is used when asserting that the `UInt8Array` only contains zero values
 * except for the rightmost `length` bytes
 *
 * ```
 * // Remove 1 rigthmost byte and return the result
 * const left4Bytes = getLeftPadding([1,2,3,4,5], 1) // [1,2,3,4]
 *
 * // Remove 8 rightmost bytes and return the result
 * const left8Bytes = getLeftPadding([1,2,3,4,5], 8) // []
 * ```
 *
 * @param {Uint8Array} bytes
 * @param {number} length The number of rightmost bytes to remove from the array
 * @returns {Uint8Array}
 */
const getLeftPadding = (bytes: Uint8Array, length: number): Uint8Array =>
    bytes.subarray(0, Math.max(bytes.length - length, 0))

/**
 * Helper utility to assert that all elements of `bytes` are zero.
 *
 * @param {Uint8Array} bytes
 * @param {string} message A message to fail the assertion with if a non-zero byte is found
 */
const assertZeroBytes = (bytes: Uint8Array, message: string) => bytes.forEach((byte) => assert(byte === 0, message))
