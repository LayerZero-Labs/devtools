import type { Factory, OmniAddress, OmniGraph, OmniPoint, OmniTransaction } from '@layerzerolabs/devtools'

export interface IOwnable {
    getOwner(): Promise<OmniAddress>
    hasOwner(address: OmniAddress): Promise<boolean>
    setOwner(address: OmniAddress): Promise<OmniTransaction>
}

export interface OwnableNodeConfig {
    owner?: OmniAddress
}

export type OwnableOmniGraph = OmniGraph<OwnableNodeConfig | undefined>

export type OwnableFactory<TOwnable extends IOwnable = IOwnable, TOmniPoint = OmniPoint> = Factory<
    [TOmniPoint],
    TOwnable
>
