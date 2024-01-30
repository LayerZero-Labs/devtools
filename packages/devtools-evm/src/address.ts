import type { Address } from '@layerzerolabs/devtools'
import { AddressZero } from '@ethersproject/constants'

/**
 * Turns a nullish value (`null` or `undefined`) into a zero address
 *
 * @param {Address | null | undefined} address
 *
 * @returns {string}
 */
export const makeZeroAddress = (address?: Address | null | undefined): string => address ?? AddressZero
