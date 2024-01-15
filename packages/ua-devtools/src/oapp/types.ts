import type { EndpointId } from '@layerzerolabs/lz-definitions'
import { IEndpoint, Timeout, Uln302ExecutorConfig, Uln302UlnConfig } from '@layerzerolabs/protocol-devtools'
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
import { ExecutorOptionType, Options } from '@layerzerolabs/lz-v2-utilities'

export interface IOApp extends IOmniSDK {
    getEndpointSDK(): Promise<IEndpoint>
    getPeer(eid: EndpointId): Promise<Bytes32 | undefined>
    hasPeer(eid: EndpointId, address: Bytes32 | Address | null | undefined): Promise<boolean>
    setPeer(eid: EndpointId, peer: Bytes32 | Address | null | undefined): Promise<OmniTransaction>
    getEnforcedOptions(eid: EndpointId, msgType: number): Promise<string>
    setEnforcedOptions(enforcedOptions: EnforcedOptions[]): Promise<OmniTransaction>
    encodeEnforcedOptions(enforcedOptionConfig: OAppEnforcedOptionConfig): Options
}

export type EnforcedOptions = {
    eid: EndpointId
    msgType: number
    options: string
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
    enforcedOptions?: OAppEnforcedOptionConfig[]
}

// export interface SetConfigs {
//     fromEid: {}
// }
//
// export interface SetConfigs {
//     library:
// }

// export interface SetConfigs  {
//     [fromEid: string]: {
//         [library: string]: SetConfigParam[]; // Assuming setConfig is an array of strings
//     };
// };

interface BaseExecutorOption {
    msgType: ExecutorOptionType
}

interface EndcodedOption extends BaseExecutorOption {
    options: string
}

interface ExecutorLzReceiveOption extends BaseExecutorOption {
    msgType: ExecutorOptionType.LZ_RECEIVE
    gas: string | number
    value: string | number
}

interface ExecutorNativeDropOption extends BaseExecutorOption {
    msgType: ExecutorOptionType.NATIVE_DROP
    amount: string | number
    receiver: string
}

interface ExecutorComposeOption extends BaseExecutorOption {
    msgType: ExecutorOptionType.COMPOSE
    index: number
    gas: string | number
    value: string | number
}

interface ExecutorOrderedExecutionOption extends BaseExecutorOption {
    msgType: ExecutorOptionType.ORDERED
}

export type OAppEnforcedOptionConfig =
    | ExecutorLzReceiveOption
    | ExecutorNativeDropOption
    | ExecutorComposeOption
    | ExecutorOrderedExecutionOption
    | EndcodedOption

export interface OAppPeers {
    vector: OmniVector
    hasPeer: boolean
}

export type OAppOmniGraph = OmniGraph<unknown, OAppEdgeConfig | undefined>

export type OAppFactory<TOApp extends IOApp = IOApp, TOmniPoint = OmniPoint> = Factory<[TOmniPoint], TOApp>
