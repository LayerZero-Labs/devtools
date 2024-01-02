import type { Address, Bytes32 } from '@layerzerolabs/devtools'
import { hexZeroPad } from '@ethersproject/bytes'
import { AddressZero } from '@ethersproject/constants'

/**
 * Converts an address into Bytes32 by padding it with zeros.
 *
 * It will return zero bytes if passed `null`, `undefined` or an empty string.
 *
 * @param {Bytes32 | Address | null | undefined} address
 * @returns {string}
 */
export const makeBytes32 = (address?: Bytes32 | Address | null | undefined): Bytes32 => hexZeroPad(address || '0x0', 32)

/**
 * Compares two Bytes32-like values by value (i.e. ignores casing on strings
 * and string length)
 *
 * @param {Bytes32 | Address | null | undefined} a
 * @param {Bytes32 | Address | null | undefined} b
 * @returns {boolean}
 */
export const areBytes32Equal = (
    a: Bytes32 | Address | null | undefined,
    b: Bytes32 | Address | null | undefined
): boolean => BigInt(makeBytes32(a)) === BigInt(makeBytes32(b))

/**
 * Checks whether a value is a zero value.
 *
 * It will return true if passed `null`, `undefined`, empty bytes ('0x') or an empty string.
 *
 * It will throw an error if the value is not a valid numerical value.
 *
 * @param {Bytes32 | Address | null | undefined} value
 * @returns {boolean}
 */
export const isZero = (value: Bytes32 | Address | null | undefined): boolean =>
    value === '0x' || BigInt(value || 0) === BigInt(0)

/**
 * Turns a potentially zero address into undefined
 *
 * @param {Bytes32 | Address | null | undefined} address
 *
 * @returns {string | undefined}
 */
export const ignoreZero = (value?: Bytes32 | Address | null | undefined): string | undefined =>
    isZero(value) ? undefined : value ?? undefined

/**
 * Turns a nullish value (`null` or `undefined`) into a zero address
 *
 * @param {Address | null | undefined} address
 *
 * @returns {string}
 */
export const makeZeroAddress = (address?: Address | null | undefined): string => address ?? AddressZero
