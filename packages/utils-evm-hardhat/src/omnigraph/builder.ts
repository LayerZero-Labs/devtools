import type { OmniGraphHardhat } from './types'
import { OmniGraphBuilder } from '@layerzerolabs/utils'
import assert from 'assert'
import { OmniGraphHardhatTransformer, createOmniGraphHardhatTransformer } from './transformations'

/**
 * OmniGraphBuilderHardhat houses all hardhat-specific utilities for building OmniGraphs
 *
 * It is not an instantiable class - it only provides static utilities for working with OmniGraph
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
