import fc from 'fast-check'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import { ENDPOINT_IDS } from './constants'
import { OmniPoint, OmniVector } from '@/omnigraph/types'

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
