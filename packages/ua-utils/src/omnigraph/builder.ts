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

    /**
     * Reconnect is the most complex method so far. It allows for
     * reconnection of all the nodes - removing, adding and updating edges.
     *
     * At this point the interface is quite simple, a reconnector function is
     * called for every node combination (including a loopback) and an optional
     * existing edge.
     *
     * Reconnector function returns either an edge (to keep or edit a connection) or `undefined`
     * (to delete a connection).
     *
     * The drawback of this approach is the fact that any edge can be returned,
     * not only an edge between the two nodes passed in. This flexibility might not be
     * desirable for most if not all the users. On the other hand of the flexibility spectrum
     * is the fact that this function can only return one edge.
     *
     * To address these issues we could make this function:
     *
     * - Return an array of edges - empty for disconnection, filled to add/keep/edit connections
     * - Return an edge config only. In this case we need to provide a specific value for disconnection
     *   (since `undefined` can be a valid config) - so we might need to turn the return value into
     *   a zero/one element tuple (`[TEdgeConfig] | []`) - btw nicely solvable with `Optional` types from functional languages
     *
     * @param r `Reconnector<TNodeConfig, TEdgeConfig>`
     * @returns `this`
     */
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
