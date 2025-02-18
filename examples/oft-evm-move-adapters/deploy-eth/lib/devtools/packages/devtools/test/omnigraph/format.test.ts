import { formatEid, formatOmniPoint, formatOmniVector } from '@/omnigraph/format'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import { ENDPOINT_IDS, pointArbitrary, vectorArbitrary } from '@layerzerolabs/test-devtools'
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
        it('should work without contract name innit', () => {
            fc.assert(
                fc.property(pointArbitrary, (point) => {
                    fc.pre(!point.contractName)

                    expect(formatOmniPoint(point)).toBe(`[${point.address} @ ${formatEid(point.eid)}]`)
                })
            )
        })

        it('should work with contract name innit', () => {
            fc.assert(
                fc.property(pointArbitrary, (point) => {
                    fc.pre(!!point.contractName)

                    expect(formatOmniPoint(point)).toBe(
                        `[${point.address} (${point.contractName}) @ ${formatEid(point.eid)}]`
                    )
                })
            )
        })
    })

    describe('formatOmniVector', () => {
        it('should just work innit', () => {
            fc.assert(
                fc.property(vectorArbitrary, (vector) => {
                    expect(formatOmniVector(vector)).toBe(
                        `${formatOmniPoint(vector.from)} → ${formatOmniPoint(vector.to)}`
                    )
                })
            )
        })
    })
})
