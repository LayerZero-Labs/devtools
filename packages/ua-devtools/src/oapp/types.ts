import type { EndpointId } from '@layerzerolabs/lz-definitions'
import type { IEndpointV2, Timeout, Uln302ExecutorConfig, Uln302UlnUserConfig } from '@layerzerolabs/protocol-devtools'
import type {
    Bytes,
    Factory,
    IOmniSDK,
    OmniAddress,
    OmniGraph,
    OmniPoint,
    OmniTransaction,
    OmniVector,
    PossiblyBigInt,
} from '@layerzerolabs/devtools'
import { ExecutorOptionType } from '@layerzerolabs/lz-v2-utilities'
import type { IOwnable } from '@/ownable/types'

export interface IOApp extends IOmniSDK, IOwnable {
    getEndpointSDK(): Promise<IEndpointV2>
    getPeer(eid: EndpointId): Promise<OmniAddress | undefined>
    hasPeer(eid: EndpointId, address: OmniAddress | null | undefined): Promise<boolean>
    setPeer(eid: EndpointId, peer: OmniAddress | null | undefined): Promise<OmniTransaction>
    getEnforcedOptions(eid: EndpointId, msgType: number): Promise<Bytes>
    setEnforcedOptions(enforcedOptions: OAppEnforcedOptionParam[]): Promise<OmniTransaction>
}

export interface OAppReceiveLibraryConfig {
    receiveLibrary: string
    gracePeriod: bigint
}

export interface OAppSendConfig {
    executorConfig?: Uln302ExecutorConfig
    ulnConfig?: Uln302UlnUserConfig
}

export interface OAppReceiveConfig {
    ulnConfig?: Uln302UlnUserConfig
}

export interface OAppEdgeConfig {
    sendLibrary?: string
    receiveLibraryConfig?: OAppReceiveLibraryConfig
    receiveLibraryTimeoutConfig?: Timeout
    sendConfig?: OAppSendConfig
    receiveConfig?: OAppReceiveConfig
    enforcedOptions?: OAppEnforcedOption[]
}

export interface BaseExecutorOption {
    /**
     * The message type defined by OApp's to set enforced options for.
     * @type {number}
     */
    msgType: number
}

export interface EncodedOption extends BaseExecutorOption {
    options: string
}

export interface ExecutorLzReceiveOption extends BaseExecutorOption {
    optionType: ExecutorOptionType.LZ_RECEIVE
    gas: PossiblyBigInt
    value?: PossiblyBigInt
}

export interface ExecutorNativeDropOption extends BaseExecutorOption {
    optionType: ExecutorOptionType.NATIVE_DROP
    amount: PossiblyBigInt
    receiver: string
}

export interface ExecutorComposeOption extends BaseExecutorOption {
    optionType: ExecutorOptionType.COMPOSE
    index: number
    gas: PossiblyBigInt
    value?: PossiblyBigInt
}

export interface ExecutorOrderedExecutionOption extends BaseExecutorOption {
    optionType: ExecutorOptionType.ORDERED
}

export type OAppEnforcedOption =
    | ExecutorLzReceiveOption
    | ExecutorNativeDropOption
    | ExecutorComposeOption
    | ExecutorOrderedExecutionOption

export interface OAppEnforcedOptionParam {
    eid: EndpointId
    option: EncodedOption
}

export interface OAppPeers {
    vector: OmniVector
    hasPeer: boolean
}

export interface OAppEnforcedOptions {
    vector: OmniVector
    enforcedOptions: EncodedOption[]
}

export type OAppOmniGraph = OmniGraph<unknown, OAppEdgeConfig | undefined>

export type OAppFactory<TOApp extends IOApp = IOApp, TOmniPoint = OmniPoint> = Factory<[TOmniPoint], TOApp>
