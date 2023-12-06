import type { OmniEdge, OmniNode } from '@layerzerolabs/utils'
import type { OmniContractFactoryHardhat, OmniGraphHardhat } from './types'
import { OmniGraphBuilder } from '@layerzerolabs/utils'
import { omniContractToPoint } from '@layerzerolabs/utils-evm'
import assert from 'assert'

/**
 * OmniGraphBuilderHardhat houses all hardhat-specific utilities for building OmniGraphs
 *
 * It is not an instantiable class - it only provides static utilities for working with OmniGraph
 */
export class OmniGraphBuilderHardhat {
    static async fromConfig<TNodeConfig, TEdgeConfig>(
        graph: OmniGraphHardhat<TNodeConfig, TEdgeConfig>,
        contractFactory: OmniContractFactoryHardhat
    ): Promise<OmniGraphBuilder<TNodeConfig, TEdgeConfig>> {
        const builder = new OmniGraphBuilder<TNodeConfig, TEdgeConfig>()

        const nodes: OmniNode<TNodeConfig>[] = await Promise.all(
            graph.contracts.map(async ({ contract, config }) => ({
                point: omniContractToPoint(await contractFactory(contract)),
                config,
            }))
        )

        const edges: OmniEdge<TEdgeConfig>[] = await Promise.all(
            graph.connections.map(async ({ from, to, config }) => ({
                vector: {
                    from: omniContractToPoint(await contractFactory(from)),
                    to: omniContractToPoint(await contractFactory(to)),
                },
                config,
            }))
        )

        return builder.addNodes(...nodes).addEdges(...edges)
    }

    constructor() {
        assert(
            false,
            'OmniGraphBuilderHardhat cannot be instantiated - it only provides static utilities for working with OmniGraph'
        )
    }
}
