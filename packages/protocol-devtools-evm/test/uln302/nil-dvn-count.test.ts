import { MainnetV2EndpointId } from '@layerzerolabs/lz-definitions'
import { makeZeroAddress, Provider } from '@layerzerolabs/devtools-evm'
import { Uln302 } from '@/uln302'
import type { Uln302UlnUserConfig } from '@layerzerolabs/protocol-devtools'
import { JsonRpcProvider } from '@ethersproject/providers'

// The NIL_DVN_COUNT constant value
const NIL_DVN_COUNT = 255

describe('uln302/nil-dvn-count', () => {
    let provider: Provider, ulnSdk: Uln302

    beforeEach(async () => {
        provider = new JsonRpcProvider()
        ulnSdk = new Uln302(provider, { eid: MainnetV2EndpointId.ETHEREUM_V2_MAINNET, address: makeZeroAddress() })
    })

    describe('serializeUlnConfig with empty DVN arrays', () => {
        it('should use NIL_DVN_COUNT (255) when requiredDVNs is empty', () => {
            const config: Uln302UlnUserConfig = {
                requiredDVNs: [],
                optionalDVNs: [],
                optionalDVNThreshold: 0,
                confirmations: BigInt(0),
            }

            // Use reflection to access the protected method
            const serialized = (ulnSdk as any).serializeUlnConfig(config)

            expect(serialized.requiredDVNCount).toBe(NIL_DVN_COUNT)
            expect(serialized.optionalDVNCount).toBe(0) // Optional DVNs should still use array length
        })

        it('should use actual array length when requiredDVNs is not empty', () => {
            const config: Uln302UlnUserConfig = {
                requiredDVNs: [makeZeroAddress(), makeZeroAddress()],
                optionalDVNs: [makeZeroAddress()],
                optionalDVNThreshold: 1,
                confirmations: BigInt(15),
            }

            // Use reflection to access the protected method
            const serialized = (ulnSdk as any).serializeUlnConfig(config)

            expect(serialized.requiredDVNCount).toBe(2) // Should be actual array length
            expect(serialized.optionalDVNCount).toBe(1)
        })

        it('should handle requiredDVNCount override correctly', () => {
            const config: Uln302UlnUserConfig = {
                requiredDVNs: [],
                requiredDVNCount: 100, // Explicit override
                optionalDVNs: [],
                optionalDVNThreshold: 0,
                confirmations: BigInt(0),
            }

            // Use reflection to access the protected method
            const serialized = (ulnSdk as any).serializeUlnConfig(config)

            expect(serialized.requiredDVNCount).toBe(100) // Should use the override
        })
    })
})
