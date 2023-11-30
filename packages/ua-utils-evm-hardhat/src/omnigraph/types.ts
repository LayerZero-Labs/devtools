import type { EndpointId } from '@layerzerolabs/lz-definitions'
import { OmniDeployment } from './coordinates'
import { OmniPoint } from '@layerzerolabs/ua-utils'

export type OmniPointHardhat = OmniPoint | OmniPointContractName

export interface OmniPointContractName {
    eid: EndpointId
    contractName: string
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

export type OmniDeploymentFactory = (point: OmniPointHardhat) => OmniDeployment | Promise<OmniDeployment>
