import type { Address } from '@layerzerolabs/utils'
import { AddressZero } from '@ethersproject/constants'

export const ignoreZero = (address: Address | null | undefined): string | undefined =>
    address === AddressZero ? undefined : address ?? undefined

export const makeZero = (address: Address | null | undefined): string => address ?? AddressZero
