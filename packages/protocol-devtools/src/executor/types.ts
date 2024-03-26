import type { IOmniSDK, OmniGraph, OmniPoint, OmniSDKFactory, OmniTransaction } from '@layerzerolabs/devtools'
import type { EndpointId } from '@layerzerolabs/lz-definitions'

export interface IExecutor extends IOmniSDK {
    getDstConfig(eid: EndpointId): Promise<ExecutorDstConfig>
    setDstConfig(eid: EndpointId, value: ExecutorDstConfig): Promise<OmniTransaction>
}

export interface ExecutorDstConfig {
    baseGas: bigint
    multiplierBps: bigint
    floorMarginUSD: bigint
    nativeCap: bigint
}

export interface ExecutorEdgeConfig {
    dstConfig: ExecutorDstConfig
}

export type ExecutorOmniGraph = OmniGraph<unknown, ExecutorEdgeConfig>

export type ExecutorFactory<TExecutor extends IExecutor = IExecutor, TOmniPoint = OmniPoint> = OmniSDKFactory<
    TExecutor,
    TOmniPoint
>
