import type { OmniAddress } from '@layerzerolabs/devtools'

export interface SignerIndex {
    type: 'index'
    address?: never
    index: number
    name?: never
}

export interface SignerAddress {
    type: 'address'
    address: OmniAddress
    index?: never
    name?: never
}

export interface SignerName {
    type: 'named'
    address?: never
    index?: never
    name: string
}

export type SignerDefinition = SignerIndex | SignerAddress | SignerName
