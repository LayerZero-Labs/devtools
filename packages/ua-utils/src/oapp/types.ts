import type { EndpointId } from '@layerzerolabs/lz-definitions'
import type { IEndpoint, Timeout } from '@layerzerolabs/protocol-utils'
import type { Address, Factory, IOmniSDK, OmniGraph, OmniPoint, OmniTransaction } from '@layerzerolabs/utils'
import type { Bytes32 } from '@layerzerolabs/utils'
import type { Uln302ExecutorConfig, Uln302UlnConfig } from '@layerzerolabs/protocol-utils'

export interface IOApp extends IOmniSDK {
    getEndpointSDK(): Promise<IEndpoint>
    getPeer(eid: EndpointId): Promise<Bytes32 | undefined>
    hasPeer(eid: EndpointId, address: Bytes32 | Address | null | undefined): Promise<boolean>
    setPeer(eid: EndpointId, peer: Bytes32 | Address | null | undefined): Promise<OmniTransaction>
}

export interface ReceiveLibraryConfig {
    receiveLibrary: string
    gracePeriod: number
}
export interface OAppEdgeConfig {
    sendLibrary?: string
    receiveLibraryConfig?: ReceiveLibraryConfig
    receiveLibraryTimeoutConfig?: Timeout
    sendConfig?: {
        executorConfig: Uln302ExecutorConfig
        ulnConfig: Uln302UlnConfig
    }
    receiveConfig?: {
        ulnConfig: Uln302UlnConfig
    }
}

export type OAppOmniGraph = OmniGraph<unknown, OAppEdgeConfig | undefined>

export type OAppFactory<TOApp extends IOApp = IOApp, TOmniPoint = OmniPoint> = Factory<[TOmniPoint], TOApp>
