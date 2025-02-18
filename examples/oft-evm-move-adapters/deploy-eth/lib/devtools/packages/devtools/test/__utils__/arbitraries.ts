import fc from 'fast-check'
import { pointArbitrary, vectorArbitrary } from '@layerzerolabs/test-devtools'
import type { OmniEdge, OmniNode } from '@/omnigraph/types'

export const createNodeArbitrary = <TConfig = unknown>(
    configArbitrary: fc.Arbitrary<TConfig>
): fc.Arbitrary<OmniNode<TConfig>> =>
    fc.record({
        point: pointArbitrary,
        config: configArbitrary,
    })

export const createEdgeArbitrary = <TConfig = unknown>(
    configArbitrary: fc.Arbitrary<TConfig>
): fc.Arbitrary<OmniEdge<TConfig>> =>
    fc.record({
        vector: vectorArbitrary,
        config: configArbitrary,
    })
