import type { OmniGraph, OmniPointBasedFactory } from '@/omnigraph/types'
import type { OmniTransaction } from '@/transactions/types'
import type { Address } from '@/types'
import type { EndpointId } from '@layerzerolabs/lz-definitions'

export interface IEndpoint {
    defaultSendLibrary(eid: EndpointId): Promise<Address | undefined>
    setDefaultSendLibrary(eid: EndpointId, lib: Address | null | undefined): Promise<OmniTransaction>
}

export interface EndpointEdgeConfig {
    defaultSendLibrary: Address
}

export type EndpointOmniGraph = OmniGraph<unknown, EndpointEdgeConfig>

export type EndpointFactory = OmniPointBasedFactory<IEndpoint>
