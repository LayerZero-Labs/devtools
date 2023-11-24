import type { EndpointId } from '@layerzerolabs/lz-definitions'

export type Address = string

/**
 * OmniNodeCoordinate identifies a point in omniverse, an omnichain universe.
 *
 * In layman terms this is a contract deployed on a particular network (represented by an endpoint).
 */
export interface OmniNodeCoordinate {
    eid: EndpointId
    address: Address
}

/**
 * OmniEdgeCoordinates identify a line in omniverse, an omnichain universe.
 *
 * In layman terms this is a directional connection between two contracts
 */
export interface OmniEdgeCoordinates {
    from: OmniNodeCoordinate
    to: OmniNodeCoordinate
}

/**
 * OmniNode represents a point in omniverse
 * with an additional piece of information attached
 */
export interface OmniNode<TConfig = unknown> {
    coordinate: OmniNodeCoordinate
    config: TConfig
}

/**
 * OmniEdge represents a connection between two points in omniverse
 * with an additional piece of information attached
 */
export interface OmniEdge<TConfig = unknown> {
    coordinates: OmniEdgeCoordinates
    config: TConfig
}

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
