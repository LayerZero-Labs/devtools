import { signer, types } from '@/cli'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import { endpointArbitrary, evmAddressArbitrary } from '@layerzerolabs/test-devtools'
import fc from 'fast-check'

describe('cli', () => {
    describe('signer', () => {
        it('should return a named definition if a non-address non-integer is passed', () => {
            expect(signer.parse('signer', 'wat')).toEqual({ type: 'named', name: 'wat' })
        })

        it('should throw if negative index is passed', () => {
            fc.assert(
                fc.property(fc.integer({ max: -1 }), (index) => {
                    expect(() => signer.parse('signer', String(index))).toThrow()
                })
            )
        })

        it('should return the address if valid address is passed', () => {
            fc.assert(
                fc.property(evmAddressArbitrary, (address) => {
                    expect(signer.parse('signer', address)).toEqual({ type: 'address', address })
                })
            )
        })

        it('should return the index if non-negative index is passed', () => {
            fc.assert(
                fc.property(fc.integer({ min: 0 }), (index) => {
                    expect(signer.parse('signer', String(index))).toEqual({ type: 'index', index })
                })
            )
        })
    })

    describe('eid', () => {
        it('should parse all valid endpoint IDs', () => {
            fc.assert(
                fc.property(endpointArbitrary, (eid) => {
                    expect(types.eid.parse('eid', String(eid))).toEqual(eid)
                })
            )
        })

        it('should parse all valid endpoint labels', () => {
            fc.assert(
                fc.property(endpointArbitrary, (eid) => {
                    expect(types.eid.parse('eid', EndpointId[eid]!)).toEqual(eid)
                })
            )
        })

        it('should not parse invalid strings', () => {
            fc.assert(
                fc.property(fc.string(), (eid) => {
                    // We filter out the values that by any slim chance could be valid endpoint IDs
                    fc.pre(EndpointId[eid] == null)
                    fc.pre(EndpointId[parseInt(eid)] == null)

                    expect(() => types.eid.parse('eid', eid)).toThrow()
                })
            )
        })

        it('should not parse invalid numbers', () => {
            fc.assert(
                fc.property(fc.integer(), (eid) => {
                    fc.pre(EndpointId[eid] == null)

                    expect(() => types.eid.parse('eid', String(eid))).toThrow()
                })
            )
        })
    })
})
