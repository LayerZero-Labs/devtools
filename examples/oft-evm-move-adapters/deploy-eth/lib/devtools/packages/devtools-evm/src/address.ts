import type { OmniAddress } from '@layerzerolabs/devtools'
import { getAddress, isAddress } from '@ethersproject/address'
import { AddressZero } from '@ethersproject/constants'

/**
 * Turns a nullish value (`null` or `undefined`) into a zero address
 *
 * @param {OmniAddress | null | undefined} address
 *
 * @returns {string}
 */
export const makeZeroAddress = (address?: OmniAddress | null | undefined): string => address ?? AddressZero

/**
 * Applies checksum to a given address, lower/uppercasing
 * necessary characters
 *
 * @param {OmniAddress} address
 * @returns {OmniAddress}
 */
export const addChecksum = (address: OmniAddress): OmniAddress => getAddress(address)

/**
 * Re-export of `isAddress` from `@ethersporject/address`
 *
 * @param {OmniAddress} address
 * @returns {boolean}
 */
export const isEVMAddress = isAddress
