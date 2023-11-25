import assert from 'assert'
import { arePointsEqual, areSameEndpoint, serializePoint, serializeVector } from './coordinates'
import type { OmniEdge, OmniGraph, OmniNode, OmniPoint, OmniVector } from './types'

export class OmniGraphBuilder<TNodeConfig, TEdgeConfig> {
    #nodes: Map<string, OmniNode<TNodeConfig>> = new Map()

    #edges: Map<string, OmniEdge<TEdgeConfig>> = new Map()

    #assertCanAddEdge(edge: OmniEdge<TEdgeConfig>): void {
        const label = serializeVector(edge.vector)
        const from = serializePoint(edge.vector.from)
        const to = serializePoint(edge.vector.to)

        assert(this.getNodeAt(edge.vector.from), `Cannot add edge '${label}': '${from}' is not in the graph`)
        assert(this.getNodeAt(edge.vector.to), `Cannot add edge '${label}': '${to}' is not in the graph`)
    }

    //   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-
    //  / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \
    // `-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'
    //
    //                      The builder methods
    //
    //   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-
    //  / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \
    // `-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'

    addNodes(...nodes: OmniNode<TNodeConfig>[]): this {
        return nodes.forEach((node) => this.#nodes.set(serializePoint(node.point), node)), this
    }

    addEdges(...edges: OmniEdge<TEdgeConfig>[]): this {
        return (
            edges.forEach((edge) => {
                // First we make sure we can add this edge
                this.#assertCanAddEdge(edge)

                // Only then we add it
                this.#edges.set(serializeVector(edge.vector), edge)
            }),
            this
        )
    }

    removeNodeAt(point: OmniPoint): this {
        return (
            // First we remove all edges between this node and any other nodes
            [...this.getEdgesFrom(point), ...this.getEdgesTo(point)].forEach((edge) => this.removeEdgeAt(edge.vector)),
            // Only then we remove the node itself
            this.#nodes.delete(serializePoint(point)),
            this
        )
    }

    removeEdgeAt(vector: OmniVector): this {
        return this.#edges.delete(serializeVector(vector)), this
    }

    reconnect(r: Reconnector<TNodeConfig, TEdgeConfig>): this {
        const nodes = this.nodes

        return (
            nodes.forEach((fromNode) =>
                nodes.forEach((toNode) => {
                    const existingEdge = this.getEdgeAt({ from: fromNode.point, to: toNode.point })
                    const newEdge = r(fromNode, toNode, existingEdge)

                    if (existingEdge != null) this.removeEdgeAt(existingEdge.vector)
                    if (newEdge != null) this.addEdges(newEdge)
                })
            ),
            this
        )
    }

    //   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-
    //  / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \
    // `-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'
    //
    //                      The accessor methods
    //
    //   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-
    //  / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \
    // `-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'

    getNodeAt(point: OmniPoint): OmniNode<TNodeConfig> | undefined {
        return this.#nodes.get(serializePoint(point))
    }

    getEdgeAt(vector: OmniVector): OmniEdge<TEdgeConfig> | undefined {
        return this.#edges.get(serializeVector(vector))
    }

    getEdgesFrom(point: OmniPoint): OmniEdge<TEdgeConfig>[] {
        return this.edges.filter(({ vector: { from } }) => arePointsEqual(point, from))
    }

    getEdgesTo(point: OmniPoint): OmniEdge<TEdgeConfig>[] {
        return this.edges.filter(({ vector: { to } }) => arePointsEqual(point, to))
    }

    //   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-
    //  / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \
    // `-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'
    //
    //                     The config accessors
    //
    //   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-
    //  / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \
    // `-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'

    get nodes(): OmniNode<TNodeConfig>[] {
        return Array.from(this.#nodes.values())
    }

    get edges(): OmniEdge<TEdgeConfig>[] {
        return Array.from(this.#edges.values())
    }

    get graph(): OmniGraph<TNodeConfig, TEdgeConfig> {
        return {
            contracts: this.nodes,
            connections: this.edges,
        }
    }
}

export type Reconnector<TNodeConfig, TEdgeConfig> = (
    from: OmniNode<TNodeConfig>,
    to: OmniNode<TNodeConfig>,
    edge: OmniEdge<TEdgeConfig> | undefined
) => OmniEdge<TEdgeConfig> | undefined

export const ignoreLoopback =
    <TNodeConfig, TEdgeConfig>(r: Reconnector<TNodeConfig, TEdgeConfig>): Reconnector<TNodeConfig, TEdgeConfig> =>
    (from, to, edge) =>
        areSameEndpoint(from.point, to.point) ? undefined : r(from, to, edge)

export const loopbackOnly =
    <TNodeConfig, TEdgeConfig>(r: Reconnector<TNodeConfig, TEdgeConfig>): Reconnector<TNodeConfig, TEdgeConfig> =>
    (from, to, edge) =>
        areSameEndpoint(from.point, to.point) ? r(from, to, edge) : undefined
