import type { EndpointId } from '@layerzerolabs/lz-definitions'

export interface OmniNodeHardhat<TNodeConfig> {
    eid: EndpointId
    config: TNodeConfig
}

export interface OmniEdgeHardhat<TEdgeConfig> {
    fromEid: EndpointId
    toEid: EndpointId
    config: TEdgeConfig
}

export interface OmniGraphHardhat<TNodeConfig = unknown, TEdgeConfig = unknown> {
    contracts: OmniNodeHardhat<TNodeConfig>[]
    connections: OmniEdgeHardhat<TEdgeConfig>[]
}
