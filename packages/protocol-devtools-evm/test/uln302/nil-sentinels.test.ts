import { MainnetV2EndpointId } from '@layerzerolabs/lz-definitions'
import { makeZeroAddress, Provider } from '@layerzerolabs/devtools-evm'
import { Uln302 } from '@/uln302'
import { Uln302ConfigType } from '@layerzerolabs/protocol-devtools'
import type { Uln302UlnConfig, Uln302UlnUserConfig } from '@layerzerolabs/protocol-devtools'
import { JsonRpcProvider } from '@ethersproject/providers'

const NIL_DVN_COUNT = 255
const NIL_CONFIRMATIONS = (BigInt(1) << BigInt(64)) - BigInt(1)
const DVN = '0x0000000000000000000000000000000000000001'
const OTHER_DVN = '0x0000000000000000000000000000000000000002'

describe('uln302/nil-sentinels', () => {
    let provider: Provider, ulnSdk: Uln302

    beforeEach(async () => {
        provider = new JsonRpcProvider()
        ulnSdk = new Uln302(provider, { eid: MainnetV2EndpointId.ETHEREUM_V2_MAINNET, address: makeZeroAddress() })
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

        it('keeps an explicit zero literal for the DEFAULT config (no NIL mapping)', () => {
            expect(serialize({ requiredDVNs: [DVN], confirmations: BigInt(0) }, false).confirmations).toBe(BigInt(0))
        })

        it('rejects a DEFAULT config with no required DVNs and no optional threshold', () => {
            expect(() => serialize({ requiredDVNs: [] }, false)).toThrow('at least one DVN')
        })

        it('allows an optional-only DEFAULT config (no required DVNs, optional quorum)', () => {
            const serialized = serialize(
                { requiredDVNs: [], optionalDVNs: [DVN, OTHER_DVN], optionalDVNThreshold: 1 },
                false
            )
            expect(serialized.requiredDVNCount).toBe(0)
            expect(serialized.optionalDVNCount).toBe(2)
            expect(serialized.optionalDVNThreshold).toBe(1)
        })

        it('rejects a DEFAULT config whose only quorum is a threshold with no optional DVNs', () => {
            // a threshold without concrete optional DVNs is clamped to 0, so it is not a real quorum
            expect(() => serialize({ requiredDVNs: [], optionalDVNs: [], optionalDVNThreshold: 1 }, false)).toThrow(
                'at least one DVN'
            )
        })
    })

    describe('serializeUlnConfig optionalDVNs', () => {
        it('maps omitted optionalDVNs to count 0 (inherit the on-chain default)', () => {
            const serialized = serialize({ requiredDVNs: [DVN] })
            expect(serialized.optionalDVNCount).toBe(0)
            expect(serialized.optionalDVNThreshold).toBe(0)
        })

        it('maps an explicitly-empty optionalDVNs to NIL_DVN_COUNT and clamps the threshold to 0', () => {
            // threshold 1 with no concrete optional DVNs must clamp to 0 (the contract rejects a
            // non-zero threshold without optional DVNs)
            const serialized = serialize({ requiredDVNs: [DVN], optionalDVNs: [], optionalDVNThreshold: 1 })
            expect(serialized.optionalDVNCount).toBe(NIL_DVN_COUNT)
            expect(serialized.optionalDVNThreshold).toBe(0)
        })

        it('uses the array length for a non-empty optionalDVNs', () => {
            const serialized = serialize({ requiredDVNs: [DVN], optionalDVNs: [DVN], optionalDVNThreshold: 1 })
            expect(serialized.optionalDVNCount).toBe(1)
            expect(serialized.optionalDVNThreshold).toBe(1)
        })

        it('keeps an explicitly-empty optionalDVNs literal (count 0) for the DEFAULT config', () => {
            expect(serialize({ requiredDVNs: [DVN], optionalDVNs: [] }, false).optionalDVNCount).toBe(0)
        })
    })

    describe('normalizeUlnConfig (on-chain read passthrough)', () => {
        const normalize = (config: Uln302UlnConfig) => (ulnSdk as any).normalizeUlnConfig(config)

        it('preserves a never-set read (zeros stay zeros, NOT remapped to NIL)', () => {
            const normalized = normalize({
                confirmations: BigInt(0),
                optionalDVNThreshold: 0,
                requiredDVNs: [],
                requiredDVNCount: 0,
                optionalDVNs: [],
                optionalDVNCount: 0,
            })
            expect(normalized.confirmations).toBe(BigInt(0))
            expect(normalized.requiredDVNCount).toBe(0)
            expect(normalized.optionalDVNCount).toBe(0)
        })

        it('preserves stored NIL sentinels verbatim', () => {
            const normalized = normalize({
                confirmations: NIL_CONFIRMATIONS,
                optionalDVNThreshold: 0,
                requiredDVNs: [],
                requiredDVNCount: NIL_DVN_COUNT,
                optionalDVNs: [],
                optionalDVNCount: NIL_DVN_COUNT,
            })
            expect(normalized.confirmations).toBe(NIL_CONFIRMATIONS)
            expect(normalized.requiredDVNCount).toBe(NIL_DVN_COUNT)
            expect(normalized.optionalDVNCount).toBe(NIL_DVN_COUNT)
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
                MainnetV2EndpointId.ETHEREUM_V2_MAINNET,
                makeZeroAddress(),
                desired,
                Uln302ConfigType.Receive
            )
        }

        it('treats an omitted confirmations as matching a never-set chain value', async () => {
            await expect(hasConfig(read({}), { requiredDVNs: [DVN] })).resolves.toBe(true)
        })

        it('treats an explicit zero confirmations as DIFFERENT from a never-set chain value', async () => {
            // The fix: the user explicitly pins zero confirmations, so a chain that inherits
            // the default (stored 0) is NOT a match and must be (re)configured.
            await expect(hasConfig(read({}), { requiredDVNs: [DVN], confirmations: BigInt(0) })).resolves.toBe(false)
        })

        it('treats an explicit zero confirmations as matching a chain that stored the NIL sentinel', async () => {
            await expect(
                hasConfig(read({ confirmations: NIL_CONFIRMATIONS }), { requiredDVNs: [DVN], confirmations: BigInt(0) })
            ).resolves.toBe(true)
        })

        it('treats omitted optionalDVNs as matching a chain with optionalDVNCount 0', async () => {
            await expect(hasConfig(read({ optionalDVNCount: 0 }), { requiredDVNs: [DVN] })).resolves.toBe(true)
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
