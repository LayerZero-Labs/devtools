import type { Factory, IOmniSDK, OmniGraph, OmniPoint, OmniTransaction } from '@layerzerolabs/devtools'
import type { EndpointId } from '@layerzerolabs/lz-definitions'

export interface IExecutor extends IOmniSDK {
    getDstConfig(eid: EndpointId): Promise<ExecutorDstConfig>
    setDstConfig(eid: EndpointId, value: ExecutorDstConfig): Promise<OmniTransaction>
}

export interface ExecutorDstConfig {
    baseGas: bigint | string | number
    multiplierBps: bigint | string | number
    floorMarginUSD: bigint | string | number
    nativeCap: bigint | string | number
}

export interface ExecutorEdgeConfig {
    dstConfig: ExecutorDstConfig
}

export type ExecutorOmniGraph = OmniGraph<unknown, ExecutorEdgeConfig>

export type ExecutorFactory<TExecutor extends IExecutor = IExecutor, TOmniPoint = OmniPoint> = Factory<
    [TOmniPoint],
    TExecutor
>
