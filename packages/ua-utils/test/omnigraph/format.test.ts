import { formatEid, formatOmniPoint, formatOmniVector } from '@/omnigraph/format'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import { ENDPOINT_IDS, addressArbitrary, endpointArbitrary } from '@layerzerolabs/test-utils'
import fc from 'fast-check'

describe('omnigraph/format', () => {
    const omniPointArbitrary = fc.record({
        eid: endpointArbitrary,
        address: addressArbitrary,
    })

    const omniVectorArbitrary = fc.record({
        from: omniPointArbitrary,
        to: omniPointArbitrary,
    })

    describe('formatEid', () => {
        it.each(ENDPOINT_IDS)(`should format %d correctly`, (eid) => {
            expect(formatEid(eid)).toMatchSnapshot()
        })

        it('should format invalid EndpointId correctly', () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            fc.property(fc.anything(), (eid: any) => {
                fc.pre(!(eid in EndpointId))

                expect(formatEid(eid)).toBe(`Unknown EndpointId (${eid})`)
            })
        })
    })

    describe('formatOmniPoint', () => {
        it('should just work innit', () => {
            fc.assert(
                fc.property(omniPointArbitrary, (point) => {
                    expect(formatOmniPoint(point)).toBe(`[${point.address} @ ${formatEid(point.eid)}]`)
                })
            )
        })
    })

    describe('formatOmniVector', () => {
        it('should just work innit', () => {
            fc.assert(
                fc.property(omniVectorArbitrary, (vector) => {
                    expect(formatOmniVector(vector)).toBe(
                        `${formatOmniPoint(vector.from)} → ${formatOmniPoint(vector.to)}`
                    )
                })
            )
        })
    })
})
