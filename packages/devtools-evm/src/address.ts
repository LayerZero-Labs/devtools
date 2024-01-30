import type { OmniAddress } from '@layerzerolabs/devtools'
import { AddressZero } from '@ethersproject/constants'

/**
 * Turns a nullish value (`null` or `undefined`) into a zero address
 *
 * @param {OmniAddress | null | undefined} address
 *
 * @returns {string}
 */
export const makeZeroAddress = (address?: OmniAddress | null | undefined): string => address ?? AddressZero
