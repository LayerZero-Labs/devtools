import type { OmniAddress } from '@layerzerolabs/devtools'
import { getAddress, ZeroAddress } from 'ethers'

/**
 * Turns a nullish value (`null` or `undefined`) into a zero address
 *
 * @param {OmniAddress | null | undefined} address
 *
 * @returns {string}
 */
export const makeZeroAddress = (address?: OmniAddress | null | undefined): string => address ?? ZeroAddress

/**
 * Applies checksum to a given address, lower/uppercasing
 * necessary characters
 *
 * @param {OmniAddress} address
 * @returns {OmniAddress}
 */
export const addChecksum = (address: OmniAddress): OmniAddress => getAddress(address)
