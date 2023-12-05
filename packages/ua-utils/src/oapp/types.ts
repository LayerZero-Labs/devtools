import type { EndpointId } from '@layerzerolabs/lz-definitions'
import type { Address, OmniGraph, OmniTransaction } from '@layerzerolabs/utils'
import { OmniPointBasedFactory } from '@layerzerolabs/utils'

export interface IOApp {
    peers(eid: EndpointId): Promise<string | undefined>
    setPeer(eid: EndpointId, peer: Address): Promise<OmniTransaction>
}

export type OAppOmniGraph = OmniGraph<unknown, unknown>

export type OAppFactory = OmniPointBasedFactory<IOApp>
