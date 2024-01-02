import type { EndpointId } from '@layerzerolabs/lz-definitions'
import type { Address, WithOptionals } from '@/types'

/**
 * OmniPoint identifies a point in omniverse, an omnichain universe.
 *
 * In layman terms this is a contract deployed on a particular network (represented by an endpoint).
 */
export type OmniPoint = WithEid<{
    address: Address
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
 * Helper type that adds eid property to an underlying type
 */
export type WithEid<TValue> = TValue & { eid: EndpointId }

/**
 * Base interface for all SDKs
 */
export interface IOmniSDK {
    point: OmniPoint
}
