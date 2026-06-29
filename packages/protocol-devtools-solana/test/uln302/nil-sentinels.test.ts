import { Connection } from '@solana/web3.js'
import { PublicKey } from '@solana/web3.js'
import { MainnetV2EndpointId } from '@layerzerolabs/lz-definitions'
import { Uln302 } from '@/uln302'
import { Uln302ConfigType } from '@layerzerolabs/protocol-devtools'
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

        it('maps an explicitly-empty optionalDVNs to NIL_DVN_COUNT and clamps the threshold to 0', () => {
            const serialized = serialize({ requiredDVNs: [DVN], optionalDVNs: [], optionalDVNThreshold: 1 })
            expect(serialized.optionalDVNCount).toBe(NIL_DVN_COUNT)
            expect(serialized.optionalDVNThreshold).toBe(0)
        })

        it('uses the array length for a non-empty optionalDVNs', () => {
            expect(
                serialize({ requiredDVNs: [DVN], optionalDVNs: [DVN], optionalDVNThreshold: 1 }).optionalDVNCount
            ).toBe(1)
        })
    })

    describe('serializeUlnConfig requiredDVNs', () => {
        it('maps omitted requiredDVNs to count 0 (inherit the on-chain default)', () => {
            expect(serialize({}).requiredDVNCount).toBe(0)
        })

        it('maps an explicitly-empty requiredDVNs to NIL_DVN_COUNT (pin "no required DVNs")', () => {
            expect(serialize({ requiredDVNs: [] }).requiredDVNCount).toBe(NIL_DVN_COUNT)
        })

        it('derives the count from a concrete requiredDVNs array', () => {
            expect(serialize({ requiredDVNs: [DVN] }).requiredDVNCount).toBe(1)
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

    describe('hasAppUlnConfig idempotency', () => {
        const read = (over: Partial<Uln302UlnConfig>): Uln302UlnConfig => ({
            confirmations: BigInt(0),
            optionalDVNThreshold: 0,
            requiredDVNs: [DVN],
            requiredDVNCount: 1,
            optionalDVNs: [],
            optionalDVNCount: 0,
            ...over,
        })

        let spy: jest.SpyInstance

        beforeEach(() => {
            spy = jest.spyOn(Uln302.prototype, 'getAppUlnConfig')
        })

        afterEach(() => {
            spy.mockRestore()
        })

        const hasConfig = async (current: Uln302UlnConfig, desired: Uln302UlnUserConfig) => {
            spy.mockResolvedValue(current)
            return ulnSdk.hasAppUlnConfig(
                MainnetV2EndpointId.SOLANA_V2_MAINNET,
                new PublicKey(DVN).toBase58(),
                desired,
                Uln302ConfigType.Send
            )
        }

        it('treats an omitted confirmations as matching a never-set chain value', async () => {
            await expect(hasConfig(read({}), { requiredDVNs: [DVN] })).resolves.toBe(true)
        })

        it('treats an explicit zero confirmations as DIFFERENT from a never-set chain value', async () => {
            await expect(hasConfig(read({}), { requiredDVNs: [DVN], confirmations: BigInt(0) })).resolves.toBe(false)
        })

        it('treats an explicit zero confirmations as matching a chain that stored the NIL sentinel', async () => {
            await expect(
                hasConfig(read({ confirmations: NIL_CONFIRMATIONS }), { requiredDVNs: [DVN], confirmations: BigInt(0) })
            ).resolves.toBe(true)
        })

        it('treats an explicitly-empty optionalDVNs as matching a chain that stored NIL', async () => {
            await expect(
                hasConfig(read({ optionalDVNCount: NIL_DVN_COUNT }), { requiredDVNs: [DVN], optionalDVNs: [] })
            ).resolves.toBe(true)
        })

        it('treats an explicitly-empty optionalDVNs as DIFFERENT from a chain with optionalDVNCount 0', async () => {
            await expect(
                hasConfig(read({ optionalDVNCount: 0 }), { requiredDVNs: [DVN], optionalDVNs: [] })
            ).resolves.toBe(false)
        })
    })
})
