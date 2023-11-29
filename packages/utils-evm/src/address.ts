import { AddressZero } from '@ethersproject/constants'

export const ignoreZero = (address: string | null | undefined): string | undefined =>
    address === AddressZero ? undefined : address ?? undefined

export const makeZero = (address: string | null | undefined): string => address ?? AddressZero
