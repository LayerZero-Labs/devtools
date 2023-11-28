import fc from 'fast-check'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import { ENDPOINT_IDS } from './constants'
import { OmniEdge, OmniNode, OmniPoint, OmniVector } from '@/omnigraph/types'

export const addressArbitrary = fc.string()

export const endpointArbitrary: fc.Arbitrary<EndpointId> = fc.constantFrom(...ENDPOINT_IDS)

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
