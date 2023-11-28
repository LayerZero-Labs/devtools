import { AddressZero } from '@ethersproject/constants'
import type { Address } from '@layerzerolabs/ua-utils'

export const ignoreZero = (address: Address | null | undefined): Address | undefined =>
    address === AddressZero ? undefined : address ?? undefined

export const makeZero = (address: Address | null | undefined): Address => address ?? AddressZero
