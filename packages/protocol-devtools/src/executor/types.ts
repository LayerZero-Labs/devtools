import type {
    Configurator,
    IOmniSDK,
    OmniGraph,
    OmniPoint,
    OmniSDKFactory,
    OmniTransaction,
} from '@layerzerolabs/devtools'
import type { EndpointId } from '@layerzerolabs/lz-definitions'

export interface IExecutor extends IOmniSDK {
    getDstConfig(eid: EndpointId): Promise<ExecutorDstConfig>
    setDstConfig(eid: EndpointId, value: ExecutorDstConfig): Promise<OmniTransaction>
}

export interface ExecutorDstConfigPre2_1_27 {
    baseGas: bigint
    lzComposeBaseGas?: never
    lzReceiveBaseGas?: never
    multiplierBps: bigint
    floorMarginUSD: bigint
    nativeCap: bigint
}

export interface ExecutorDstConfigPost2_1_27 {
    baseGas?: never
    lzComposeBaseGas: bigint
    lzReceiveBaseGas: bigint
    multiplierBps: bigint
    floorMarginUSD: bigint
    nativeCap: bigint
}

export type ExecutorDstConfig = ExecutorDstConfigPre2_1_27 | ExecutorDstConfigPost2_1_27

export interface ExecutorEdgeConfig {
    dstConfig: ExecutorDstConfig
}

export type ExecutorOmniGraph = OmniGraph<unknown, ExecutorEdgeConfig>

export type ExecutorFactory<TExecutor extends IExecutor = IExecutor, TOmniPoint = OmniPoint> = OmniSDKFactory<
    TExecutor,
    TOmniPoint
>

export type ExecutorConfigurator<TExecutor extends IExecutor = IExecutor> = Configurator<ExecutorOmniGraph, TExecutor>
