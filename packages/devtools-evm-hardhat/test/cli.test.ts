import { signer } from '@/cli'
import { evmAddressArbitrary } from '@layerzerolabs/test-devtools'
import fc from 'fast-check'

describe('cli', () => {
    describe('signer', () => {
        it('should throw if invalid address is passed', () => {
            expect(() => signer.parse('signer', 'wat')).toThrow()
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
                    expect(signer.parse('signer', address)).toBe(address)
                })
            )
        })

        it('should return the index if non-negative index is passed', () => {
            fc.assert(
                fc.property(fc.integer({ min: 0 }), (index) => {
                    expect(signer.parse('signer', String(index))).toBe(index)
                })
            )
        })
    })
})
