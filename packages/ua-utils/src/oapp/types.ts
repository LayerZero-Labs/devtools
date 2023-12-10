import type { EndpointId } from '@layerzerolabs/lz-definitions'
import type { IEndpoint } from '@layerzerolabs/protocol-utils'
import type { Address, OmniGraph, OmniTransaction } from '@layerzerolabs/utils'
import type { Bytes32 } from '@layerzerolabs/utils'
import type { OmniPointBasedFactory } from '@layerzerolabs/utils'

export interface IOApp {
    getEndpoint(): Promise<IEndpoint>
    getPeer(eid: EndpointId): Promise<Bytes32 | undefined>
    hasPeer(eid: EndpointId, address: Bytes32 | Address | null | undefined): Promise<boolean>
    setPeer(eid: EndpointId, peer: Bytes32 | Address | null | undefined): Promise<OmniTransaction>
}

export type OAppOmniGraph = OmniGraph<unknown, unknown>

export type OAppFactory<TOApp extends IOApp = IOApp> = OmniPointBasedFactory<TOApp>
