import type { EndpointId } from '@layerzerolabs/lz-definitions'
import type { Factory, OmniAddress, WithOptionals } from '@/types'
import { OmniTransaction } from '..'

/**
 * OmniPoint identifies a point in omniverse, an omnichain universe.
 *
 * In layman terms this is a contract deployed on a particular network (represented by an endpoint).
 */
export type OmniPoint = WithEid<{
    address: OmniAddress
    contractName?: string | null
}>

/**
 * OmniVector identifies a vector in omniverse, an omnichain universe.
 *
 * In layman terms this is a directional connection between two contracts - two points of the omniverse
 */
export interface OmniVector {
    from: OmniPoint
    to: OmniPoint
}

/**
 * OmniError represents an arbitrary error that occurred on a particular point in omniverse.
 */
export interface OmniError<TError = unknown> {
    point: OmniPoint
    error: TError
}

/**
 * OmniNode represents a point in omniverse
 * with an additional piece of information attached
 */
export type OmniNode<TConfig = unknown> = WithOptionals<{
    point: OmniPoint
    config: TConfig
}>

/**
 * OmniEdge represents a connection between two points in omniverse
 * with an additional piece of information attached
 */
export type OmniEdge<TConfig = unknown> = WithOptionals<{
    vector: OmniVector
    config: TConfig
}>

/**
 * OmniGraph is a collection of nodes and edges of omniverse
 * that together represent an omnichain app a.k.a. OApp.
 *
 * For purposes of readability and to avoid overabstraction on the user end,
 * the names are set to be `contracts` rather than `nodes` and `connections` rather than `edges`
 */
export interface OmniGraph<TNodeConfig = unknown, TEdgeConfig = unknown> {
    contracts: OmniNode<TNodeConfig>[]
    connections: OmniEdge<TEdgeConfig>[]
}

/**
 * Helper type for inferring the type of element in the `contracts` array of an `OmniGraph`
 */
export type InferOmniNode<TOmniGraph extends OmniGraph> = TOmniGraph['contracts'][number]

/**
 * Helper type for inferring the type of element in the `connections` array of an `OmniGraph`
 */
export type InferOmniEdge<TOmniGraph extends OmniGraph> = TOmniGraph['connections'][number]

/**
 * Helper type that adds eid property to an underlying type
 */
export type WithEid<TValue> = TValue & { eid: EndpointId }

/**
 * Base interface for all SDKs
 */
export interface IOmniSDK {
    point: OmniPoint
}

/**
 * Base factory for all SDK factories
 */
export type OmniSDKFactory<TOmniSDK = IOmniSDK, TOmniPoint = OmniPoint> = Factory<[TOmniPoint], TOmniSDK>

/**
 * Helper type for configuration functions
 */
export type Configurator<TOmniGraph extends OmniGraph = OmniGraph, TOmniSDK = IOmniSDK> = (
    graph: TOmniGraph,
    createSdk: OmniSDKFactory<TOmniSDK>
) => Promise<OmniTransaction[]>
