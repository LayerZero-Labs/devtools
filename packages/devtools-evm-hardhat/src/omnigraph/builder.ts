import type { OmniGraphHardhat, OmniGraphHardhatTransformer } from './types'
import { OmniGraphBuilder } from '@layerzerolabs/devtools'
import assert from 'assert'
import { createOmniGraphHardhatTransformer } from './transformations'

/**
 * OmniGraphBuilderHardhat houses all hardhat-specific utilities for building OmniGraphs
 *
 * It is not an instantiable class - it only provides static utilities for working with OmniGraph
 *
 * @deprecated Transform the graph using the transformation function from `createOmniGraphHardhatTransformer()` directly:
 *
 * ```
 * const hardhatGraph: OmniGraphHardhat<TNodeConfig, TEdgeConfig>
 * const transformer = createOmniGraphHardhatTransformer()
 * const graph = await transformer(hardhatGraph)
 * ```
 */
export class OmniGraphBuilderHardhat {
    static async fromConfig<TNodeConfig, TEdgeConfig>(
        graph: OmniGraphHardhat<TNodeConfig, TEdgeConfig>,
        transform: OmniGraphHardhatTransformer<TNodeConfig, TEdgeConfig> = createOmniGraphHardhatTransformer()
    ): Promise<OmniGraphBuilder<TNodeConfig, TEdgeConfig>> {
        return OmniGraphBuilder.fromGraph(await transform(graph))
    }

    constructor() {
        assert(
            false,
            'OmniGraphBuilderHardhat cannot be instantiated - it only provides static utilities for working with OmniGraph'
        )
    }
}
