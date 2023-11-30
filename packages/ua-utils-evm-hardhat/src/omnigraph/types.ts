import type { EndpointId } from '@layerzerolabs/lz-definitions'
import { OmniPoint } from '@layerzerolabs/ua-utils'
import { OmniContract } from '@layerzerolabs/utils-evm'

export interface OmniPointHardhat {
    eid: EndpointId
    contractName?: string
    address?: string
}

export interface OmniNodeHardhat<TNodeConfig> {
    contract: OmniPointHardhat | OmniPoint
    config: TNodeConfig
}

export interface OmniEdgeHardhat<TEdgeConfig> {
    from: OmniPointHardhat
    to: OmniPointHardhat
    config: TEdgeConfig
}

export interface OmniGraphHardhat<TNodeConfig = unknown, TEdgeConfig = unknown> {
    contracts: OmniNodeHardhat<TNodeConfig>[]
    connections: OmniEdgeHardhat<TEdgeConfig>[]
}

export type OmniContractFactory = (point: OmniPointHardhat) => OmniContract | Promise<OmniContract>
