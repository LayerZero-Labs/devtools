import assert from 'assert'
import { arePointsEqual, isVectorPossible, serializePoint, serializeVector } from './coordinates'
import type { OmniEdge, OmniGraph, OmniNode, OmniPoint, OmniVector } from './types'
import { formatOmniPoint, formatOmniVector } from './format'

export class OmniGraphBuilder<TNodeConfig = unknown, TEdgeConfig = unknown> {
    /**
     * Syntactic sugar utility for cloning graphs
     *
     * @param {OmniGraph<TNodeConfig, TEdgeConfig>} graph
     * @returns {OmniGraph<TNodeConfig, TEdgeConfig>}
     */
    static fromGraph<TNodeConfig = unknown, TEdgeConfig = unknown>(
        graph: OmniGraph<TNodeConfig, TEdgeConfig>
    ): OmniGraphBuilder<TNodeConfig, TEdgeConfig> {
        return new OmniGraphBuilder<TNodeConfig, TEdgeConfig>()
            .addNodes(...graph.contracts)
            .addEdges(...graph.connections)
    }

    #nodes: Map<string, OmniNode<TNodeConfig>> = new Map()

    #edges: Map<string, OmniEdge<TEdgeConfig>> = new Map()

    #assertCanAddEdge(edge: OmniEdge<TEdgeConfig>): void {
        const label = formatOmniVector(edge.vector)
        const from = formatOmniPoint(edge.vector.from)

        assert(isVectorPossible(edge.vector), `Cannot add edge ${label}: cannot connect the two endpoints`)
        assert(this.getNodeAt(edge.vector.from), `Cannot add edge ${label}: ${from} is not in the graph`)
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
            [...this.getEdgesFrom(point)].forEach((edge) => this.removeEdgeAt(edge.vector)),
            // Only then we remove the node itself
            this.#nodes.delete(serializePoint(point)),
            this
        )
    }

    removeEdgeAt(vector: OmniVector): this {
        return this.#edges.delete(serializeVector(vector)), this
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
