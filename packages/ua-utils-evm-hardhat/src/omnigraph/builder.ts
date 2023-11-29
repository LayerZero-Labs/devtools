import { type OmniEdge, OmniGraphBuilder, type OmniNode } from '@layerzerolabs/ua-utils'
import type { OmniGraphHardhat } from './types'
import type { EndpointBasedFactory } from '@layerzerolabs/utils-evm'
import { type OmniDeployment, omniDeploymentToPoint } from '@layerzerolabs/utils-evm-hardhat'

export class OmniGraphBuilderHardhat<TNodeConfig, TEdgeConfig> extends OmniGraphBuilder<TNodeConfig, TEdgeConfig> {
    static async fromConfig<TNodeConfig, TEdgeConfig>(
        graph: OmniGraphHardhat<TNodeConfig, TEdgeConfig>,
        deploymentFactory: EndpointBasedFactory<OmniDeployment>
    ): Promise<OmniGraphBuilderHardhat<TNodeConfig, TEdgeConfig>> {
        const builder = new OmniGraphBuilderHardhat<TNodeConfig, TEdgeConfig>()

        const nodes: OmniNode<TNodeConfig>[] = await Promise.all(
            graph.contracts.map(async ({ eid, config }) => ({
                point: omniDeploymentToPoint(await deploymentFactory(eid)),
                config,
            }))
        )

        const edges: OmniEdge<TEdgeConfig>[] = await Promise.all(
            graph.connections.map(async ({ fromEid, toEid, config }) => ({
                vector: {
                    from: omniDeploymentToPoint(await deploymentFactory(fromEid)),
                    to: omniDeploymentToPoint(await deploymentFactory(toEid)),
                },
                config,
            }))
        )

        return builder.addNodes(...nodes).addEdges(...edges)
    }
}
