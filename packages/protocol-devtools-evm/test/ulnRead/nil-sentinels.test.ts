import { MainnetV2EndpointId } from '@layerzerolabs/lz-definitions'
import { makeZeroAddress, Provider } from '@layerzerolabs/devtools-evm'
import { UlnRead } from '@/ulnRead'
import type { UlnReadUlnConfig, UlnReadUlnUserConfig } from '@layerzerolabs/protocol-devtools'
import { JsonRpcProvider } from '@ethersproject/providers'

const NIL_DVN_COUNT = 255
const DVN = '0x0000000000000000000000000000000000000001'

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

        it('maps an explicitly-empty optionalDVNs to NIL_DVN_COUNT (pin "no optional DVNs")', () => {
            expect(serialize({ requiredDVNs: [DVN], optionalDVNs: [] }).optionalDVNCount).toBe(NIL_DVN_COUNT)
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

        it('keeps an explicitly-empty requiredDVNs literal (count 0) for the DEFAULT config', () => {
            expect(serialize({ requiredDVNs: [] }, false).requiredDVNCount).toBe(0)
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
