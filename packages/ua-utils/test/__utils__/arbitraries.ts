import fc from 'fast-check'
import { addressArbitrary, endpointArbitrary } from '@layerzerolabs/test-utils'
import { OmniEdge, OmniNode, OmniPoint, OmniVector } from '@/omnigraph/types'

export const pointArbitrary: fc.Arbitrary<OmniPoint> = fc.record({
    eid: endpointArbitrary,
    address: addressArbitrary,
})

export const vectorArbitrary: fc.Arbitrary<OmniVector> = fc.record({
    from: pointArbitrary,
    to: pointArbitrary,
})

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
