import { BNBigIntSchema, PublicKeySchema } from '@/common/schema'
import { keypairArbitrary } from '@layerzerolabs/test-devtools-solana'
import BN from 'bn.js'
import fc from 'fast-check'

describe('common/schema', () => {
    describe('BNBigIntSchema', () => {
        const bnArbitrary: fc.Arbitrary<BN> = fc.bigInt().map((value) => new BN(value.toString()))

        it('should parse a BN instance', () => {
            fc.assert(
                fc.property(bnArbitrary, (bn) => {
                    expect(BNBigIntSchema.parse(bn)).toBe(BigInt(bn.toString()))
                })
            )
        })

        it('should not parse anything else', () => {
            fc.assert(
                fc.property(fc.anything(), (value) => {
                    expect(() => BNBigIntSchema.parse(value)).toThrow(/Input not instance of BN/)
                })
            )
        })
    })

    describe('PublicKeySchema', () => {
        it('should parse a PublicKey instance', () => {
            fc.assert(
                fc.property(
                    keypairArbitrary.map((keypair) => keypair.publicKey),
                    (publicKey) => {
                        expect(PublicKeySchema.parse(publicKey)).toBe(publicKey)
                    }
                )
            )
        })

        it('should not parse anything else', () => {
            fc.assert(
                fc.property(fc.anything(), (value) => {
                    expect(() => PublicKeySchema.parse(value)).toThrow(/Input not instance of PublicKey/)
                })
            )
        })
    })
})
