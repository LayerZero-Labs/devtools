import type {
    Configurator,
    IOmniSDK,
    OmniGraph,
    OmniPoint,
    OmniSDKFactory,
    OmniTransaction,
} from '@layerzerolabs/devtools'
import type { EndpointId } from '@layerzerolabs/lz-definitions'

export interface IDVN extends IOmniSDK {
    getDstConfig(eid: EndpointId): Promise<DVNDstConfig>
    setDstConfig(eid: EndpointId, value: DVNDstConfig): Promise<OmniTransaction>
}

export interface DVNDstConfig {
    gas: bigint
    multiplierBps: bigint
    floorMarginUSD: bigint
}

export interface DVNEdgeConfig {
    dstConfig: DVNDstConfig
}

export type DVNOmniGraph = OmniGraph<unknown, DVNEdgeConfig>

export type DVNFactory<TDVN extends IDVN = IDVN, TOmniPoint = OmniPoint> = OmniSDKFactory<TDVN, TOmniPoint>

export type DVNConfigurator<TDVN extends IDVN = IDVN> = Configurator<DVNOmniGraph, TDVN>
