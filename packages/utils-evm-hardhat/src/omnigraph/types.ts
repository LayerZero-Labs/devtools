import type { OmniGraph, OmniPoint, WithEid, WithOptionals } from '@layerzerolabs/utils'
import type { OmniContract } from '@layerzerolabs/utils-evm'
import type { Deployment } from 'hardhat-deploy/dist/types'

/**
 * Omniverse wrapper around a hardhat-deploy deployment
 */
export type OmniDeployment = WithEid<{
    deployment: Deployment
}>

/**
 * Hardhat-specific variation of an `OmniPoint`
 *
 * Since in hardhat we have access to artifacts/deployments,
 * we can use contract name to find an address or ABIs of a particular contract
 * and transform `OmniPointHardhat` to `OmniPoint`
 */
export type OmniPointHardhat = WithEid<{
    contractName?: string | null
    address?: string | null
}>

/**
 * Hardhat-specific variation of `OmniNode` that uses `OmniPointHardhat`
 * instead of `OmniPoint` to specify the contract coordinates
 */
export type OmniNodeHardhat<TNodeConfig> = WithOptionals<{
    contract: OmniPointHardhat | OmniPoint
    config: TNodeConfig
}>

/**
 * Hardhat-specific variation of `OmniEdge` that uses `OmniPointHardhat`
 * instead of `OmniPoint` to specify the contracts' coordinates
 */
export type OmniEdgeHardhat<TEdgeConfig> = WithOptionals<{
    from: OmniPointHardhat | OmniPoint
    to: OmniPointHardhat | OmniPoint
    config: TEdgeConfig
}>

/**
 * Hardhat-specific variation of `OmniGraph` that uses `OmniNodeHardhat`
 * and `OmniEdgeHardhat` to specify the contracts and connections
 */
export interface OmniGraphHardhat<TNodeConfig = unknown, TEdgeConfig = unknown> {
    contracts: OmniNodeHardhat<TNodeConfig>[]
    connections: OmniEdgeHardhat<TEdgeConfig>[]
}

export type OmniContractFactoryHardhat = (point: OmniPointHardhat) => OmniContract | Promise<OmniContract>

export type OmniPointHardhatTransformer = (point: OmniPointHardhat | OmniPoint) => Promise<OmniPoint>

export type OmniGraphHardhatTransformer<TNodeConfig = unknown, TEdgeConfig = unknown> = (
    graph: OmniGraphHardhat<TNodeConfig, TEdgeConfig>
) => Promise<OmniGraph<TNodeConfig, TEdgeConfig>>
