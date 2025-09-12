import { MainnetV2EndpointId } from '@layerzerolabs/lz-definitions'
import { makeZeroAddress, Provider } from '@layerzerolabs/devtools-evm'
import { UlnRead } from '@/ulnRead'
import type { UlnReadUlnUserConfig } from '@layerzerolabs/protocol-devtools'
import { JsonRpcProvider } from '@ethersproject/providers'

// The NIL_DVN_COUNT constant value
const NIL_DVN_COUNT = 255

describe('ulnRead/nil-dvn-count', () => {
    let provider: Provider, ulnSdk: UlnRead

    beforeEach(async () => {
        provider = new JsonRpcProvider()
        ulnSdk = new UlnRead(provider, { eid: MainnetV2EndpointId.ETHEREUM_V2_MAINNET, address: makeZeroAddress() })
    })

    describe('serializeUlnConfig with empty DVN arrays', () => {
        it('should use NIL_DVN_COUNT (255) when requiredDVNs is empty', () => {
            const config: UlnReadUlnUserConfig = {
                requiredDVNs: [],
                optionalDVNs: [],
                optionalDVNThreshold: 0,
                executor: makeZeroAddress(),
            }

            // Use reflection to access the protected method
            const serialized = (ulnSdk as any).serializeUlnConfig(config)

            expect(serialized.requiredDVNCount).toBe(NIL_DVN_COUNT)
            expect(serialized.optionalDVNCount).toBe(0) // Optional DVNs should still use array length
        })

        it('should use actual array length when requiredDVNs is not empty', () => {
            const config: UlnReadUlnUserConfig = {
                requiredDVNs: [makeZeroAddress(), makeZeroAddress()],
                optionalDVNs: [makeZeroAddress()],
                optionalDVNThreshold: 1,
                executor: makeZeroAddress(),
            }

            // Use reflection to access the protected method
            const serialized = (ulnSdk as any).serializeUlnConfig(config)

            expect(serialized.requiredDVNCount).toBe(2) // Should be actual array length
            expect(serialized.optionalDVNCount).toBe(1)
        })
    })
})
