import { type OmniEdge, OmniGraphBuilder, type OmniNode } from '@layerzerolabs/ua-utils'
import type { OmniContractFactory, OmniGraphHardhat } from './types'
import { omniContractToPoint } from '@layerzerolabs/utils-evm'

export class OmniGraphBuilderHardhat<TNodeConfig, TEdgeConfig> extends OmniGraphBuilder<TNodeConfig, TEdgeConfig> {
    static async fromConfig<TNodeConfig, TEdgeConfig>(
        graph: OmniGraphHardhat<TNodeConfig, TEdgeConfig>,
        contractFactory: OmniContractFactory
    ): Promise<OmniGraphBuilderHardhat<TNodeConfig, TEdgeConfig>> {
        const builder = new OmniGraphBuilderHardhat<TNodeConfig, TEdgeConfig>()

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
}
