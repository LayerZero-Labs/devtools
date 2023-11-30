import { formatEid, formatOmniPoint } from '@/omnigraph/format'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import { ENDPOINT_IDS, addressArbitrary, endpointArbitrary } from '@layerzerolabs/test-utils'
import fc from 'fast-check'

describe('omnigraph/format', () => {
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
                fc.property(addressArbitrary, endpointArbitrary, (address, eid) => {
                    expect(formatOmniPoint({ eid, address })).toBe(`${address} @ ${formatEid(eid)}`)
                })
            )
        })
    })
})
