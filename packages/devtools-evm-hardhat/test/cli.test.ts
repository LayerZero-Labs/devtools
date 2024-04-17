import { signer } from '@/cli'
import { evmAddressArbitrary } from '@layerzerolabs/test-devtools'
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
})
