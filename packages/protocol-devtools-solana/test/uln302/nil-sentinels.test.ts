import { Connection } from '@solana/web3.js'
import { PublicKey } from '@solana/web3.js'
import { MainnetV2EndpointId } from '@layerzerolabs/lz-definitions'
import { Uln302 } from '@/uln302'
import type { Uln302UlnConfig, Uln302UlnUserConfig } from '@layerzerolabs/protocol-devtools'

const NIL_DVN_COUNT = 255
const NIL_CONFIRMATIONS = (BigInt(1) << BigInt(64)) - BigInt(1)
// A valid base58 public key to stand in for a DVN.
const DVN = '4VDjp6XQaxoZf5RGwiPU9NR1EXSZn2TP4ATMmiSzLfhb'

describe('uln302/nil-sentinels (solana)', () => {
    let ulnSdk: Uln302

    beforeEach(() => {
        const connection = new Connection('http://localhost:8899')
        ulnSdk = new Uln302(
            connection,
            { eid: MainnetV2EndpointId.SOLANA_V2_MAINNET, address: new PublicKey(DVN).toBase58() },
            new PublicKey(DVN)
        )
    })

    const serialize = (config: Uln302UlnUserConfig, useNilSentinels?: boolean) =>
        (ulnSdk as any).serializeUlnConfig(config, useNilSentinels)

    describe('serializeUlnConfig confirmations', () => {
        it('maps an omitted confirmations to 0 (inherit the on-chain default)', () => {
            expect(serialize({ requiredDVNs: [DVN] }).confirmations).toBe(BigInt(0))
        })

        it('maps an explicit zero confirmations to NIL_CONFIRMATIONS (pin literal zero)', () => {
            expect(serialize({ requiredDVNs: [DVN], confirmations: BigInt(0) }).confirmations).toBe(NIL_CONFIRMATIONS)
        })

        it('passes a non-zero confirmations through unchanged', () => {
            expect(serialize({ requiredDVNs: [DVN], confirmations: BigInt(15) }).confirmations).toBe(BigInt(15))
        })

        it('keeps an explicit zero literal when NIL sentinels are disabled', () => {
            expect(serialize({ requiredDVNs: [DVN], confirmations: BigInt(0) }, false).confirmations).toBe(BigInt(0))
        })
    })

    describe('serializeUlnConfig optionalDVNs', () => {
        it('maps omitted optionalDVNs to count 0 (inherit the on-chain default)', () => {
            expect(serialize({ requiredDVNs: [DVN] }).optionalDVNCount).toBe(0)
        })

        it('maps an explicitly-empty optionalDVNs to NIL_DVN_COUNT (pin "no optional DVNs")', () => {
            expect(serialize({ requiredDVNs: [DVN], optionalDVNs: [] }).optionalDVNCount).toBe(NIL_DVN_COUNT)
        })

        it('uses the array length for a non-empty optionalDVNs', () => {
            expect(
                serialize({ requiredDVNs: [DVN], optionalDVNs: [DVN], optionalDVNThreshold: 1 }).optionalDVNCount
            ).toBe(1)
        })
    })

    describe('normalizeUlnConfig (on-chain read passthrough)', () => {
        it('preserves a never-set read (zeros stay zeros, NOT remapped to NIL)', () => {
            const read: Uln302UlnConfig = {
                confirmations: BigInt(0),
                optionalDVNThreshold: 0,
                requiredDVNs: [],
                requiredDVNCount: 0,
                optionalDVNs: [],
                optionalDVNCount: 0,
            }
            const normalized = (ulnSdk as any).normalizeUlnConfig(read)
            expect(normalized.confirmations).toBe(BigInt(0))
            expect(normalized.requiredDVNCount).toBe(0)
            expect(normalized.optionalDVNCount).toBe(0)
        })
    })
})
