import type { PossiblyBigInt, PossiblyBytes } from '@/types'
import { hexZeroPad } from '@ethersproject/bytes'

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
 * @param {PossiblyBytes | PossiblyBigInt | null | undefined} address
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
