import { type OmniEdge, OmniGraphBuilder, type OmniNode } from '@layerzerolabs/ua-utils'
import type { OmniDeploymentFactory, OmniGraphHardhat } from './types'
import { omniDeploymentToPoint } from './coordinates'

export class OmniGraphBuilderHardhat<TNodeConfig, TEdgeConfig> extends OmniGraphBuilder<TNodeConfig, TEdgeConfig> {
    static async fromConfig<TNodeConfig, TEdgeConfig>(
        graph: OmniGraphHardhat<TNodeConfig, TEdgeConfig>,
        deploymentFactory: OmniDeploymentFactory
    ): Promise<OmniGraphBuilderHardhat<TNodeConfig, TEdgeConfig>> {
        const builder = new OmniGraphBuilderHardhat<TNodeConfig, TEdgeConfig>()

        const nodes: OmniNode<TNodeConfig>[] = await Promise.all(
            graph.contracts.map(async ({ contract, config }) => ({
                point: omniDeploymentToPoint(await deploymentFactory(contract)),
                config,
            }))
        )

        const edges: OmniEdge<TEdgeConfig>[] = await Promise.all(
            graph.connections.map(async ({ from, to, config }) => ({
                vector: {
                    from: omniDeploymentToPoint(await deploymentFactory(from)),
                    to: omniDeploymentToPoint(await deploymentFactory(to)),
                },
                config,
            }))
        )

        return builder.addNodes(...nodes).addEdges(...edges)
    }
}
