import fc from 'fast-check'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import { ENDPOINT_IDS } from './constants'
import { OmniNodeCoordinate, OmniEdgeCoordinates } from '@/omnigraph/types'

export const addressArbitrary = fc.string()

export const endpointArbitrary: fc.Arbitrary<EndpointId> = fc.constantFrom(...ENDPOINT_IDS)

export const coordinateArbitrary: fc.Arbitrary<OmniNodeCoordinate> = fc.record({
    eid: endpointArbitrary,
    address: addressArbitrary,
})

export const coordinatesArbitrary: fc.Arbitrary<OmniEdgeCoordinates> = fc.record({
    from: coordinateArbitrary,
    to: coordinateArbitrary,
})
