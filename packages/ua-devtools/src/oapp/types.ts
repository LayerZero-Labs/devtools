import type { EndpointId } from '@layerzerolabs/lz-definitions'
import type { IEndpoint, Timeout } from '@layerzerolabs/protocol-devtools'
import type {
    Address,
    Bytes32,
    Factory,
    IOmniSDK,
    OmniGraph,
    OmniPoint,
    OmniTransaction,
    OmniVector,
} from '@layerzerolabs/devtools'
import type { Uln302ExecutorConfig, Uln302UlnConfig } from '@layerzerolabs/protocol-devtools'

export interface IOApp extends IOmniSDK {
    getEndpointSDK(): Promise<IEndpoint>
    getPeer(eid: EndpointId): Promise<Bytes32 | undefined>
    hasPeer(eid: EndpointId, address: Bytes32 | Address | null | undefined): Promise<boolean>
    setPeer(eid: EndpointId, peer: Bytes32 | Address | null | undefined): Promise<OmniTransaction>
}

export interface OAppReceiveLibraryConfig {
    receiveLibrary: string
    gracePeriod: number
}

export interface OAppSendConfig {
    executorConfig: Uln302ExecutorConfig
    ulnConfig: Uln302UlnConfig
}

export interface OAppReceiveConfig {
    ulnConfig: Uln302UlnConfig
}

export interface OAppEdgeConfig {
    sendLibrary?: string
    receiveLibraryConfig?: OAppReceiveLibraryConfig
    receiveLibraryTimeoutConfig?: Timeout
    sendConfig?: OAppSendConfig
    receiveConfig?: OAppReceiveConfig
}

export interface HasPeer {
    vector: OmniVector
    hasPeer: boolean
}

const isNonNullable = <T>(value: T | null | undefined): value is T => value != null

export const flattenReadTransactions = (transations: (HasPeer | HasPeer[] | null | undefined)[]): HasPeer[] =>
    transations.filter(isNonNullable).flat()

export type OAppOmniGraph = OmniGraph<unknown, OAppEdgeConfig | undefined>

export type OAppFactory<TOApp extends IOApp = IOApp, TOmniPoint = OmniPoint> = Factory<[TOmniPoint], TOApp>
