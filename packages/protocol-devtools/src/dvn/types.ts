import type { Factory, IOmniSDK, OmniGraph, OmniPoint, OmniTransaction } from '@layerzerolabs/devtools'
import type { EndpointId } from '@layerzerolabs/lz-definitions'

export interface IDVN extends IOmniSDK {
    getDstConfig(eid: EndpointId): Promise<DVNDstConfig>
    setDstConfig(eid: EndpointId, value: DVNDstConfig): Promise<OmniTransaction>
}

export interface DVNDstConfig {
    gas: bigint | string | number
    multiplierBps: bigint | string | number
    floorMarginUSD: bigint | string | number
}

export interface DVNEdgeConfig {
    dstConfig: DVNDstConfig
}

export type DVNOmniGraph = OmniGraph<unknown, DVNEdgeConfig>

export type DVNFactory<TDVN extends IDVN = IDVN, TOmniPoint = OmniPoint> = Factory<[TOmniPoint], TDVN>
