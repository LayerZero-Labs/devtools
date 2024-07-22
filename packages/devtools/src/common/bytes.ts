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
 * @param {PossiblyBytes | null | undefined} address
 * @returns {string}
 */
export const makeBytes32 = (address?: PossiblyBytes | null | undefined): PossiblyBytes =>
    hexZeroPad(address || '0x0', 32)

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
export const isZero = (value: PossiblyBytes | PossiblyBigInt | null | undefined): boolean =>
    value === '0x' || BigInt(value || 0) === BigInt(0)

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
export const normalizePeer = (address: OmniAddress, eid: EndpointId): Uint8Array => {
    const chainType = endpointIdToChainType(eid)

    switch (chainType) {
        case ChainType.SOLANA:
            return bs58.decode(address)

        case ChainType.APTOS:
        case ChainType.EVM:
            return toBytes32(Uint8Array.from(Buffer.from(address.replace(/^0x/, ''), 'hex')))

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
export const denormalizePeer = (bytes: Uint8Array, eid: EndpointId): OmniAddress => {
    const chainType = endpointIdToChainType(eid)

    switch (chainType) {
        case ChainType.SOLANA:
            return bs58.encode(toBytes32(bytes))

        case ChainType.APTOS:
            return `0x${Buffer.from(toBytes32(bytes)).toString('hex')}`

        case ChainType.EVM:
            return `0x${Buffer.from(toBytes20(bytes)).toString('hex')}`

        default:
            throw new Error(`denormalizePeer: Unsupported chain type ${chainType} ${formatEid(eid)}`)
    }
}

/**
 * Helper utility that left-pads a `Uint8Array` to be 32 bytes in length.
 *
 * @param {Uint8Array} bytes A `Uint8Array` with length less than or equal to 32.
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

const toBytes20 = (bytes: Uint8Array): Uint8Array => {
    assertZeroBytes(
        getLeftPadding(bytes, 20),
        `Cannot convert an array with more than 20 non-zero bytes into Bytes20. Got ${bytes} with length ${bytes.length}`
    )

    return new Uint8Array(bytes.slice(-20))
}

const getLeftPadding = (bytes: Uint8Array, length: number) => bytes.slice(0, Math.max(bytes.length - length, 0))

const assertZeroBytes = (bytes: Uint8Array, message: string) => bytes.forEach((byte) => assert(byte === 0, message))
