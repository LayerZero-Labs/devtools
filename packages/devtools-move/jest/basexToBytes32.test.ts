import { expect } from 'chai'
import { randomBytes } from 'crypto'
import { basexToBytes32 } from '../tasks/shared/basexToBytes32'

describe('basexToBytes32 - Address Format Detection and Conversion', () => {
    describe('Base16 format (0x prefix)', () => {
        it('should convert 0x0 to bytes32', () => {
            const address = '0x0'
            const bytes32 = basexToBytes32(address)
            expect(bytes32).to.equal('0x0000000000000000000000000000000000000000000000000000000000000000')
        })

        it('should convert 0x to bytes32', () => {
            const address = '0x'
            const bytes32 = basexToBytes32(address)
            expect(bytes32).to.equal('0x0000000000000000000000000000000000000000000000000000000000000000')
        })

        // Iterative test for random hex inputs from 1 to 32 bytes
        for (let bytes = 1; bytes <= 32; bytes++) {
            it(`should handle random ${bytes}-byte hex string`, () => {
                const randomHex = '0x' + randomBytes(bytes).toString('hex')
                const result = basexToBytes32(randomHex)

                // Should always return 32-byte padded result for EVM addresses
                expect(result).to.match(/^0x[a-f0-9]{64}$/)
                expect(result).to.have.length(66) // 0x + 64 hex chars
            })
        }
    })

    describe('Base58 format', () => {
        it('should convert solana address to bytes32', () => {
            const address = '76y77prsiCMvXMjuoZ5VRrhG5qYBrUMYTE5WgHqgjEn6'
            const bytes32 = basexToBytes32(address)
            // Note: This will need to be updated with the actual expected bytes32 value
            expect(bytes32).to.equal('0x5aad76da514b6e1dcf11037e904dac3d375f525c9fbafcb19507b78907d8c18b')
        })
    })

    describe('Error handling', () => {
        it('should throw error for unsupported format', () => {
            const address = 'invalid-address-format'
            expect(() => basexToBytes32(address)).to.throw(`Unsupported address format: ${address}`)
        })

        it('should handle empty string', () => {
            const address = ''
            expect(() => basexToBytes32(address)).to.throw('Empty address provided')
        })
    })
})
