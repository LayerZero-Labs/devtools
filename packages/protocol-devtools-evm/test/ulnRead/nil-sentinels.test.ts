import { MainnetV2EndpointId } from '@layerzerolabs/lz-definitions'
import { makeZeroAddress, Provider } from '@layerzerolabs/devtools-evm'
import { UlnRead } from '@/ulnRead'
import type { UlnReadUlnConfig, UlnReadUlnUserConfig } from '@layerzerolabs/protocol-devtools'
import { JsonRpcProvider } from '@ethersproject/providers'

const NIL_DVN_COUNT = 255
const DVN = '0x0000000000000000000000000000000000000001'
const OTHER_DVN = '0x0000000000000000000000000000000000000002'

describe('ulnRead/nil-sentinels', () => {
    let provider: Provider, ulnSdk: UlnRead

    beforeEach(async () => {
        provider = new JsonRpcProvider()
        ulnSdk = new UlnRead(provider, { eid: MainnetV2EndpointId.ETHEREUM_V2_MAINNET, address: makeZeroAddress() })
    })

    describe('serializeUlnConfig optionalDVNs', () => {
        const serialize = (config: UlnReadUlnUserConfig, useNilSentinels?: boolean) =>
            (ulnSdk as any).serializeUlnConfig(config, useNilSentinels)

        it('maps omitted optionalDVNs to count 0 (inherit the on-chain default)', () => {
            expect(serialize({ requiredDVNs: [DVN] }).optionalDVNCount).toBe(0)
        })

        it('maps an explicitly-empty optionalDVNs to NIL_DVN_COUNT and clamps the threshold to 0', () => {
            const serialized = serialize({ requiredDVNs: [DVN], optionalDVNs: [], optionalDVNThreshold: 1 })
            expect(serialized.optionalDVNCount).toBe(NIL_DVN_COUNT)
            expect(serialized.optionalDVNThreshold).toBe(0)
        })

        it('keeps an explicitly-empty optionalDVNs literal (count 0) for the DEFAULT config', () => {
            expect(serialize({ requiredDVNs: [DVN], optionalDVNs: [] }, false).optionalDVNCount).toBe(0)
        })
    })

    describe('serializeUlnConfig requiredDVNs', () => {
        const serialize = (config: UlnReadUlnUserConfig, useNilSentinels?: boolean) =>
            (ulnSdk as any).serializeUlnConfig(config, useNilSentinels)

        it('maps omitted requiredDVNs to count 0 (inherit the on-chain default)', () => {
            expect(serialize({}).requiredDVNCount).toBe(0)
        })

        it('maps an explicitly-empty requiredDVNs to NIL_DVN_COUNT (pin "no required DVNs")', () => {
            expect(serialize({ requiredDVNs: [] }).requiredDVNCount).toBe(NIL_DVN_COUNT)
        })

        it('derives the count from a concrete requiredDVNs array', () => {
            expect(serialize({ requiredDVNs: [DVN] }).requiredDVNCount).toBe(1)
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

        it('rejects a DEFAULT config whose optional threshold exceeds the optional DVN count', () => {
            expect(() => serialize({ requiredDVNs: [], optionalDVNs: [DVN], optionalDVNThreshold: 2 }, false)).toThrow(
                'cannot exceed the number of optional DVNs'
            )
        })
    })

    describe('hasAppUlnConfig idempotency', () => {
        const read = (over: Partial<UlnReadUlnConfig>): UlnReadUlnConfig => ({
            executor: makeZeroAddress(),
            optionalDVNThreshold: 0,
            requiredDVNs: [DVN],
            requiredDVNCount: 1,
            optionalDVNs: [],
            optionalDVNCount: 0,
            ...over,
        })

        let spy: jest.SpyInstance

        beforeEach(() => {
            spy = jest.spyOn(UlnRead.prototype, 'getAppUlnConfig')
        })

        afterEach(() => {
            spy.mockRestore()
        })

        const hasConfig = async (current: UlnReadUlnConfig, desired: UlnReadUlnUserConfig) => {
            spy.mockResolvedValue(current)
            return ulnSdk.hasAppUlnConfig(1, makeZeroAddress(), desired)
        }

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

        it('treats omitted requiredDVNs as matching a chain with requiredDVNCount 0', async () => {
            await expect(hasConfig(read({ requiredDVNs: [], requiredDVNCount: 0 }), {})).resolves.toBe(true)
        })

        it('treats an explicitly-empty requiredDVNs as matching a chain that stored NIL', async () => {
            await expect(
                hasConfig(read({ requiredDVNs: [], requiredDVNCount: NIL_DVN_COUNT }), { requiredDVNs: [] })
            ).resolves.toBe(true)
        })

        it('does NOT flip an inherited requiredDVNs (chain count 0) to pinned-none', async () => {
            // Regression: an explicitly-empty requiredDVNs (pin-none → NIL) must read as DIFFERENT
            // from a chain that inherits (count 0), so wiring emits the pin; but an OMITTED
            // requiredDVNs (inherit) must match count 0 and NOT emit a flip.
            await expect(
                hasConfig(read({ requiredDVNs: [], requiredDVNCount: 0 }), { requiredDVNs: [] })
            ).resolves.toBe(false)
            await expect(hasConfig(read({ requiredDVNs: [], requiredDVNCount: 0 }), {})).resolves.toBe(true)
        })
    })
})
